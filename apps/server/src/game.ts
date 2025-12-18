import { Socket, Server } from 'socket.io';
import { Player, Room, GameState, GamePhase, CATEGORIES, GAME_CONFIG, ChatMessage } from '@imposter/shared';
import { v4 as uuidv4 } from 'uuid';

export class GameLogic {
    private players: Map<string, Player> = new Map();
    private rooms: Map<string, Room> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private io: Server | null = null;

    constructor() { }

    private getRoomList() {
        return Array.from(this.rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            playerCount: r.players.length,
            maxPlayers: r.maxPlayers,
            status: r.status,
            hasPassword: !!r.password
        }));
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

    private initializeGame(room: Room): GameState {
        // Kategori seç (seçilmişse onu kullan, yoksa rastgele)
        let category;
        if (room.selectedCategory) {
            category = CATEGORIES.find(c => c.name === room.selectedCategory) || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        } else {
            category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        }
        const word = category.words[Math.floor(Math.random() * category.words.length)];

        // Rastgele imposter seç
        const imposterIndex = Math.floor(Math.random() * room.players.length);
        const imposterId = room.players[imposterIndex].id;

        // Sıra karıştır
        const turnOrder = room.players.map(p => p.id).sort(() => Math.random() - 0.5);

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
            word: word,
            imposterId: imposterId,
            currentTurnIndex: 0,
            turnOrder: turnOrder,
            turnTimeLeft: GAME_CONFIG.HINT_TURN_TIME,
            phaseTimeLeft: GAME_CONFIG.ROLE_REVEAL_TIME,
            roundNumber: 1,
            votes: {},
            hints: {}
        };
    }

    private getPlayerGameData(player: Player, gameState: GameState): any {
        // Her oyuncuya özel veri gönder (imposter kelimeyi görmemeli)
        const isImposter = player.id === gameState.imposterId;

        return {
            phase: gameState.phase,
            category: gameState.category,
            word: isImposter ? null : gameState.word, // Imposter kelimeyi göremez
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
            imposterId: gameState.phase === 'GAME_OVER' ? gameState.imposterId : null
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

        // Bu roundda herkes ipucu verdiyse
        const allHintsGiven = activePlayers.every(id => room.gameState!.hints[id]);

        if (allHintsGiven) {
            // Eğer henüz tüm turlar bitmemişse, sonraki tura geç
            const currentHintRound = room.gameState.roundNumber;
            if (currentHintRound < GAME_CONFIG.HINT_ROUNDS) {
                // Sonraki hint round'a geç
                room.gameState.roundNumber++;
                room.gameState.currentTurnIndex = 0;
                room.gameState.hints = {}; // Hint'leri temizle
                room.players.forEach(p => p.hint = undefined);
                this.startHintTurn(room);
                return;
            }
            // Tüm turlar bitti, tartışmaya geç
            this.transitionToPhase(room, 'DISCUSSION');
            return;
        }

        // Sıradaki ipucu vermemiş oyuncuyu bul
        let currentIndex = room.gameState.currentTurnIndex;
        while (currentIndex < activePlayers.length) {
            const playerId = activePlayers[currentIndex];
            if (!room.gameState.hints[playerId]) {
                break;
            }
            currentIndex++;
        }

        if (currentIndex >= activePlayers.length) {
            // Bu tur bitti, tekrar kontrol et
            this.startHintTurn(room);
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
                    room.gameState!.hints[currentPlayerId] = '(Timed out)';
                }
                room.gameState!.currentTurnIndex++;
                this.startHintTurn(room);
            }
        );

        this.broadcastGameState(room);
    }

    private resolveVotes(room: Room) {
        if (!room.gameState) return;

        // Oyları say
        const voteCounts: Record<string, number> = {};
        Object.values(room.gameState.votes).forEach(votedId => {
            voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
        });

        // En çok oy alanı bul
        let maxVotes = 0;
        let eliminatedId: string | null = null;

        Object.entries(voteCounts).forEach(([playerId, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                eliminatedId = playerId;
            }
        });

        if (eliminatedId) {
            room.gameState.eliminatedPlayerId = eliminatedId;
            const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
            if (eliminatedPlayer) {
                eliminatedPlayer.isEliminated = true;
            }
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

        socket.on('join_game', ({ name, avatar }: { name: string; avatar: string }) => {
            const player: Player = {
                id: socket.id,
                name,
                avatar: avatar || 'ghost',
                isReady: false
            };
            this.players.set(socket.id, player);
            socket.emit('player_status', player);
            socket.emit('room_list', this.getRoomList());
            console.log(`Player ${name} joined the lobby`);
        });

        socket.on('create_room', ({ name, password, category }: { name: string; password?: string; category?: string }) => {
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
                selectedCategory: category || undefined
            };

            this.rooms.set(roomId, room);
            socket.join(roomId);
            socket.emit('room_update', room);
            io.emit('room_list', this.getRoomList());
            console.log(`Room ${roomId} (${room.name}) created by ${player.name}${category ? ` [Category: ${category}]` : ''}`);
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

        socket.on('start_game', () => {
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

            // Oyunu başlat
            room.status = 'PLAYING';
            room.gameState = this.initializeGame(room);

            io.to(room.id).emit('room_update', room);
            io.emit('room_list', this.getRoomList());

            // Rol gösterme fazını başlat
            this.transitionToPhase(room, 'ROLE_REVEAL');

            console.log(`Game started in room ${room.id}`);
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

            // İpucuyu kaydet
            const cleanHint = hint.trim().substring(0, 50);
            room.gameState.hints[socket.id] = cleanHint || '(Empty)';
            player.hint = cleanHint;

            // Sıradaki oyuncuya geç
            room.gameState.currentTurnIndex++;
            this.clearRoomTimer(room.id);
            this.startHintTurn(room);

            // Sistem mesajı GÖNDERME (User isteği üzerine kaldırıldı)
            // Sadece oyun state'i güncellenir
            this.broadcastGameState(room);
        });

        socket.on('submit_vote', (votedPlayerId: string) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            const room = Array.from(this.rooms.values()).find(r =>
                r.players.some(p => p.id === socket.id) && r.gameState?.phase === 'VOTING'
            );

            if (!room || !room.gameState) return;

            // Zaten oy verdiyse reddet
            if (room.gameState.votes[socket.id]) {
                socket.emit('error', 'ALREADY VOTED');
                return;
            }

            // Kendine oy veremez
            if (votedPlayerId === socket.id) {
                socket.emit('error', 'CANNOT VOTE FOR YOURSELF');
                return;
            }

            // Elenen birine oy veremez
            const votedPlayer = room.players.find(p => p.id === votedPlayerId);
            if (!votedPlayer || votedPlayer.isEliminated) {
                socket.emit('error', 'INVALID VOTE');
                return;
            }

            room.gameState.votes[socket.id] = votedPlayerId;
            player.hasVoted = true;

            this.broadcastGameState(room);
            io.to(room.id).emit('room_update', room);

            // Herkes oy verdiyse erken bitir
            const activeVoters = room.players.filter(p => !p.isEliminated);
            const allVoted = activeVoters.every(p => room.gameState!.votes[p.id]);

            if (allVoted) {
                this.clearRoomTimer(room.id);
                this.resolveVotes(room);
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
