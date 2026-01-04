/**
 * Friend Service - Friendship and room invite management
 * 
 * Uses symmetric model: user_id < friend_id invariant
 * This ensures single row per friendship, no duplicates
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
    isValidUserId,
    FriendDTO,
    FriendRequestDTO,
    PublicUserDTO,
    RoomInviteDTO
} from '@imposter/shared';

// Supabase client (server-side with service role)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabase: SupabaseClient | null = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// ============================================
// LEGACY TYPES (deprecated - use @imposter/shared)
// ============================================

/**
 * @deprecated Use FriendDTO or FriendRequestDTO from @imposter/shared
 * Will be removed in future refactor
 */
export interface Friend {
    id: string;
    username: string;
    avatar: string;
    status: 'pending' | 'accepted';
    requestedByMe: boolean;
}

/**
 * @deprecated Use RoomInviteDTO from @imposter/shared
 * Will be removed in future refactor
 */
export interface RoomInvite {
    id: string;
    fromUserId: string;
    fromUsername: string;
    roomId: string;
    roomName: string;
    createdAt: string;
    expiresAt: string;
}

// ============================================
// ADAPTERS (DB row → DTO conversion)
// ============================================

/**
 * Convert DB profile row to PublicUserDTO
 */
function toPublicUserDTO(profile: { id: string; username: string; avatar?: string | null }): PublicUserDTO {
    return {
        userId: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar || null
    };
}

/**
 * Convert DB friendship row to FriendDTO (for accepted friends)
 */
export function toFriendDTO(
    row: any,
    currentUserId: string
): FriendDTO {
    const isUser = row.user_id === currentUserId;
    const friendProfile = isUser ? row.friend : row.user;

    return {
        userId: isUser ? row.friend_id : row.user_id,
        username: friendProfile?.username || 'Unknown',
        avatarUrl: friendProfile?.avatar || null,
        status: 'accepted'
    };
}

/**
 * Convert DB friendship row to FriendRequestDTO (for pending requests)
 */
export function toFriendRequestDTO(
    row: any,
    currentUserId: string
): FriendRequestDTO {
    const isIncoming = row.requested_by !== currentUserId;
    const otherProfile = row.requested_by === row.user_id ? row.user : row.friend;

    // Determine which user is "the other person"
    const otherUserId = row.requested_by === currentUserId
        ? (row.user_id === currentUserId ? row.friend_id : row.user_id)
        : row.requested_by;

    return {
        requestId: row.id,
        user: {
            userId: otherUserId,
            username: otherProfile?.username || 'Unknown',
            avatarUrl: otherProfile?.avatar || null
        },
        direction: isIncoming ? 'INCOMING' : 'OUTGOING',
        status: 'pending',
        createdAt: row.created_at || new Date().toISOString()
    };
}

// ============================================
// HELPERS
// ============================================

/**
 * Normalizes user pair to ensure user_id < friend_id invariant
 * CRITICAL: Call this at the START of every friendship operation
 */
export function normalizeUserPair(userA: string, userB: string): [string, string] {
    return userA < userB ? [userA, userB] : [userB, userA];
}

const MAX_FRIENDS = 200;

// ============================================
// FRIEND OPERATIONS
// ============================================

/**
 * Send friend request
 * Validations:
 * - Self-request blocked
 * - Max friends check
 * - Existing relationship handling
 */
export async function sendFriendRequest(
    fromId: string,
    toUsername: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    // 0. Validate UUID upfront to prevent SQL injection
    if (!isValidUserId(fromId)) {
        return { success: false, error: 'Invalid user ID' };
    }

    // 1. Find target user by username
    const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', toUsername)
        .single();

    if (userError || !targetUser) {
        // Silent fail if user not found (could be blocked or doesn't exist)
        return { success: false, error: 'User not found or not accepting requests' };
    }

    const toId = targetUser.id;

    // 2. Self-request check
    if (fromId === toId) {
        return { success: false, error: 'Cannot send friend request to yourself' };
    }

    // 3. Normalize for symmetric model
    const [userId, friendId] = normalizeUserPair(fromId, toId);

    // 4. Check existing relationship
    const { data: existing } = await supabase
        .from('friendships')
        .select('status, blocked_by')
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .single();

    if (existing) {
        if (existing.status === 'accepted') {
            return { success: false, error: 'Already friends' };
        }
        if (existing.status === 'pending') {
            return { success: false, error: 'Friend request already pending' };
        }
        if (existing.status === 'blocked') {
            // Silent fail - don't reveal block
            return { success: false, error: 'User not found or not accepting requests' };
        }
    }

    // 5. Check max friends limit for sender
    const { count: friendCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${fromId},friend_id.eq.${fromId}`)
        .eq('status', 'accepted');

    if (friendCount && friendCount >= MAX_FRIENDS) {
        return { success: false, error: 'Friend limit reached (200 max)' };
    }

    // 6. Create friendship request
    const { error: insertError } = await supabase
        .from('friendships')
        .insert({
            user_id: userId,
            friend_id: friendId,
            status: 'pending',
            requested_by: fromId,
        });

    if (insertError) {
        console.error('[FriendService] Insert error:', insertError);
        return { success: false, error: 'Failed to send request' };
    }

    console.log(`[FriendService] Friend request sent: ${fromId} -> ${toId}`);
    return { success: true };
}

/**
 * Accept friend request
 * Validation: userId !== requested_by (can't accept own request)
 */
export async function acceptFriendRequest(
    userId: string,
    requestId: string
): Promise<{ success: boolean; userIds?: [string, string]; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    // 1. Get the request
    const { data: request, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

    if (fetchError || !request) {
        return { success: false, error: 'Request not found' };
    }

    // 2. Validate: user must be the recipient, not the sender
    if (request.requested_by === userId) {
        return { success: false, error: 'Cannot accept your own request' };
    }

    // 3. Validate: user must be part of this friendship
    if (request.user_id !== userId && request.friend_id !== userId) {
        return { success: false, error: 'Not authorized' };
    }

    // 4. Accept the request
    const { error: updateError } = await supabase
        .from('friendships')
        .update({
            status: 'accepted',
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    if (updateError) {
        console.error('[FriendService] Accept error:', updateError);
        return { success: false, error: 'Failed to accept request' };
    }

    console.log(`[FriendService] Friend request accepted: ${requestId}`);
    return {
        success: true,
        userIds: [request.user_id, request.friend_id]
    };
}

/**
 * Decline friend request
 */
export async function declineFriendRequest(
    userId: string,
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    // Validate UUID to prevent SQL injection
    if (!isValidUserId(userId)) {
        return { success: false, error: 'Invalid user ID' };
    }

    // Delete the pending request (user must be recipient)
    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('status', 'pending')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .neq('requested_by', userId); // Can't decline own request

    if (error) {
        return { success: false, error: 'Failed to decline request' };
    }

    return { success: true };
}

/**
 * Remove friend (unfriend)
 */
export async function removeFriend(
    userId: string,
    friendId: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    const [uId, fId] = normalizeUserPair(userId, friendId);

    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', uId)
        .eq('friend_id', fId)
        .eq('status', 'accepted');

    if (error) {
        return { success: false, error: 'Failed to remove friend' };
    }

    return { success: true };
}

/**
 * Cancel a pending friend request that the user sent
 * Security: Only the sender (requested_by) can cancel their own request
 */
export async function cancelFriendRequest(
    userId: string,
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    // Delete pending request where user is the sender
    // .select('id') allows us to check if any row was actually deleted
    const { data, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('status', 'pending')
        .eq('requested_by', userId)  // IDOR prevention: only sender can cancel
        .select('id');

    if (error) {
        return { success: false, error: 'Failed to cancel request' };
    }

    if (!data || data.length === 0) {
        return { success: false, error: 'Request not found or already handled' };
    }

    return { success: true };
}

/**
 * Block user
 */
export async function blockUser(
    userId: string,
    targetId: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    const [uId, fId] = normalizeUserPair(userId, targetId);

    // Upsert: create blocked relationship or update existing
    const { error } = await supabase
        .from('friendships')
        .upsert({
            user_id: uId,
            friend_id: fId,
            status: 'blocked',
            blocked_by: userId,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,friend_id'
        });

    if (error) {
        return { success: false, error: 'Failed to block user' };
    }

    return { success: true };
}

/**
 * Unblock user - deletes the relationship entirely
 */
export async function unblockUser(
    userId: string,
    targetId: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    const [uId, fId] = normalizeUserPair(userId, targetId);

    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', uId)
        .eq('friend_id', fId)
        .eq('blocked_by', userId); // Only unblock if you blocked them

    if (error) {
        return { success: false, error: 'Failed to unblock user' };
    }

    return { success: true };
}

/**
 * Get friends list (DB only, online status handled by socket layer)
 */
export async function getFriends(userId: string): Promise<Friend[]> {
    if (!supabase) return [];

    // Validate UUID to prevent SQL injection
    if (!isValidUserId(userId)) return [];

    // Get all accepted friendships where user is either user_id or friend_id
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

    if (error || !data) {
        console.error('[FriendService] getFriends error:', error);
        return [];
    }

    return data.map((row: any) => {
        // Determine which profile is the friend (not the current user)
        const iAmUserId = row.user_id === userId;
        // Supabase may return joined relations as arrays
        const friendProfileRaw = iAmUserId ? row.friend : row.user;
        const friendProfile = Array.isArray(friendProfileRaw) ? friendProfileRaw[0] : friendProfileRaw;

        return {
            id: friendProfile?.id || '',
            username: friendProfile?.username || 'Unknown',
            avatar: friendProfile?.avatar || 'ghost',
            status: row.status as 'pending' | 'accepted',
            requestedByMe: row.requested_by === userId,
        };
    });
}

/**
 * Get pending friend requests (received only)
 */
export async function getPendingRequests(userId: string): Promise<Friend[]> {
    const friends = await getFriends(userId);
    return friends.filter(f => f.status === 'pending' && !f.requestedByMe);
}

// ============================================
// ROOM INVITE OPERATIONS
// ============================================

/**
 * Send room invite
 */
export async function sendRoomInvite(
    fromId: string,
    toId: string,
    roomId: string,
    roomName: string
): Promise<{ success: boolean; inviteId?: string; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    // Check if they are friends
    const [uId, fId] = normalizeUserPair(fromId, toId);
    const { data: friendship } = await supabase
        .from('friendships')
        .select('status')
        .eq('user_id', uId)
        .eq('friend_id', fId)
        .eq('status', 'accepted')
        .single();

    if (!friendship) {
        return { success: false, error: 'Can only invite friends' };
    }

    // Create invite
    const { data, error } = await supabase
        .from('room_invites')
        .insert({
            from_user_id: fromId,
            to_user_id: toId,
            room_id: roomId,
            room_name: roomName,
        })
        .select('id')
        .single();

    if (error) {
        return { success: false, error: 'Failed to send invite' };
    }

    return { success: true, inviteId: data.id };
}

/**
 * Get pending room invites (not expired)
 */
export async function getPendingInvites(userId: string): Promise<RoomInvite[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('room_invites')
        .select(`
            id,
            from_user_id,
            room_id,
            room_name,
            created_at,
            expires_at,
            sender:profiles!room_invites_from_user_id_fkey(username)
        `)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

    if (error || !data) return [];

    return data.map((row: any) => {
        const senderRaw = row.sender;
        const sender = Array.isArray(senderRaw) ? senderRaw[0] : senderRaw;
        return {
            id: row.id,
            fromUserId: row.from_user_id,
            fromUsername: sender?.username || 'Unknown',
            roomId: row.room_id,
            roomName: row.room_name,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
        };
    });
}

/**
 * Respond to room invite
 */
export async function respondToInvite(
    userId: string,
    inviteId: string,
    accept: boolean
): Promise<{ success: boolean; roomId?: string; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    const { data, error } = await supabase
        .from('room_invites')
        .update({
            status: accept ? 'accepted' : 'declined',
        })
        .eq('id', inviteId)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .select('room_id')
        .single();

    if (error) {
        return { success: false, error: 'Failed to respond to invite' };
    }

    return { success: true, roomId: accept ? data.room_id : undefined };
}
