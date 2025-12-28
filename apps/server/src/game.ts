import { Socket, Server } from 'socket.io';
import { Player, Room, GameState, GamePhase, CATEGORIES, GAME_CONFIG, ChatMessage, GameMode } from '@imposter/shared';
import { v4 as uuidv4 } from 'uuid';
import { handleVote } from './engine';

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
    private userSockets: Map<string, string> = new Map(); // userId -> socketId (for single session enforcement)
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

        return {
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

        room.gameState.phase = phase;

        switch (phase) {
            case 'ROLE_REVEAL':
                room.gameState.phaseTimeLeft = GAME_CONFIG.ROLE_REVEAL_TIME;
                this.startPhaseTimer(room.id, GAME_CONFIG.ROLE_REVEAL_TIME,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.transitionToPhase(room, 'HINT_ROUND')
                );
                break;

            case 'HINT_ROUND':
                room.gameState.currentTurnIndex = 0;
                room.gameState.turnTimeLeft = GAME_CONFIG.HINT_TURN_TIME;
                this.startHintTurn(room);
                break;

            case 'DISCUSSION':
                room.gameState.phaseTimeLeft = GAME_CONFIG.DISCUSSION_TIME;
                this.startPhaseTimer(room.id, GAME_CONFIG.DISCUSSION_TIME,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.transitionToPhase(room, 'VOTING')
                );
                break;

            case 'VOTING':
                room.gameState.phaseTimeLeft = GAME_CONFIG.VOTING_TIME;
                room.gameState.votes = {};
                room.players.forEach(p => p.hasVoted = false);
                this.startPhaseTimer(room.id, GAME_CONFIG.VOTING_TIME,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.resolveVotes(room)
                );
                break;

            case 'VOTE_RESULT':
                room.gameState.phaseTimeLeft = GAME_CONFIG.VOTE_RESULT_TIME;
                this.startPhaseTimer(room.id, GAME_CONFIG.VOTE_RESULT_TIME,
                    () => {
                        room.gameState!.phaseTimeLeft--;
                        this.broadcastGameState(room);
                    },
                    () => this.checkGameEnd(room)
                );
                break;

            case 'GAME_OVER':
                this.clearRoomTimer(room.id);
                break;
        }

        this.broadcastGameState(room);
        this.io?.to(room.id).emit('room_update', room);
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

    handleConnection(socket: Socket, io: Server) {
        this.io = io;
        console.log('Client connected:', socket.id);

        socket.on('join_game', ({ name, avatar, userId }: { name: string; avatar: string; userId?: string }) => {
            // Single session enforcement: if same userId already connected, disconnect old socket
            if (userId) {
                const existingSocketId = this.userSockets.get(userId);
                if (existingSocketId && existingSocketId !== socket.id) {
                    const existingSocket = io.sockets.sockets.get(existingSocketId);
                    if (existingSocket) {
                        existingSocket.emit('session_replaced', 'Another session took over');
                        existingSocket.disconnect(true);
                        console.log(`Session replaced for user ${userId}: ${existingSocketId} -> ${socket.id}`);
                    }
                }
                this.userSockets.set(userId, socket.id);
            }

            const player: Player = {
                id: socket.id,
                name,
                avatar: avatar || 'ghost',
                isReady: false,
                userId: userId // Store userId for cleanup on disconnect
            };
            this.players.set(socket.id, player);
            socket.emit('player_status', player);
            socket.emit('room_list', this.getRoomList());
            console.log(`Player ${name} joined the lobby${userId ? ` (userId: ${userId})` : ''}`);
        });

        socket.on('create_room', ({ name, password, category, gameMode }: { name: string; password?: string; category?: string; gameMode?: GameMode }) => {
            const player = this.players.get(socket.id);
            if (!player) return;

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
            socket.emit('room_update', room);
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
                    io.to(roomId).emit('room_update', room);
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

            // Clean up userSockets map
            if (player?.userId) {
                const currentSocketId = this.userSockets.get(player.userId);
                // Only delete if this socket is still the active one for this userId
                if (currentSocketId === socket.id) {
                    this.userSockets.delete(player.userId);
                }
            }

            this.players.delete(socket.id);

            this.rooms.forEach((room, roomId) => {
                const index = room.players.findIndex(p => p.id === socket.id);
                if (index !== -1) {
                    const wasOwner = room.ownerId === socket.id;
                    room.players.splice(index, 1);

                    if (room.players.length === 0) {
                        this.clearRoomTimer(roomId);
                        this.rooms.delete(roomId);
                    } else {
                        if (wasOwner) {
                            room.ownerId = room.players[0].id;
                        }

                        // Oyun devam ediyorsa ve yeterli oyuncu kalmadıysa oyunu bitir
                        if (room.status === 'PLAYING' && room.players.length < GAME_CONFIG.MIN_PLAYERS) {
                            room.status = 'LOBBY';
                            room.gameState = undefined;
                            this.clearRoomTimer(roomId);
                        }

                        io.to(roomId).emit('room_update', room);
                    }
                    io.emit('room_list', this.getRoomList());
                }
            });
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

                        io.to(roomId).emit('room_update', room);
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

            io.to(room.id).emit('room_update', room);
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
                io.to(room.id).emit('room_update', room);

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
            io.to(room.id).emit('room_update', room);
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
    }
}
