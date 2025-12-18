import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Player, Room, ChatMessage } from '@imposter/shared';

interface GameState {
    socket: Socket | null;
    isConnected: boolean;
    player: Player | null;
    room: Room | null;
    rooms: any[];
    messages: ChatMessage[];
    toast: { message: string; type: 'error' | 'success' | 'info' } | null;

    connect: (name: string, avatar: string) => void;
    createRoom: (name: string, password?: string) => void;
    joinRoom: (roomId: string, password?: string) => void;
    startGame: () => void;
    leaveRoom: () => void;
    sendMessage: (content: string) => void;
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

    connect: (name: string, avatar: string) => {
        if (get().socket) return;

        const socket = io('/', { path: '/socket.io' });

        socket.on('connect', () => {
            set({ isConnected: true });
            socket.emit('join_game', { name, avatar });
        });

        socket.on('disconnect', () => {
            set({ isConnected: false });
        });

        socket.on('player_status', (player: Player) => {
            set({ player });
        });

        socket.on('room_update', (room: Room) => {
            set({ room });
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

        set({ socket });
    },

    createRoom: (name: string, password?: string) => {
        set({ messages: [] });
        get().socket?.emit('create_room', { name, password });
    },

    joinRoom: (roomId: string, password?: string) => {
        set({ messages: [] });
        get().socket?.emit('join_room', { roomId, password });
    },

    startGame: () => {
        get().socket?.emit('start_game');
    },

    leaveRoom: () => {
        set({ messages: [] });
        get().socket?.emit('leave_room');
    },

    sendMessage: (content: string) => {
        get().socket?.emit('send_message', content);
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
