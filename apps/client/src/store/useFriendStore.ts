import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Types
export interface Friend {
    id: string; // User ID
    requestId: string; // Friendship Row ID
    username: string;
    avatar: string;
    status: 'pending' | 'accepted';
    requestedByMe: boolean;
    online?: boolean;
}

export interface RoomInvite {
    id: string;
    inviteId?: string;
    fromUserId: string;
    fromUsername: string;
    roomId: string;
    roomName: string;
    createdAt?: string;
    expiresAt?: string;
}

interface FriendState {
    friends: Friend[];
    pendingRequests: Friend[];
    sentRequests: Friend[];
    pendingInvites: RoomInvite[];
    onlineUserIds: Set<string>;
    loading: boolean;

    // Seen invite IDs to prevent duplicate toasts
    seenInviteIds: Set<string>;

    // Actions
    fetchFriends: (userId: string) => Promise<void>;
    sendFriendRequest: (socket: any, username: string) => void;
    acceptRequest: (socket: any, requestId: string) => void;
    declineRequest: (socket: any, requestId: string) => void;
    removeFriend: (socket: any, friendId: string) => void;
    cancelRequest: (socket: any, requestId: string) => void;
    inviteToRoom: (socket: any, friendId: string) => void;

    // Socket handlers
    setFriendOnline: (friendId: string) => void;
    setFriendOffline: (friendId: string) => void;
    setOnlineFriends: (friendIds: string[]) => void;
    addPendingRequest: (request: Friend) => void;
    removeRequest: (requestId: string) => void;
    addRoomInvite: (invite: RoomInvite) => boolean; // Returns false if duplicate
    removeRoomInvite: (inviteId: string) => void;
    clearInvites: () => void;

    // Optimistic update helpers
    setFriends: (friends: Friend[]) => void;
    setPendingRequests: (requests: Friend[]) => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    pendingInvites: [],
    onlineUserIds: new Set(),
    loading: false,
    seenInviteIds: new Set(),

    fetchFriends: async (userId: string) => {
        set({ loading: true });
        try {
            // Validate UUID to prevent SQL injection in .or() string interpolation
            // RELAXED REGEX: Just check for standard UUID structure (8-4-4-4-12 hex)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userId)) {
                return;
            }

            // Fetch friends from Supabase
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    user_id,
                    friend_id,
                    status,
                    requested_by,
                    user:profiles!friendships_user_id_fkey(id, username, avatar),
                    friend:profiles!friendships_friend_id_fkey(id, username, avatar)
                `)
                .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
                .in('status', ['accepted', 'pending']);

            if (error) throw error;

            const friends: Friend[] = [];
            const pendingRequests: Friend[] = [];
            const sentRequests: Friend[] = [];

            data?.forEach((row: any) => {
                const iAmUserId = row.user_id === userId;
                // Supabase returns joined relations as arrays
                const friendProfile = iAmUserId
                    ? (Array.isArray(row.friend) ? row.friend[0] : row.friend)
                    : (Array.isArray(row.user) ? row.user[0] : row.user);
                const requestedByMe = row.requested_by === userId;

                if (!friendProfile) return;

                const friend: Friend = {
                    id: friendProfile.id,
                    requestId: row.id,
                    username: friendProfile.username,
                    avatar: friendProfile.avatar || 'ghost',
                    status: row.status as 'pending' | 'accepted',
                    requestedByMe,
                    online: get().onlineUserIds.has(friendProfile.id) // Check persistent online state
                };

                if (row.status === 'accepted') {
                    friends.push(friend);
                } else if (row.status === 'pending') {
                    if (requestedByMe) {
                        sentRequests.push(friend);
                    } else {
                        pendingRequests.push(friend);
                    }
                }
            });

            set({ friends, pendingRequests, sentRequests });
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        } finally {
            set({ loading: false });
        }
    },

    sendFriendRequest: (socket, username) => {
        socket?.emit('send_friend_request', { username });
    },

    acceptRequest: (socket, requestId) => {
        socket?.emit('accept_friend_request', { requestId });
        // Optimistic: remove from pending
        set(state => ({
            pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
        }));
    },

    declineRequest: (socket, requestId) => {
        socket?.emit('decline_friend_request', { requestId });
        // Optimistic: remove from pending
        set(state => ({
            pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
        }));
    },

    removeFriend: (socket, friendId) => {
        socket?.emit('remove_friend', { friendId });
        // Optimistic: remove from friends
        set(state => ({
            friends: state.friends.filter(f => f.id !== friendId)
        }));
    },

    cancelRequest: (socket, requestId) => {
        socket?.emit('cancel_friend_request', { requestId });
        // Optimistic: remove from sent requests
        set(state => ({
            sentRequests: state.sentRequests.filter(r => r.id !== requestId)
        }));
    },

    inviteToRoom: (socket, friendId) => {
        socket?.emit('send_room_invite', { friendId });
    },

    setFriendOnline: (friendId) => {
        const newSet = new Set(get().onlineUserIds);
        newSet.add(friendId);
        set(state => ({
            onlineUserIds: newSet,
            friends: state.friends.map(f =>
                f.id === friendId ? { ...f, online: true } : f
            )
        }));
    },

    setFriendOffline: (friendId) => {
        const newSet = new Set(get().onlineUserIds);
        newSet.delete(friendId);
        set(state => ({
            onlineUserIds: newSet,
            friends: state.friends.map(f =>
                f.id === friendId ? { ...f, online: false } : f
            )
        }));
    },

    setOnlineFriends: (friendIds: string[]) => {
        const newSet = new Set(friendIds);
        set(state => ({
            onlineUserIds: newSet,
            friends: state.friends.map(f => ({
                ...f,
                online: newSet.has(f.id)
            }))
        }));
    },

    addPendingRequest: (request) => {
        set(state => ({
            pendingRequests: [...state.pendingRequests, request]
        }));
    },

    removeRequest: (requestId) => {
        set(state => ({
            pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
        }));
    },

    addRoomInvite: (invite) => {
        const { seenInviteIds, pendingInvites } = get();
        const inviteId = invite.inviteId || invite.id;

        // Dedupe check
        if (seenInviteIds.has(inviteId)) {
            return false;
        }

        set({
            pendingInvites: [...pendingInvites, invite],
            seenInviteIds: new Set([...seenInviteIds, inviteId])
        });
        return true;
    },

    removeRoomInvite: (inviteId) => {
        set(state => ({
            pendingInvites: state.pendingInvites.filter(i =>
                i.id !== inviteId && i.inviteId !== inviteId
            )
        }));
    },

    clearInvites: () => {
        set({ pendingInvites: [], seenInviteIds: new Set() });
    },

    setFriends: (friends) => set({ friends }),
    setPendingRequests: (requests) => set({ pendingRequests: requests })
}));
