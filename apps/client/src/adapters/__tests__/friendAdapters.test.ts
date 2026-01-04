import { describe, it, expect } from 'vitest';
import {
    dbRowToLegacyFriend,
    dbRowToFriendDTO,
    dbRowToFriendRequestDTO,
    toFriendView
} from '../friendAdapters';

// ============================================
// FriendDTO TESTS (for accepted friends)
// ============================================

describe('dbRowToFriendDTO', () => {
    it('maps accepted friend correctly', () => {
        const row = {
            id: 'req-1',
            status: 'accepted',
            user_id: 'me',
            friend_id: 'user-2',
            requested_by: 'me',
            friend: { id: 'user-2', username: 'alice', avatar: 'cat' }
        };

        const result = dbRowToFriendDTO(row, 'me');

        expect(result).toMatchObject({
            userId: 'user-2',
            username: 'alice',
            avatarUrl: 'cat',
            status: 'accepted'
        });
    });

    it('returns null for pending status', () => {
        const row = {
            id: 'req-1',
            status: 'pending',
            user_id: 'me',
            friend_id: 'user-2',
            requested_by: 'me',
            friend: { id: 'user-2', username: 'alice', avatar: null }
        };

        expect(dbRowToFriendDTO(row, 'me')).toBeNull();
    });

    it('returns null for missing profile', () => {
        const row = {
            id: 'req-1',
            status: 'accepted',
            user_id: 'me',
            friend_id: 'user-2',
            friend: null
        };

        expect(dbRowToFriendDTO(row, 'me')).toBeNull();
    });

    it('handles avatarUrl as null when avatar is missing', () => {
        const row = {
            id: 'req-1',
            status: 'accepted',
            user_id: 'me',
            friend_id: 'user-2',
            friend: { id: 'user-2', username: 'alice' }
        };

        const result = dbRowToFriendDTO(row, 'me');
        expect(result?.avatarUrl).toBeNull();
    });
});

// ============================================
// FriendRequestDTO TESTS (for pending requests)
// ============================================

describe('dbRowToFriendRequestDTO', () => {
    it('maps INCOMING request (someone sent to me)', () => {
        const row = {
            id: 'req-1',
            status: 'pending',
            user_id: 'sender',
            friend_id: 'me',
            requested_by: 'sender',
            created_at: '2024-01-01T00:00:00Z',
            user: { id: 'sender', username: 'bob', avatar: 'dog' }
        };

        const result = dbRowToFriendRequestDTO(row, 'me');

        expect(result).toMatchObject({
            requestId: 'req-1',
            direction: 'INCOMING',
            status: 'pending',
            user: {
                userId: 'sender',
                username: 'bob',
                avatarUrl: 'dog'
            }
        });
    });

    it('maps OUTGOING request (I sent to someone)', () => {
        const row = {
            id: 'req-2',
            status: 'pending',
            user_id: 'me',
            friend_id: 'receiver',
            requested_by: 'me',
            created_at: '2024-01-01T00:00:00Z',
            friend: { id: 'receiver', username: 'charlie', avatar: null }
        };

        const result = dbRowToFriendRequestDTO(row, 'me');

        expect(result).toMatchObject({
            requestId: 'req-2',
            direction: 'OUTGOING',
            status: 'pending',
            user: {
                userId: 'receiver',
                username: 'charlie',
                avatarUrl: null
            }
        });
    });

    it('returns null for accepted status', () => {
        const row = {
            id: 'req-1',
            status: 'accepted',
            user_id: 'me',
            friend_id: 'user-2',
            requested_by: 'me',
            friend: { id: 'user-2', username: 'alice', avatar: null }
        };

        expect(dbRowToFriendRequestDTO(row, 'me')).toBeNull();
    });

    it('handles profile as array (Supabase join)', () => {
        const row = {
            id: 'req-1',
            status: 'pending',
            user_id: 'sender',
            friend_id: 'me',
            requested_by: 'sender',
            user: [{ id: 'sender', username: 'dave', avatar: null }]
        };

        const result = dbRowToFriendRequestDTO(row, 'me');
        expect(result?.user.userId).toBe('sender');
    });

    it('invariant: user is always the OTHER party', () => {
        // If I'm friend_id and sender is user_id, user should be sender
        const incomingRow = {
            id: 'req-1',
            status: 'pending',
            user_id: 'other-person',
            friend_id: 'me',
            requested_by: 'other-person',
            user: { id: 'other-person', username: 'sender', avatar: null }
        };

        const incoming = dbRowToFriendRequestDTO(incomingRow, 'me');
        expect(incoming?.user.userId).toBe('other-person');
        expect(incoming?.direction).toBe('INCOMING');

        // If I'm user_id and receiver is friend_id, user should be receiver
        const outgoingRow = {
            id: 'req-2',
            status: 'pending',
            user_id: 'me',
            friend_id: 'other-person',
            requested_by: 'me',
            friend: { id: 'other-person', username: 'receiver', avatar: null }
        };

        const outgoing = dbRowToFriendRequestDTO(outgoingRow, 'me');
        expect(outgoing?.user.userId).toBe('other-person');
        expect(outgoing?.direction).toBe('OUTGOING');
    });
});

// ============================================
// toFriendView TESTS (adds online status)
// ============================================

describe('toFriendView', () => {
    it('adds online: true when in online set', () => {
        const friendDTO = {
            userId: 'user-1',
            username: 'alice',
            avatarUrl: null,
            status: 'accepted' as const
        };

        const result = toFriendView(friendDTO, new Set(['user-1']));
        expect(result.online).toBe(true);
    });

    it('adds online: false when not in online set', () => {
        const friendDTO = {
            userId: 'user-1',
            username: 'alice',
            avatarUrl: null,
            status: 'accepted' as const
        };

        const result = toFriendView(friendDTO, new Set());
        expect(result.online).toBe(false);
    });
});

// ============================================
// LEGACY ADAPTER TESTS (backward compat)
// ============================================

describe('dbRowToLegacyFriend', () => {
    const emptyOnlineSet = new Set<string>();
    const onlineSet = new Set(['user-2']);

    it('maps accepted friend correctly', () => {
        const row = {
            id: 'req-1',
            status: 'accepted',
            user_id: 'me',
            friend_id: 'user-2',
            requested_by: 'me',
            friend: { id: 'user-2', username: 'alice', avatar: 'cat' }
        };

        const result = dbRowToLegacyFriend(row, 'me', onlineSet);

        expect(result).toMatchObject({
            id: 'user-2',
            requestId: 'req-1',
            username: 'alice',
            avatar: 'cat',
            status: 'accepted',
            requestedByMe: true,
            online: true
        });
    });

    it('maps pending request with requestedByMe true', () => {
        const row = {
            id: 'req-2',
            status: 'pending',
            user_id: 'me',
            friend_id: 'user-3',
            requested_by: 'me',
            friend: { id: 'user-3', username: 'bob', avatar: null }
        };

        const result = dbRowToLegacyFriend(row, 'me', emptyOnlineSet);

        expect(result).toMatchObject({
            id: 'user-3',
            requestId: 'req-2',
            status: 'pending',
            requestedByMe: true,
            online: false,
            avatar: 'ghost'
        });
    });

    it('returns null for missing profile', () => {
        const row = {
            id: 'req-5',
            status: 'pending',
            user_id: 'me',
            friend_id: 'user-6',
            requested_by: 'me',
            friend: null
        };

        expect(dbRowToLegacyFriend(row, 'me', emptyOnlineSet)).toBeNull();
    });

    it('returns null for unknown status', () => {
        const row = {
            id: 'req-6',
            status: 'blocked',
            user_id: 'me',
            friend_id: 'user-7',
            requested_by: 'me',
            friend: { id: 'user-7', username: 'eve', avatar: null }
        };

        expect(dbRowToLegacyFriend(row, 'me', emptyOnlineSet)).toBeNull();
    });

    it('returns null for null row', () => {
        expect(dbRowToLegacyFriend(null, 'me', emptyOnlineSet)).toBeNull();
    });
});
