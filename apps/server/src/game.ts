import { Socket, Server } from 'socket.io';
import { Player, Room, GameState, GamePhase, CATEGORIES, GAME_CONFIG, ChatMessage, GameMode, GameStatus, FRIEND_ERROR_CODES, FriendErrorCode } from '@imposter/shared';
import { v4 as uuidv4 } from 'uuid';
import { handleVote } from './engine';
import { applyPhaseTransition } from './engine/phase-reducer';
import { recordGameEnd } from './services/stats-service';
import { AuthenticatedSocket } from './middleware/auth';
import { checkEventRateLimit } from './middleware/rate-limit';
import {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    cancelFriendRequest,
    blockUser,
    getFriends,
    sendRoomInvite,
    getPendingInvites,
    respondToInvite,
    getPendingRequests,
    Friend
} from './services/friend-service';

// ============================================
// FRIEND ERROR HELPER
// ============================================

/**
 * Maps service error strings to standardized error codes
 */
function mapToFriendErrorCode(error?: string): FriendErrorCode {
    if (!error) return FRIEND_ERROR_CODES.DATABASE_ERROR;

    const lowerError = error.toLowerCase();

    if (lowerError.includes('not found')) return FRIEND_ERROR_CODES.REQUEST_NOT_FOUND;
    if (lowerError.includes('already')) return FRIEND_ERROR_CODES.ALREADY_FRIENDS;
    if (lowerError.includes('yourself')) return FRIEND_ERROR_CODES.SELF_REQUEST;
    if (lowerError.includes('not authorized') || lowerError.includes('not part')) return FRIEND_ERROR_CODES.NOT_AUTHORIZED;
    if (lowerError.includes('already handled')) return FRIEND_ERROR_CODES.REQUEST_ALREADY_HANDLED;
    if (lowerError.includes('invalid')) return FRIEND_ERROR_CODES.INVALID_USER_ID;
    if (lowerError.includes('max')) return FRIEND_ERROR_CODES.MAX_FRIENDS_REACHED;

    return FRIEND_ERROR_CODES.DATABASE_ERROR;
}

/**
 * Emit structured friend error with code and message
 */
function emitFriendError(socket: Socket, code: FriendErrorCode, message?: string) {
    socket.emit('friend_error', { code, message });
}

/**
 * Pure function: Oyları sayar ve en çok oy alan oyuncuyu döner.
 * Beraberlik varsa null döner (tekrar oylama gerekir).
 * NO side effects, NO IO - unit testlenebilir.
 */
export function calculateEliminated(votes: Record<string, string>): string | null {
    const voteCounts: Record<string, number> = {};
    Object.values(votes).forEach(votedId => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    // Oyları sırala (en yüksekten düşüğe)
    const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

    // Hiç oy yoksa
    if (sorted.length === 0) return null;

    // Tek aday varsa veya ilk iki farklıysa → kazanan belli
    if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) {
        return sorted[0][0];
    }

    // Beraberlik var → null dön (tekrar oylama)
    return null;
}

/**
 * Pure helper: Mode'a göre kelime seçimi yapar.
 * CLASSIC: Tek kelime (citizen'lar için)
 * BLIND: İki farklı kelime (citizen ve imposter için)
 * NOT: Engine'e girmez, game.ts içinde kalır.
 */
export function selectWordsForMode(
    mode: GameMode,
    wordList: string[],
    randomFn: () => number = Math.random
): { citizenWord: string; imposterWord?: string } {
    const citizenIndex = Math.floor(randomFn() * wordList.length);
    const citizenWord = wordList[citizenIndex];

    if (mode === 'BLIND') {
        // Farklı kelime seç (aynı kategoriden)
        if (wordList.length <= 1) {
            // Tek kelime varsa aynısını dön
            return { citizenWord, imposterWord: citizenWord };
        }

        let imposterIndex: number;
        do {
            imposterIndex = Math.floor(randomFn() * wordList.length);
        } while (imposterIndex === citizenIndex);

        return { citizenWord, imposterWord: wordList[imposterIndex] };
    }

    // CLASSIC: Sadece citizen kelimesi
    return { citizenWord };
}

/**
 * Mode'a göre imposter'ın ilk konuşmacı olma ağırlığı.
 * 1.0 = normal olasılık, 0.5 = yarı olasılık
 */
const IMPOSTER_FIRST_SPEAKER_WEIGHTS: Record<GameMode, number> = {
    CLASSIC: 0.5,
    BLIND: 0.5,
};

function getImposterFirstSpeakerWeight(mode: GameMode): number {
    return IMPOSTER_FIRST_SPEAKER_WEIGHTS[mode] ?? 1.0;
}

/**
 * Pure helper: Mode'a göre konuşma sırası belirler.
 * Her modda weighted selection uygulanır.
 * NOT: Engine'e girmez, game.ts içinde kalır.
 */
export function selectTurnOrder(
    playerIds: string[],
    imposterId: string,
    mode: GameMode,
    randomFn: () => number = Math.random
): string[] {
    const imposterWeight = getImposterFirstSpeakerWeight(mode);

    // Weighted selection for first speaker
    const weights = playerIds.map(id => ({
        id,
        weight: id === imposterId ? imposterWeight : 1.0
    }));

    const result: string[] = [];
    const remaining = [...weights];

    // İlk konuşmacı: Weighted selection
    const totalWeight = remaining.reduce((sum, w) => sum + w.weight, 0);
    let random = randomFn() * totalWeight;

    for (let i = 0; i < remaining.length; i++) {
        random -= remaining[i].weight;
        if (random <= 0) {
            result.push(remaining[i].id);
            remaining.splice(i, 1);
            break;
        }
    }

    // Kalan oyuncular: Normal shuffle
    const shuffledRest = remaining.map(w => w.id).sort(() => randomFn() - 0.5);
    result.push(...shuffledRest);

    return result;
}
export class GameLogic {
    private players: Map<string, Player> = new Map();
    private rooms: Map<string, Room> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId> (for multi-tab support)
    private io: Server | null = null;

    constructor() { }

    private getRoomList() {
        return Array.from(this.rooms.values()).map(r => {
            const owner = r.players.find(p => p.id === r.ownerId);
            return {
                id: r.id,
                name: r.name,
                playerCount: r.players.length,
                maxPlayers: r.maxPlayers,
                status: r.status,
                hasPassword: !!r.password,
                category: r.selectedCategory || null,
                ownerName: owner?.name || 'Unknown'
            };
        });
    }

    /**
     * Sanitizes room object for client broadcast.
     * Removes sensitive fields: password, userId, internal player data.
     * SECURITY: Call this before every room_update emit.
     */
    private sanitizeRoomForBroadcast(room: Room): Omit<Room, 'password'> & { players: Array<Omit<Player, 'userId'>> } {
        return {
            id: room.id,
            name: room.name,
            // password EXCLUDED - never send to clients
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                isReady: p.isReady,
                role: p.role,
                isEliminated: p.isEliminated,
                hint: p.hint,
                hasVoted: p.hasVoted
                // userId EXCLUDED - internal identifier
            })),
            maxPlayers: room.maxPlayers,
            ownerId: room.ownerId,
            status: room.status,
            gameState: room.gameState,
            selectedCategory: room.selectedCategory,
            gameMode: room.gameMode
        };
    }

    /**
     * Get live statistics for admin dashboard
     * Returns current connected players, active rooms, players in game
     */
    getLiveStats() {
        const totalPlayers = this.players.size;
        const activeRooms = Array.from(this.rooms.values()).filter(r => r.status !== 'ENDED').length;
        const playersInGame = Array.from(this.rooms.values())
            .filter(r => r.status === 'PLAYING')
            .reduce((acc, r) => acc + r.players.length, 0);
        const playersInLobby = totalPlayers - playersInGame;

        return {
            online_players: totalPlayers,
            active_rooms: activeRooms,
            players_in_game: playersInGame,
            players_in_lobby: playersInLobby,
            timestamp: new Date().toISOString()
        };
    }

    private clearRoomTimer(roomId: string) {
        const timer = this.timers.get(roomId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(roomId);
        }
    }

    private startPhaseTimer(roomId: string, duration: number, onTick: () => void, onComplete: () => void) {
        this.clearRoomTimer(roomId);

        let timeLeft = duration;

        const timer = setInterval(() => {
            timeLeft--;
            onTick();

            if (timeLeft <= 0) {
                this.clearRoomTimer(roomId);
                onComplete();
            }
        }, 1000);

        this.timers.set(roomId, timer);
    }

    private initializeGame(room: Room, language: string = 'en'): GameState {
        const gameMode = room.gameMode || 'CLASSIC';

        // Kategori seç (seçilmişse onu kullan, yoksa rastgele)
        let category;
        if (room.selectedCategory) {
            category = CATEGORIES.find(c => c.name === room.selectedCategory) || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        } else {
            category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        }

        // Kelime listesini al (bilingual ise dile göre seç)
        let wordList: string[];
        if (Array.isArray(category.words)) {
            wordList = category.words;
        } else {
            // Dile göre kelime listesi seç
            wordList = language === 'tr' ? category.words.tr : category.words.en;
        }

        // Mode'a göre kelime seçimi
        const { citizenWord, imposterWord } = selectWordsForMode(gameMode, wordList);

        // Rastgele imposter seç
        const imposterIndex = Math.floor(Math.random() * room.players.length);
        const imposterId = room.players[imposterIndex].id;

        // Sıra karıştır - mode'a göre weighted veya random
        const playerIds = room.players.map(p => p.id);
        const turnOrder = selectTurnOrder(playerIds, imposterId, gameMode);

        // Oyuncu rollerini ayarla
        room.players.forEach(p => {
            p.role = p.id === imposterId ? 'IMPOSTER' : 'CITIZEN';
            p.isEliminated = false;
            p.hint = undefined;
            p.hasVoted = false;
        });

        // Generate unique game ID for stats idempotency
        const gameId = uuidv4();

        return {
            gameId: gameId,  // For stats idempotency
            phase: 'ROLE_REVEAL',
            category: category.name,
            word: citizenWord,
            imposterId: imposterId,
            currentTurnIndex: 0,
            turnOrder: turnOrder,
            turnTimeLeft: GAME_CONFIG.HINT_TURN_TIME,
            phaseTimeLeft: GAME_CONFIG.ROLE_REVEAL_TIME,
            roundNumber: 1,
            votes: {},
            hints: {},
            gameMode: gameMode,
            imposterWord: imposterWord
        };
    }

    private getPlayerGameData(player: Player, gameState: GameState): any {
        const isActualImposter = player.id === gameState.imposterId;
        const gameMode = gameState.gameMode || 'CLASSIC';

        // BLIND modda imposter kendini bilmez
        // CLASSIC modda imposter kendini bilir
        const isImposter = gameMode === 'BLIND' ? false : isActualImposter;

        // Kelime seçimi mode'a göre
        let word: string | null;
        if (gameMode === 'BLIND') {
            // BLIND: Herkes kelime alır (imposter farklı kelime)
            word = isActualImposter ? gameState.imposterWord! : gameState.word;
        } else {
            // CLASSIC: Imposter kelimeyi göremez
            word = isActualImposter ? null : gameState.word;
        }

        return {
            phase: gameState.phase,
            category: gameState.category,
            word: word,
            isImposter: isImposter,
            currentTurnIndex: gameState.currentTurnIndex,
            turnOrder: gameState.turnOrder,
            turnTimeLeft: gameState.turnTimeLeft,
            phaseTimeLeft: gameState.phaseTimeLeft,
            roundNumber: gameState.roundNumber,
            hints: gameState.hints,
            eliminatedPlayerId: gameState.eliminatedPlayerId,
            winner: gameState.winner,
            votes: gameState.phase === 'VOTE_RESULT' || gameState.phase === 'GAME_OVER' ? gameState.votes : {},
            imposterId: gameState.phase === 'GAME_OVER' ? gameState.imposterId : null,
            gameMode: gameMode
        };
    }

    private broadcastGameState(room: Room) {
        if (!this.io || !room.gameState) return;

        // Her oyuncuya kendi özel verisini gönder
        room.players.forEach(player => {
            const socket = this.io?.sockets.sockets.get(player.id);
            if (socket) {
                socket.emit('game_state', this.getPlayerGameData(player, room.gameState!));
            }
        });
    }

    private transitionToPhase(room: Room, phase: GamePhase) {
        if (!room.gameState) return;

        // 1. Pure Logic: Apply phase transition via reducer
        const result = applyPhaseTransition(room.gameState, phase);

        if (!result.ok) {
            console.warn(`[Game] Invalid phase transition: ${room.gameState.phase} → ${phase}`);
            return;
        }

        room.gameState = result.state;

        // 2. Side Effects: Player mutations (imperative shell)
        if (phase === 'VOTING') {
            room.players.forEach(p => p.hasVoted = false);
        }

        // 3. Side Effects: Timer scheduling (read duration from state)
        switch (phase) {
            case 'ROLE_REVEAL':
                this.startPhaseTimer(room.id, room.gameState.phaseTimeLeft,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.transitionToPhase(room, 'HINT_ROUND')
                );
                break;

            case 'HINT_ROUND':
                this.startHintTurn(room);
                break;

            case 'DISCUSSION':
                this.startPhaseTimer(room.id, room.gameState.phaseTimeLeft,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.transitionToPhase(room, 'VOTING')
                );
                break;

            case 'VOTING':
                this.startPhaseTimer(room.id, room.gameState.phaseTimeLeft,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.resolveVotes(room)
                );
                break;

            case 'VOTE_RESULT':
                this.startPhaseTimer(room.id, room.gameState.phaseTimeLeft,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.checkGameEnd(room)
                );
                break;

            case 'GAME_OVER':
                this.clearRoomTimer(room.id);
                this.recordGameStats(room);
                break;
        }

        // 4. Broadcast updated state
        this.broadcastGameState(room);
        this.io?.to(room.id).emit('room_update', this.sanitizeRoomForBroadcast(room));
    }

    private startHintTurn(room: Room) {
        if (!room.gameState) return;

        // Elenmemiş oyuncuları bul
        const activePlayers = room.gameState.turnOrder.filter(id => {
            const player = room.players.find(p => p.id === id);
            return player && !player.isEliminated;
        });

        // Bu roundda herkes ipucu verdiyse (roundNumber'a göre kontrol)
        const expectedHintCount = room.gameState!.roundNumber;
        const allHintsGiven = activePlayers.every(id => (room.gameState!.hints[id]?.length || 0) >= expectedHintCount);

        if (allHintsGiven) {
            // Son hint'i göstermek için 3 saniye bekle
            room.gameState.phaseTimeLeft = 3;
            this.broadcastGameState(room);

            this.startPhaseTimer(room.id, 3,
                () => {
                    room.gameState!.phaseTimeLeft--;
                    this.broadcastGameState(room);
                },
                () => {
                    const currentHintRound = room.gameState!.roundNumber;
                    if (currentHintRound < GAME_CONFIG.HINT_ROUNDS) {
                        room.gameState!.roundNumber++;
                        room.gameState!.currentTurnIndex = 0;
                        // Hint'leri silme - tüm roundlar boyunca tut
                        room.players.forEach(p => p.hint = undefined);
                        this.startHintTurn(room);
                    } else {
                        // Tüm turlar bitti, tartışmaya geç
                        this.transitionToPhase(room, 'DISCUSSION');
                    }
                }
            );
            return;
        }

        // Sıradaki ipucu vermemiş oyuncuyu bul (bu round için)
        const requiredHints = room.gameState.roundNumber;
        let currentIndex = room.gameState.currentTurnIndex;
        while (currentIndex < activePlayers.length) {
            const playerId = activePlayers[currentIndex];
            if ((room.gameState.hints[playerId]?.length || 0) < requiredHints) {
                break;
            }
            currentIndex++;
        }

        if (currentIndex >= activePlayers.length) {
            // All active players have given hints for this round
            // Increment round or transition to discussion
            const currentHintRound = room.gameState.roundNumber;
            if (currentHintRound < GAME_CONFIG.HINT_ROUNDS) {
                room.gameState.roundNumber++;
                room.gameState.currentTurnIndex = 0;
                room.players.forEach(p => p.hint = undefined);
                this.startHintTurn(room);
            } else {
                // All hint rounds complete, go to discussion
                this.transitionToPhase(room, 'DISCUSSION');
            }
            return;
        }

        room.gameState.currentTurnIndex = currentIndex;
        room.gameState.turnTimeLeft = GAME_CONFIG.HINT_TURN_TIME;

        this.startPhaseTimer(room.id, GAME_CONFIG.HINT_TURN_TIME,
            () => {
                room.gameState!.turnTimeLeft--;
                this.broadcastGameState(room);
            },
            () => {
                // Süre bitti, boş ipucu kaydet ve sıradakine geç
                const currentPlayerId = activePlayers[room.gameState!.currentTurnIndex];
                if (!room.gameState!.hints[currentPlayerId]) {
                    room.gameState!.hints[currentPlayerId] = [];
                }
                if (room.gameState!.hints[currentPlayerId].length < room.gameState!.roundNumber) {
                    room.gameState!.hints[currentPlayerId].push('(Timed out)');
                }
                room.gameState!.currentTurnIndex++;
                this.startHintTurn(room);
            }
        );

        this.broadcastGameState(room);
    }

    private resolveVotes(room: Room) {
        if (!room.gameState) return;

        // Pure function ile elenen oyuncuyu hesapla
        const eliminatedId = calculateEliminated(room.gameState.votes);

        // Beraberlik var → VOTE_RESULT'a geç (eliminatedId = undefined)
        // Phase contract: VOTING → VOTE_RESULT her zaman
        if (eliminatedId === null) {
            room.gameState.eliminatedPlayerId = undefined;
            this.transitionToPhase(room, 'VOTE_RESULT');
            return;
        }

        // Elenen oyuncuyu işaretle
        room.gameState.eliminatedPlayerId = eliminatedId;
        const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
        if (eliminatedPlayer) {
            eliminatedPlayer.isEliminated = true;
        }

        this.transitionToPhase(room, 'VOTE_RESULT');
    }

    private checkGameEnd(room: Room) {
        if (!room.gameState) return;

        const imposter = room.players.find(p => p.id === room.gameState!.imposterId);
        const activeCitizens = room.players.filter(p => p.role === 'CITIZEN' && !p.isEliminated);

        // Imposter elendiyse vatandaşlar kazanır
        if (imposter?.isEliminated) {
            room.gameState.winner = 'CITIZENS';
            room.status = 'ENDED';
            this.transitionToPhase(room, 'GAME_OVER');
            return;
        }

        // Sadece 1 vatandaş kaldıysa imposter kazanır
        if (activeCitizens.length <= 1) {
            room.gameState.winner = 'IMPOSTER';
            room.status = 'ENDED';
            this.transitionToPhase(room, 'GAME_OVER');
            return;
        }

        // Oyun devam ediyor, yeni round
        room.gameState.roundNumber++;
        room.gameState.hints = {};
        room.gameState.votes = {};
        room.gameState.eliminatedPlayerId = undefined;
        room.players.forEach(p => {
            p.hint = undefined;
            p.hasVoted = false;
        });

        this.transitionToPhase(room, 'HINT_ROUND');
    }

    /**
     * Records game statistics after game ends.
     * Async, non-blocking - stats failure doesn't affect game.
     */
    private recordGameStats(room: Room): void {
        if (!room.gameState || !room.gameState.winner) return;

        const players = room.players.map(p => ({
            odaPlayerId: p.id,
            odaUserID: p.userId,
            role: p.role || 'CITIZEN' as 'IMPOSTER' | 'CITIZEN',
            isEliminated: p.isEliminated || false,
        }));

        // Fire and forget - don't await
        recordGameEnd({
            gameId: room.gameState.gameId || uuidv4(), // Use gameId for idempotency
            winner: room.gameState.winner,
            players,
            category: room.gameState.category,
            roomId: room.id,
        }).catch(err => {
            console.error('[GameLogic] Stats recording failed:', err);
        });
    }

    // Helper to notify friends of a user
    private async notifyFriends(userId: string, event: string, data: any) {
        if (!this.io) return;

        try {
            // Fix: Use imported service function and map to IDs
            const friends = await getFriends(userId);
            const friendIds = friends.map(f => f.id);

            for (const friendId of friendIds) {
                const friendSockets = this.userSockets.get(friendId);
                if (friendSockets) {
                    friendSockets.forEach(socketId => {
                        this.io!.to(socketId).emit(event, data);
                    });
                }
            }
        } catch (error) {
            console.error(`[GameService] Error notifying friends for user ${userId}:`, error);
        }
    }

    private leaveRoom(socketId: string) {
        this.rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socketId);
            if (playerIndex === -1) return;

            const wasOwner = room.ownerId === socketId;
            room.players.splice(playerIndex, 1);

            if (room.players.length === 0) {
                this.clearRoomTimer(roomId);
                this.rooms.delete(roomId);
                return;
            }

            // Transfer ownership if needed
            if (wasOwner) {
                room.ownerId = room.players[0].id;
            }

            // CRITICAL: Clean gameState to prevent ghost socket exploits
            if (room.gameState && room.status === 'PLAYING') {
                const gs = room.gameState;

                // Remove from turnOrder
                gs.turnOrder = gs.turnOrder.filter(id => id !== socketId);

                // Remove their votes and votes targeting them
                delete gs.votes[socketId];
                Object.keys(gs.votes).forEach(voterId => {
                    if (gs.votes[voterId] === socketId) {
                        delete gs.votes[voterId];
                    }
                });

                // Remove their hints
                delete gs.hints[socketId];

                // If they were the imposter and game is active, citizens win immediately
                if (gs.imposterId === socketId && gs.phase !== 'GAME_OVER') {
                    gs.winner = 'CITIZENS';
                    gs.phase = 'GAME_OVER';
                    room.status = 'ENDED';
                    this.clearRoomTimer(roomId);
                    this.recordGameStats(room);
                    console.log(`[Game] Imposter disconnected in room ${roomId}, citizens win`);
                }

                // Adjust currentTurnIndex if needed
                if (gs.turnOrder.length > 0 && gs.currentTurnIndex >= gs.turnOrder.length) {
                    gs.currentTurnIndex = gs.currentTurnIndex % gs.turnOrder.length;
                }
            }

            // If players drop below min during game, reset to lobby
            if (room.status === 'PLAYING' && room.players.length < GAME_CONFIG.MIN_PLAYERS) {
                room.status = 'LOBBY';
                room.gameState = undefined;
                this.clearRoomTimer(roomId);
            }

            this.io?.to(roomId).emit('room_update', this.sanitizeRoomForBroadcast(room));
            this.io?.emit('room_list', this.getRoomList());
        });
    }

    handleConnection(socket: AuthenticatedSocket, io: Server) {
        this.io = io;
        // userId is now verified and immutable from auth middleware
        console.log('Client connected:', socket.id, socket.userId ? `(user: ${socket.userId})` : '(guest)');

        // Join game (Connect)
        socket.on('join_game', async ({ name, avatar }: { name: string; avatar: string }) => {
            // Rate limit check
            if (!checkEventRateLimit('join_game', socket.id, socket.userId)) {
                socket.emit('error', 'RATE_LIMITED');
                return;
            }

            // SECURITY: userId comes from verified middleware, not client
            const userId = socket.userId;

            const player: Player = {
                id: socket.id,
                name,
                avatar,
                isReady: false,
                userId: userId || undefined // Verified from JWT, immutable
            };
            this.players.set(socket.id, player);

            // Handle authenticated user presence
            if (userId) {
                if (!this.userSockets.has(userId)) {
                    this.userSockets.set(userId, new Set());
                }
                const userSocketSet = this.userSockets.get(userId)!;

                // If this is the FIRST socket key for this user, they just came online
                if (userSocketSet.size === 0) {
                    // Notify friends: I am online
                    this.notifyFriends(userId, 'friend_online', { userId });
                }

                userSocketSet.add(socket.id);

                // Send INITIAL online friends list to the user
                try {
                    const friends = await getFriends(userId);
                    const onlineFriendIds = friends
                        .map(f => f.id)
                        .filter(fid => this.userSockets.has(fid));

                    if (onlineFriendIds.length > 0) {
                        socket.emit('friends_online_list', onlineFriendIds);
                    }
                } catch (err) {
                    // console.error('Failed to fetch initial online friends', err);
                }
            }

            socket.emit('player_status', player);
            socket.emit('room_list', this.getRoomList());
            console.log(`Player ${player.name} joined the lobby${userId ? ` (userId: ${userId})` : ''}`);
        });

        socket.on('create_room', ({ name, password, category, gameMode }: { name: string; password?: string; category?: string; gameMode?: GameMode }) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            // Rate limit check (per-userId if authenticated)
            if (!checkEventRateLimit('create_room', socket.id, socket.userId)) {
                socket.emit('error', 'RATE_LIMITED');
                return;
            }

            const roomId = uuidv4().substring(0, 6).toUpperCase();
            const room: Room = {
                id: roomId,
                name: name || `${player.name}'s Room`,
                password: password || undefined,
                players: [player],
                maxPlayers: GAME_CONFIG.MAX_PLAYERS,
                ownerId: player.id,
                status: 'LOBBY',
                selectedCategory: category || undefined,
                gameMode: gameMode || 'CLASSIC'
            };

            this.rooms.set(roomId, room);
            socket.join(roomId);
            socket.emit('room_update', this.sanitizeRoomForBroadcast(room));
            io.emit('room_list', this.getRoomList());
            console.log(`Room ${roomId} (${room.name}) created by ${player.name}${category ? ` [Category: ${category}]` : ''}${gameMode ? ` [Mode: ${gameMode}]` : ''}`);
        });

        socket.on('join_room', ({ roomId, password }: { roomId: string; password?: string }) => {
            const player = this.players.get(socket.id);
            const room = this.rooms.get(roomId);

            if (player && room) {
                if (room.password && room.password !== password) {
                    socket.emit('error', 'INCORRECT PASSWORD');
                    return;
                }

                if (room.players.length < room.maxPlayers && room.status === 'LOBBY') {
                    if (!room.players.find(p => p.id === player.id)) {
                        room.players.push(player);
                    }
                    socket.join(roomId);
                    io.to(roomId).emit('room_update', this.sanitizeRoomForBroadcast(room));
                    io.emit('room_list', this.getRoomList());
                    console.log(`Player ${player.name} joined room ${roomId}`);
                } else {
                    socket.emit('error', room.status !== 'LOBBY' ? 'GAME ALREADY STARTED' : 'ROOM IS FULL');
                }
            } else {
                socket.emit('error', 'ROOM NOT FOUND');
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            const player = this.players.get(socket.id);

            if (player) {
                // Remove from userSockets tracking
                if (player.userId) {
                    const userSocketSet = this.userSockets.get(player.userId);
                    if (userSocketSet) {
                        userSocketSet.delete(socket.id);
                        // If this was the LAST socket, they are now offline
                        if (userSocketSet.size === 0) {
                            this.userSockets.delete(player.userId);
                            this.notifyFriends(player.userId, 'friend_offline', { userId: player.userId });
                        }
                    }
                }

                this.leaveRoom(socket.id);
                this.players.delete(socket.id);
            }
        });

        socket.on('leave_room', () => {
            const player = this.players.get(socket.id);
            if (!player) return;

            this.rooms.forEach((room, roomId) => {
                const index = room.players.findIndex(p => p.id === socket.id);
                if (index !== -1) {
                    const wasOwner = room.ownerId === socket.id;
                    room.players.splice(index, 1);
                    socket.leave(roomId);

                    if (room.players.length === 0) {
                        this.clearRoomTimer(roomId);
                        this.rooms.delete(roomId);
                    } else {
                        if (wasOwner) {
                            room.ownerId = room.players[0].id;
                        }

                        if (room.status === 'PLAYING' && room.players.length < GAME_CONFIG.MIN_PLAYERS) {
                            room.status = 'LOBBY';
                            room.gameState = undefined;
                            this.clearRoomTimer(roomId);
                        }

                        io.to(roomId).emit('room_update', this.sanitizeRoomForBroadcast(room));
                    }

                    socket.emit('room_update', null);
                    io.emit('room_list', this.getRoomList());
                    console.log(`Player ${player.name} left room ${roomId}`);
                }
            });
        });

        socket.on('start_game', ({ language }: { language?: string } = {}) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            const room = Array.from(this.rooms.values()).find(r => r.ownerId === player.id);
            if (!room) {
                socket.emit('error', 'YOU ARE NOT THE HOST');
                return;
            }

            if (room.players.length < GAME_CONFIG.MIN_PLAYERS) {
                socket.emit('error', `NEED AT LEAST ${GAME_CONFIG.MIN_PLAYERS} PLAYERS`);
                return;
            }

            // Oyunu başlat (dil parametresi ile)
            room.status = 'PLAYING';
            room.gameState = this.initializeGame(room, language || 'en');

            io.to(room.id).emit('room_update', this.sanitizeRoomForBroadcast(room));
            io.emit('room_list', this.getRoomList());

            // Rol gösterme fazını başlat
            this.transitionToPhase(room, 'ROLE_REVEAL');

            console.log(`Game started in room ${room.id} [Language: ${language || 'en'}]`);
        });

        socket.on('submit_hint', (hint: string) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            const room = Array.from(this.rooms.values()).find(r =>
                r.players.some(p => p.id === socket.id) && r.gameState?.phase === 'HINT_ROUND'
            );

            if (!room || !room.gameState) return;

            // Sırası bu oyuncuda mı kontrol et
            const activePlayers = room.gameState.turnOrder.filter(id => {
                const p = room.players.find(pl => pl.id === id);
                return p && !p.isEliminated;
            });

            const currentPlayerId = activePlayers[room.gameState.currentTurnIndex];
            if (currentPlayerId !== socket.id) {
                socket.emit('error', 'NOT YOUR TURN');
                return;
            }

            // İpucu kelimeyle aynı olamaz
            if (hint.trim().toLowerCase() === room.gameState.word.toLowerCase()) {
                socket.emit('error', 'CANNOT USE THE SECRET WORD AS HINT');
                return;
            }

            // İpucuyu kaydet (diziye ekle)
            const cleanHint = hint.trim().substring(0, 50) || '(Empty)';
            if (!room.gameState.hints[socket.id]) {
                room.gameState.hints[socket.id] = [];
            }
            room.gameState.hints[socket.id].push(cleanHint);
            player.hint = cleanHint;

            // Sıradaki oyuncuya geç
            room.gameState.currentTurnIndex++;
            this.clearRoomTimer(room.id);
            this.startHintTurn(room);

            // Sistem mesajı GÖNDERME (User isteği üzerine kaldırıldı)
            // Sadece oyun state'i güncellenir
            this.broadcastGameState(room);
        });

        socket.on('submit_vote', (targetId: string) => {
            const room = Array.from(this.rooms.values()).find(r =>
                r.players.some(p => p.id === socket.id)
            );
            if (!room) return;

            // Delegate to engine core (pure function)
            const result = handleVote(room, {
                type: 'SUBMIT_VOTE',
                playerId: socket.id,
                targetId
            });

            if (result.success) {
                // Apply state change
                room.gameState!.votes = result.nextVotes;
                const player = this.players.get(socket.id);
                if (player) player.hasVoted = true;

                this.broadcastGameState(room);
                io.to(room.id).emit('room_update', this.sanitizeRoomForBroadcast(room));

                // Check if all voted
                const activeVoters = room.players.filter(p => !p.isEliminated);
                const allVoted = activeVoters.every(p => room.gameState!.votes[p.id]);
                if (allVoted) {
                    this.clearRoomTimer(room.id);
                    this.resolveVotes(room);
                }
            } else {
                socket.emit('error', result.error);
            }
        });

        socket.on('play_again', () => {
            const player = this.players.get(socket.id);
            if (!player) return;

            const room = Array.from(this.rooms.values()).find(r =>
                r.ownerId === socket.id && r.status === 'ENDED'
            );

            if (!room) return;

            // Odayı sıfırla
            room.status = 'LOBBY';
            room.gameState = undefined;
            room.players.forEach(p => {
                p.role = undefined;
                p.isEliminated = false;
                p.hint = undefined;
                p.hasVoted = false;
            });

            this.clearRoomTimer(room.id);
            io.to(room.id).emit('room_update', this.sanitizeRoomForBroadcast(room));
            io.to(room.id).emit('game_state', null);
            io.emit('room_list', this.getRoomList());
        });

        socket.on('send_message', (content: string) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            const room = Array.from(this.rooms.values()).find(r => r.players.some(p => p.id === player.id));
            if (!room) return;

            const message: ChatMessage = {
                id: uuidv4(),
                playerId: player.id,
                playerName: player.name,
                content: content.trim().substring(0, 200),
                timestamp: Date.now()
            };

            io.to(room.id).emit('room_message', message);
        });

        socket.on('get_rooms', () => {
            socket.emit('room_list', this.getRoomList());
        });

        // ============================================
        // FRIEND SYSTEM EVENTS
        // ============================================

        // Send friend request
        socket.on('send_friend_request', async ({ username }: { username: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) {
                emitFriendError(socket, FRIEND_ERROR_CODES.NOT_AUTHORIZED, 'Must be logged in');
                return;
            }

            const result = await sendFriendRequest(player.userId, username);
            if (result.success) {
                socket.emit('friend_request_sent', { username });
                // Notify target if online
                this.notifyFriendEvent(username, 'friend_request_received', {
                    fromUsername: player.name,
                    fromUserId: player.userId
                });
            } else {
                emitFriendError(socket, mapToFriendErrorCode(result.error), result.error);
            }
        });

        // Accept friend request
        socket.on('accept_friend_request', async ({ requestId }: { requestId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const result = await acceptFriendRequest(player.userId, requestId);
            if (result.success && result.userIds) {
                // Notify BOTH parties
                result.userIds.forEach(uid => {
                    const friendSockets = this.userSockets.get(uid);
                    if (friendSockets) {
                        friendSockets.forEach(sid => {
                            this.io?.to(sid).emit('friend_request_accepted', { requestId });
                        });
                    }
                });
            } else {
                emitFriendError(socket, mapToFriendErrorCode(result.error), result.error);
            }
        });

        // Decline friend request
        socket.on('decline_friend_request', async ({ requestId }: { requestId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const result = await declineFriendRequest(player.userId, requestId);
            if (result.success) {
                socket.emit('friend_request_declined', { requestId });
            } else {
                emitFriendError(socket, mapToFriendErrorCode(result.error), result.error);
            }
        });

        // Cancel sent friend request
        socket.on('cancel_friend_request', async ({ requestId }: { requestId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const result = await cancelFriendRequest(player.userId, requestId);
            if (result.success) {
                socket.emit('friend_request_cancelled', { requestId });
            } else {
                emitFriendError(socket, mapToFriendErrorCode(result.error), result.error || 'Failed to cancel request');
            }
        });

        // Remove friend
        socket.on('remove_friend', async ({ friendId }: { friendId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const result = await removeFriend(player.userId, friendId);
            if (result.success) {
                // Emit with new naming convention (friendUserId)
                // TODO: After 2 releases, remove friendId fallback from client
                socket.emit('friend_removed', { friendUserId: friendId });
            } else {
                emitFriendError(socket, mapToFriendErrorCode(result.error), result.error);
            }
        });

        // Block user
        socket.on('block_user', async ({ targetId }: { targetId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const result = await blockUser(player.userId, targetId);
            if (result.success) {
                socket.emit('user_blocked', { targetId });
            }
        });

        // ============================================
        // ROOM INVITE EVENTS
        // ============================================

        // Send room invite to friend
        socket.on('send_room_invite', async ({ friendId }: { friendId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            // Find current room
            const room = Array.from(this.rooms.values()).find(r =>
                r.players.some(p => p.id === socket.id)
            );
            if (!room) {
                socket.emit('invite_error', 'You must be in a room');
                return;
            }

            const result = await sendRoomInvite(player.userId, friendId, room.id, room.name);
            if (result.success) {
                socket.emit('room_invite_sent', { friendId, roomId: room.id });
                // Push to friend if online
                this.pushRoomInvite(friendId, {
                    inviteId: result.inviteId!,
                    fromUsername: player.name,
                    roomId: room.id,
                    roomName: room.name
                });
            } else {
                socket.emit('invite_error', result.error);
            }
        });

        // Accept room invite
        socket.on('accept_room_invite', async ({ inviteId }: { inviteId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const result = await respondToInvite(player.userId, inviteId, true);
            if (result.success && result.roomId) {
                // Auto-join the room
                const room = this.rooms.get(result.roomId);
                if (room && room.status === 'LOBBY' && room.players.length < room.maxPlayers) {
                    // Leave current room first
                    this.rooms.forEach((r, roomId) => {
                        const idx = r.players.findIndex(p => p.id === socket.id);
                        if (idx !== -1) {
                            r.players.splice(idx, 1);
                            socket.leave(roomId);
                            if (r.players.length === 0) {
                                this.rooms.delete(roomId);
                            } else if (r.ownerId === socket.id) {
                                r.ownerId = r.players[0].id;
                            }
                            io.to(roomId).emit('room_update', this.sanitizeRoomForBroadcast(r));
                        }
                    });
                    // Join new room
                    room.players.push(player);
                    socket.join(result.roomId);
                    io.to(result.roomId).emit('room_update', this.sanitizeRoomForBroadcast(room));
                    socket.emit('room_update', this.sanitizeRoomForBroadcast(room));
                    io.emit('room_list', this.getRoomList());
                }
            }
        });

        // Decline room invite
        socket.on('decline_room_invite', async ({ inviteId }: { inviteId: string }) => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;
            await respondToInvite(player.userId, inviteId, false);
        });

        // Reconnect: replay pending invites
        socket.on('get_pending_invites', async () => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const invites = await getPendingInvites(player.userId);
            for (const invite of invites) {
                socket.emit('room_invite_received', invite);
            }
        });

        // Get pending friend requests
        socket.on('get_pending_requests', async () => {
            const player = this.players.get(socket.id);
            if (!player?.userId) return;

            const requests = await getPendingRequests(player.userId);
            socket.emit('pending_requests', requests);
        });
    }

    // Helper: Notify friend by username if online
    private notifyFriendEvent(username: string, event: string, data: any) {
        // Find player by username
        for (const [socketId, player] of this.players) {
            if (player.name.toLowerCase() === username.toLowerCase()) {
                this.io?.sockets.sockets.get(socketId)?.emit(event, data);
                break;
            }
        }
    }

    // Helper: Push room invite to friend by userId
    private pushRoomInvite(friendUserId: string, invite: any) {
        // Find sockets by userId
        const socketIds = this.userSockets.get(friendUserId);
        if (socketIds) {
            socketIds.forEach(socketId => {
                this.io?.sockets.sockets.get(socketId)?.emit('room_invite_received', invite);
            });
        }
    }

    // Get online friend IDs for a user

    // Get online friend IDs for a user
    getOnlineFriendIds(friendIds: string[]): string[] {
        return friendIds.filter(id => this.userSockets.has(id));
    }
}
