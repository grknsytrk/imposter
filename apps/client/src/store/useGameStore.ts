import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Player, Room, ChatMessage, GamePhase, GameMode } from '@imposter/shared';
import { useFriendStore } from './useFriendStore';

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
    hints: Record<string, string[]>;
    votes: Record<string, string>;
    eliminatedPlayerId?: string;
    winner?: 'CITIZENS' | 'IMPOSTER';
    imposterId?: string; // Sadece oyun bitince gösterilir
    gameMode?: GameMode; // CLASSIC veya BLIND
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

    connect: (name: string, avatar: string, userId?: string) => void;
    disconnect: () => void;
    createRoom: (name: string, password?: string, category?: string, gameMode?: GameMode) => void;
    joinRoom: (roomId: string, password?: string) => void;
    startGame: (language?: string) => void;
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

    connect: async (name: string, avatar: string, userId?: string) => {
        if (get().socket) return;

        // Get current session token for authenticated socket connection
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // Production'da farklı domain, development'ta aynı origin
        const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
        const socket = io(socketUrl, {
            path: '/socket.io',
            auth: { token }  // Pass JWT in handshake for server-side verification
        });

        socket.on('connect', () => {
            set({ isConnected: true });
            // Note: userId is now verified server-side from JWT, but we still accept 
            // the parameter for backward compatibility during migration period
            socket.emit('join_game', { name, avatar });

            // Initial friends fetch if authenticated
            if (userId) {
                useFriendStore.getState().fetchFriends(userId);
            }
        });

        // Single session enforcement: another tab took over
        socket.on('session_replaced', (message: string) => {
            get().showToast(message || 'Another session took over', 'error');
            socket.disconnect();
            set({
                socket: null,
                isConnected: false,
                player: null,
                room: null,
                rooms: [],
                messages: [],
                gameState: null
            });
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

        // ============================================
        // FRIEND & PRESENCE LISTENERS
        // ============================================

        socket.on('friend_request_received', (data) => {
            useFriendStore.getState().addPendingRequest({
                id: data.fromUserId,
                requestId: data.requestId || ('temp-' + Date.now()),
                username: data.fromUsername,
                avatar: 'ghost',
                status: 'pending',
                requestedByMe: false,
                online: true
            });
            get().showToast(`Friend request from ${data.fromUsername}`, 'info');
        });

        socket.on('friend_request_accepted', () => {
            const player = get().player;
            if (player?.userId) {
                useFriendStore.getState().fetchFriends(player.userId);
            }
            get().showToast('Friend request accepted!', 'success');
        });

        socket.on('friend_request_declined', ({ requestId }) => {
            useFriendStore.getState().removeRequest(requestId);
        });

        socket.on('friend_removed', ({ friendId }) => {
            useFriendStore.setState(state => ({
                friends: state.friends.filter(f => f.id !== friendId)
            }));
        });

        socket.on('friend_request_sent', () => {
            const player = get().player;
            if (player?.userId) {
                useFriendStore.getState().fetchFriends(player.userId);
            }
        });

        socket.on('friend_online', ({ userId }) => {
            useFriendStore.getState().setFriendOnline(userId);
        });

        socket.on('friend_offline', ({ userId }) => {
            useFriendStore.getState().setFriendOffline(userId);
        });

        socket.on('friends_online_list', (onlineIds) => {
            useFriendStore.getState().setOnlineFriends(onlineIds);
        });

        socket.on('room_invite_received', (invite) => {
            const added = useFriendStore.getState().addRoomInvite(invite);
            if (added) {
                get().showToast(`New room invite from ${invite.fromUsername}`, 'info');
            }
        });

        set({ socket });
    },

    disconnect: () => {
        const socket = get().socket;
        if (socket) {
            socket.disconnect();
        }
        set({
            socket: null,
            isConnected: false,
            player: null,
            room: null,
            rooms: [],
            messages: [],
            gameState: null
        });
    },

    createRoom: (name: string, password?: string, category?: string, gameMode?: GameMode) => {
        set({ messages: [], gameState: null });
        get().socket?.emit('create_room', { name, password, category, gameMode: gameMode || 'CLASSIC' });
    },

    joinRoom: (roomId: string, password?: string) => {
        set({ messages: [], gameState: null });
        get().socket?.emit('join_room', { roomId, password });
    },

    startGame: (language?: string) => {
        get().socket?.emit('start_game', { language: language || 'en' });
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
