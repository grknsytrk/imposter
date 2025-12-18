
import { Socket, Server } from 'socket.io';
import { Player, Room } from '@imposter/shared';
import { v4 as uuidv4 } from 'uuid';

export class GameLogic {
    private players: Map<string, Player> = new Map();
    private rooms: Map<string, Room> = new Map();

    constructor() { }

    private getRoomList() {
        return Array.from(this.rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            playerCount: r.players.length,
            maxPlayers: r.maxPlayers,
            status: r.status,
            hasPassword: !!r.password // Don't expose actual password
        }));
    }

    handleConnection(socket: Socket, io: Server) {
        console.log('Client connected:', socket.id);

        socket.on('join_game', ({ name, avatar }: { name: string; avatar: string }) => {
            const player: Player = {
                id: socket.id,
                name,
                avatar: avatar || 'ghost', // Default fallback
                isReady: false
            };
            this.players.set(socket.id, player);
            socket.emit('player_status', player);

            // Send room list to new player
            socket.emit('room_list', this.getRoomList());
            console.log(`Player ${name} joined the lobby`);
        });

        socket.on('create_room', ({ name, password }: { name: string; password?: string }) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            const roomId = uuidv4().substring(0, 6).toUpperCase();
            const room: Room = {
                id: roomId,
                name: name || `${player.name}'s Room`,
                password: password || undefined,
                players: [player],
                maxPlayers: 8,
                ownerId: player.id,
                status: 'LOBBY'
            };

            this.rooms.set(roomId, room);
            socket.join(roomId);
            socket.emit('room_update', room);

            // Broadcast updated room list to everyone in lobby
            io.emit('room_list', this.getRoomList());
            console.log(`Room ${roomId} (${room.name}) created by ${player.name}`);
        });

        socket.on('join_room', ({ roomId, password }: { roomId: string; password?: string }) => {
            const player = this.players.get(socket.id);
            const room = this.rooms.get(roomId);

            if (player && room) {
                // Check password if room has one
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
                    socket.emit('error', room.status !== 'LOBBY' ? 'GAME ALREADY STARTED' : 'STATION AT CAPACITY');
                }
            } else {
                socket.emit('error', 'ENCRYPTED CHANNEL NOT FOUND');
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
                        this.rooms.delete(roomId);
                    } else {
                        // Assign new owner if owner left
                        if (wasOwner) {
                            room.ownerId = room.players[0].id;
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
                        this.rooms.delete(roomId);
                    } else {
                        if (wasOwner) {
                            room.ownerId = room.players[0].id;
                        }
                        io.to(roomId).emit('room_update', room);
                    }

                    // Clear the leaving player's room state
                    socket.emit('room_update', null);
                    io.emit('room_list', this.getRoomList());
                    console.log(`Player ${player.name} left room ${roomId}`);
                }
            });
        });

        socket.on('start_game', () => {
            const player = this.players.get(socket.id);
            if (!player) return;

            // Find room where player is owner
            const room = Array.from(this.rooms.values()).find(r => r.ownerId === player.id);
            if (!room) {
                socket.emit('error', 'YOU ARE NOT THE HOST');
                return;
            }

            if (room.players.length < 3) {
                socket.emit('error', 'NEED AT LEAST 3 PLAYERS');
                return;
            }

            room.status = 'PLAYING';
            io.to(room.id).emit('room_update', room);
            io.emit('room_list', this.getRoomList());
            console.log(`Game started in room ${room.id}`);
        });

        socket.on('send_message', (content: string) => {
            const player = this.players.get(socket.id);
            if (!player) return;

            // Find player's room
            const room = Array.from(this.rooms.values()).find(r => r.players.some(p => p.id === player.id));
            if (!room) return;

            const message = {
                id: uuidv4(),
                playerId: player.id,
                playerName: player.name,
                content: content.trim().substring(0, 200), // Limit message length
                timestamp: Date.now()
            };

            io.to(room.id).emit('room_message', message);
        });

        socket.on('get_rooms', () => {
            socket.emit('room_list', this.getRoomList());
        });
    }
}
