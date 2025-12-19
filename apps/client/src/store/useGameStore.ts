import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Player, Room, ChatMessage, GamePhase } from '@imposter/shared';

// Client tarafında kullanılan game state (server'dan gelen)
interface ClientGameState {
    phase: GamePhase;
    category: string;
    word: string | null; // Imposter için null
    isImposter: boolean;
    currentTurnIndex: number;
    turnOrder: string[];
    turnTimeLeft: number;
    phaseTimeLeft: number;
    roundNumber: number;
    hints: Record<string, string>;
    votes: Record<string, string>;
    eliminatedPlayerId?: string;
    winner?: 'CITIZENS' | 'IMPOSTER';
    imposterId?: string; // Sadece oyun bitince gösterilir
}

interface GameState {
    socket: Socket | null;
    isConnected: boolean;
    player: Player | null;
    room: Room | null;
    rooms: any[];
    messages: ChatMessage[];
    toast: { message: string; type: 'error' | 'success' | 'info' } | null;
    gameState: ClientGameState | null;

    connect: (name: string, avatar: string) => void;
    createRoom: (name: string, password?: string, category?: string) => void;
    joinRoom: (roomId: string, password?: string) => void;
    startGame: () => void;
    leaveRoom: () => void;
    sendMessage: (content: string) => void;
    submitHint: (hint: string) => void;
    submitVote: (playerId: string) => void;
    playAgain: () => void;
    refreshRooms: () => void;
    showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
    clearToast: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    socket: null,
    isConnected: false,
    player: null,
    room: null,
    rooms: [],
    messages: [],
    toast: null,
    gameState: null,

    connect: (name: string, avatar: string) => {
        if (get().socket) return;

        // Production'da farklı domain, development'ta aynı origin
        const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
        const socket = io(socketUrl, { path: '/socket.io' });

        socket.on('connect', () => {
            set({ isConnected: true });
            socket.emit('join_game', { name, avatar });
        });

        socket.on('disconnect', () => {
            set({ isConnected: false, gameState: null });
        });

        socket.on('player_status', (player: Player) => {
            set({ player });
        });

        socket.on('room_update', (room: Room | null) => {
            if (room === null) {
                set({ room: null, gameState: null, messages: [] });
            } else {
                set({ room });
            }
        });

        socket.on('room_list', (rooms: any[]) => {
            set({ rooms });
        });

        socket.on('error', (message: string) => {
            get().showToast(message, 'error');
        });

        socket.on('room_message', (message: ChatMessage) => {
            set(state => ({
                messages: [...state.messages, message].slice(-50)
            }));
        });

        socket.on('game_state', (gameState: ClientGameState | null) => {
            set({ gameState });
        });

        set({ socket });
    },

    createRoom: (name: string, password?: string, category?: string) => {
        set({ messages: [], gameState: null });
        get().socket?.emit('create_room', { name, password, category });
    },

    joinRoom: (roomId: string, password?: string) => {
        set({ messages: [], gameState: null });
        get().socket?.emit('join_room', { roomId, password });
    },

    startGame: () => {
        get().socket?.emit('start_game');
    },

    leaveRoom: () => {
        set({ messages: [], gameState: null, room: null });
        get().socket?.emit('leave_room');
    },

    sendMessage: (content: string) => {
        get().socket?.emit('send_message', content);
    },

    submitHint: (hint: string) => {
        get().socket?.emit('submit_hint', hint);
    },

    submitVote: (playerId: string) => {
        get().socket?.emit('submit_vote', playerId);
    },

    playAgain: () => {
        get().socket?.emit('play_again');
    },

    refreshRooms: () => {
        get().socket?.emit('get_rooms');
    },

    showToast: (message: string, type: 'error' | 'success' | 'info' = 'info') => {
        set({ toast: { message, type } });
        setTimeout(() => {
            set({ toast: null });
        }, 4000);
    },

    clearToast: () => {
        set({ toast: null });
    }
}));
