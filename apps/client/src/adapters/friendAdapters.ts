/**
 * Friend Adapters - DB row to DTO conversion
 * 
 * Single source of truth for mapping Supabase rows to Friend types.
 * Returns null for invalid rows instead of throwing - cleaner control flow.
 * 
 * INVARIANTS:
 * - FriendDTO.userId = the OTHER person's ID (the friend)
 * - FriendRequestDTO.user = the OTHER person (sender if INCOMING, receiver if OUTGOING)
 * - avatarUrl = raw value from DB, UI handles fallback
 */

import {
    FriendDTO,
    FriendRequestDTO,
    FriendView,
    RequestDirection
} from '@imposter/shared';

// ============================================
// PURE DTO ADAPTERS (no view-state like online)
// ============================================

/**
 * Convert Supabase friendship row to FriendDTO (accepted friends only).
 * Returns null for invalid/incomplete rows.
 * 
 * @param row - Supabase joined row with user/friend profiles
 * @param myUserId - Current user's UUID
 * @returns FriendDTO or null if row is invalid
 */
export function dbRowToFriendDTO(
    row: unknown,
    myUserId: string
): FriendDTO | null {
    // Type guard
    if (!row || typeof row !== 'object') return null;

    const r = row as Record<string, unknown>;

    // Required fields check
    if (!r.id || r.status !== 'accepted') return null;

    // Determine which profile is "the other person"
    const iAmUserId = r.user_id === myUserId;

    // Supabase returns joined relations as arrays or objects
    const friendProfileRaw = iAmUserId
        ? (Array.isArray(r.friend) ? (r.friend as unknown[])[0] : r.friend)
        : (Array.isArray(r.user) ? (r.user as unknown[])[0] : r.user);

    if (!friendProfileRaw || typeof friendProfileRaw !== 'object') return null;

    const profile = friendProfileRaw as Record<string, unknown>;
    const friendUserId = profile.id;
    const username = profile.username;

    // Required profile fields
    if (!friendUserId || !username) return null;

    return {
        userId: String(friendUserId),
        username: String(username),
        avatarUrl: (profile.avatar as string) ?? null, // Raw value, UI handles fallback
        status: 'accepted'
    };
}

/**
 * Convert Supabase friendship row to FriendRequestDTO (pending requests only).
 * Returns null for invalid/incomplete rows.
 * 
 * INVARIANT: user field is ALWAYS the other party
 * - INCOMING: user = sender (the person who sent request TO me)
 * - OUTGOING: user = receiver (the person I sent request TO)
 * 
 * @param row - Supabase joined row with user/friend profiles
 * @param myUserId - Current user's UUID
 * @returns FriendRequestDTO or null if row is invalid
 */
export function dbRowToFriendRequestDTO(
    row: unknown,
    myUserId: string
): FriendRequestDTO | null {
    // Type guard
    if (!row || typeof row !== 'object') return null;

    const r = row as Record<string, unknown>;

    // Required fields check
    if (!r.id || r.status !== 'pending') return null;

    // Determine direction
    const requestedByMe = r.requested_by === myUserId;
    const direction: RequestDirection = requestedByMe ? 'OUTGOING' : 'INCOMING';

    // Determine which profile is "the other person"
    // If I'm user_id, other person is friend profile
    // If I'm friend_id, other person is user profile
    const iAmUserId = r.user_id === myUserId;

    const otherProfileRaw = iAmUserId
        ? (Array.isArray(r.friend) ? (r.friend as unknown[])[0] : r.friend)
        : (Array.isArray(r.user) ? (r.user as unknown[])[0] : r.user);

    if (!otherProfileRaw || typeof otherProfileRaw !== 'object') return null;

    const profile = otherProfileRaw as Record<string, unknown>;
    const otherUserId = profile.id;
    const username = profile.username;

    // Required profile fields
    if (!otherUserId || !username) return null;

    return {
        requestId: String(r.id),
        user: {
            userId: String(otherUserId),
            username: String(username),
            avatarUrl: (profile.avatar as string) ?? null
        },
        direction,
        status: 'pending',
        createdAt: (r.created_at as string) ?? new Date().toISOString()
    };
}

// ============================================
// VIEW MODEL ADAPTER (adds client-side state)
// ============================================

/**
 * Enrich FriendDTO with online status to create FriendView.
 * This is a CLIENT-SIDE operation, not part of wire contract.
 */
export function toFriendView(
    friend: FriendDTO,
    onlineUserIds: Set<string>
): FriendView {
    return {
        ...friend,
        online: onlineUserIds.has(friend.userId)
    };
}

// ============================================
// LEGACY ADAPTER (backward compatibility)
// ============================================

export type LegacyFriendStatus = 'pending' | 'accepted';

export interface LegacyFriend {
    id: string;                // friend userId (CONFUSING: should be userId)
    requestId: string;         // friendship row id
    username: string;
    avatar: string;
    status: LegacyFriendStatus;
    requestedByMe: boolean;
    online: boolean;
}

/**
 * @deprecated Use dbRowToFriendDTO + toFriendView or dbRowToFriendRequestDTO instead
 * Kept for backward compatibility during migration
 */
export function dbRowToLegacyFriend(
    row: unknown,
    myUserId: string,
    onlineUserIds: Set<string>
): LegacyFriend | null {
    // Type guard
    if (!row || typeof row !== 'object') return null;

    const r = row as Record<string, unknown>;

    // Required fields check
    if (!r.id || !r.status) return null;

    // Status validation
    const status = r.status as string;
    if (status !== 'pending' && status !== 'accepted') return null;

    // Determine which profile is "the other person"
    const iAmUserId = r.user_id === myUserId;
    const requestedByMe = r.requested_by === myUserId;

    // Supabase returns joined relations as arrays or objects
    const friendProfileRaw = iAmUserId
        ? (Array.isArray(r.friend) ? (r.friend as unknown[])[0] : r.friend)
        : (Array.isArray(r.user) ? (r.user as unknown[])[0] : r.user);

    if (!friendProfileRaw || typeof friendProfileRaw !== 'object') return null;

    const profile = friendProfileRaw as Record<string, unknown>;
    const friendUserId = profile.id;
    const username = profile.username;

    // Required profile fields
    if (!friendUserId || !username) return null;

    return {
        id: String(friendUserId),
        requestId: String(r.id),
        username: String(username),
        avatar: (profile.avatar as string) || 'ghost',
        status: status as LegacyFriendStatus,
        requestedByMe,
        online: onlineUserIds.has(String(friendUserId))
    };
}
