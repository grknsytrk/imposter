import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
    isValidUserId,
    FriendView,
    FriendRequestDTO
} from '@imposter/shared';
import {
    dbRowToFriendDTO,
    dbRowToFriendRequestDTO,
    toFriendView
} from '../adapters/friendAdapters';

// ============================================
// LEGACY TYPES (kept for RoomInvite only - not migrating this PR)
// ============================================

/**
 * @deprecated Use RoomInviteDTO from @imposter/shared
 * Will be removed in separate cleanup PR
 */
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

// ============================================
// STORE STATE (using shared DTOs)
// ============================================

interface FriendState {
    // Friends with online status (view model)
    friends: FriendView[];

    // Pending requests (INCOMING only)
    pendingRequests: FriendRequestDTO[];

    // Sent requests (OUTGOING only)
    sentRequests: FriendRequestDTO[];

    // Room invites (legacy, not migrated this PR)
    pendingInvites: RoomInvite[];

    // Online tracking
    onlineUserIds: Set<string>;

    loading: boolean;
    fetchInProgress: boolean;
    refreshQueued: string | null; // Queued userId for deferred refresh
    seenInviteIds: Set<string>;

    // ============================================
    // ACTIONS
    // ============================================

    fetchFriends: (userId: string) => Promise<void>;
    sendFriendRequest: (socket: any, username: string) => void;

    // Request actions (use requestId)
    acceptRequest: (socket: any, requestId: string) => void;
    declineRequest: (socket: any, requestId: string) => void;
    cancelRequest: (socket: any, requestId: string) => void;

    // Friend actions (use friendUserId)
    removeFriend: (socket: any, friendUserId: string) => void;
    inviteToRoom: (socket: any, friendUserId: string) => void;

    // Socket handlers
    setFriendOnline: (friendUserId: string) => void;
    setFriendOffline: (friendUserId: string) => void;
    setOnlineFriends: (friendUserIds: string[]) => void;
    addPendingRequest: (request: FriendRequestDTO) => void;
    removeRequest: (requestId: string) => void;
    addRoomInvite: (invite: RoomInvite) => boolean;
    removeRoomInvite: (inviteId: string) => void;
    clearInvites: () => void;

    // Optimistic update helpers
    setFriends: (friends: FriendView[]) => void;
    setPendingRequests: (requests: FriendRequestDTO[]) => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    pendingInvites: [],
    onlineUserIds: new Set(),
    loading: false,
    fetchInProgress: false,
    refreshQueued: null,
    seenInviteIds: new Set(),

    fetchFriends: async (userId: string) => {
        // Early validation BEFORE setting loading to prevent stuck state
        if (!isValidUserId(userId)) {
            return;
        }

        // Prevent concurrent fetches - queue refresh if one is in progress
        if (get().fetchInProgress) {
            // Queue this refresh for after current fetch completes
            set({ refreshQueued: userId });
            return;
        }
        set({ loading: true, fetchInProgress: true, refreshQueued: null });

        try {
            // Fetch friends from Supabase
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    user_id,
                    friend_id,
                    status,
                    requested_by,
                    created_at,
                    user:profiles!friendships_user_id_fkey(id, username, avatar),
                    friend:profiles!friendships_friend_id_fkey(id, username, avatar)
                `)
                .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
                .in('status', ['accepted', 'pending']);

            if (error) throw error;

            const friends: FriendView[] = [];
            const pendingRequests: FriendRequestDTO[] = [];
            const sentRequests: FriendRequestDTO[] = [];
            const onlineUserIds = get().onlineUserIds;

            let skipped = 0;
            for (const row of data ?? []) {
                // Try accepted friend first
                const friendDTO = dbRowToFriendDTO(row, userId);
                if (friendDTO) {
                    // Enrich with online status (view model)
                    friends.push(toFriendView(friendDTO, onlineUserIds));
                    continue;
                }

                // Try pending request
                const requestDTO = dbRowToFriendRequestDTO(row, userId);
                if (requestDTO) {
                    if (requestDTO.direction === 'OUTGOING') {
                        sentRequests.push(requestDTO);
                    } else {
                        pendingRequests.push(requestDTO);
                    }
                    continue;
                }

                skipped++;
            }

            // Debug log for skipped rows (development only)
            if (skipped > 0 && import.meta.env.DEV) {
                console.debug(`[FriendStore] skipped ${skipped} invalid rows`);
            }

            set({ friends, pendingRequests, sentRequests });
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        } finally {
            set({ loading: false, fetchInProgress: false });

            // Process queued refresh if any (event storm protection)
            const queued = get().refreshQueued;
            if (queued) {
                set({ refreshQueued: null });
                // Defer to next tick to avoid stack overflow
                setTimeout(() => get().fetchFriends(queued), 0);
            }
        }
    },

    sendFriendRequest: (socket, username) => {
        socket?.emit('send_friend_request', { username });
    },

    acceptRequest: (socket, requestId) => {
        socket?.emit('accept_friend_request', { requestId });
        // Optimistic: remove from pending
        set(state => ({
            pendingRequests: state.pendingRequests.filter(r => r.requestId !== requestId)
        }));
    },

    declineRequest: (socket, requestId) => {
        socket?.emit('decline_friend_request', { requestId });
        // Optimistic: remove from pending
        set(state => ({
            pendingRequests: state.pendingRequests.filter(r => r.requestId !== requestId)
        }));
    },

    removeFriend: (socket, friendUserId) => {
        // Server still expects friendId key (backward compat)
        socket?.emit('remove_friend', { friendId: friendUserId });
        // Optimistic: remove from friends using userId
        set(state => ({
            friends: state.friends.filter(f => f.userId !== friendUserId)
        }));
    },

    cancelRequest: (socket, requestId) => {
        socket?.emit('cancel_friend_request', { requestId });
        // Optimistic: remove from sent requests
        set(state => ({
            sentRequests: state.sentRequests.filter(r => r.requestId !== requestId)
        }));
    },

    inviteToRoom: (socket, friendUserId) => {
        // Server still expects friendId key
        socket?.emit('send_room_invite', { friendId: friendUserId });
    },

    setFriendOnline: (friendUserId) => {
        const newSet = new Set(get().onlineUserIds);
        newSet.add(friendUserId);
        set(state => ({
            onlineUserIds: newSet,
            friends: state.friends.map(f =>
                f.userId === friendUserId ? { ...f, online: true } : f
            )
        }));
    },

    setFriendOffline: (friendUserId) => {
        const newSet = new Set(get().onlineUserIds);
        newSet.delete(friendUserId);
        set(state => ({
            onlineUserIds: newSet,
            friends: state.friends.map(f =>
                f.userId === friendUserId ? { ...f, online: false } : f
            )
        }));
    },

    setOnlineFriends: (friendUserIds: string[]) => {
        const newSet = new Set(friendUserIds);
        set(state => ({
            onlineUserIds: newSet,
            friends: state.friends.map(f => ({
                ...f,
                online: newSet.has(f.userId)
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
            pendingRequests: state.pendingRequests.filter(r => r.requestId !== requestId)
        }));
    },

    addRoomInvite: (invite) => {
        const { seenInviteIds, pendingInvites } = get();
        const inviteId = invite.inviteId || invite.id;

        // Dedupe check
        if (seenInviteIds.has(inviteId)) {
            return false;
        }

        // Expiry check - reject expired invites
        if (invite.expiresAt) {
            const expiresAt = new Date(invite.expiresAt).getTime();
            if (expiresAt < Date.now()) {
                console.log('[FriendStore] Rejected expired invite:', inviteId);
                return false;
            }
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

// ============================================
// LEGACY EXPORT (for backward compatibility)
// ============================================

/**
 * @deprecated Use FriendView from @imposter/shared instead
 */
export type Friend = FriendView;
