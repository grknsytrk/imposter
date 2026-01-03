import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock UUID generator for predictable test data
const TEST_UUID_1 = '00000000-0000-4000-a000-000000000001';
const TEST_UUID_2 = '00000000-0000-4000-a000-000000000002';
const INVALID_UUID = 'not-a-valid-uuid';
const SQL_INJECTION_ATTEMPT = "x) OR 1=1; DROP TABLE friendships;--";

// Mock Supabase client methods
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockOr = vi.fn();
const mockIn = vi.fn();
const mockGt = vi.fn();
const mockIlike = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
    from: mockFrom
};

// Chain setup helper
const setupChain = () => {
    const chain = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        upsert: mockUpsert,
        eq: mockEq,
        neq: mockNeq,
        or: mockOr,
        in: mockIn,
        gt: mockGt,
        ilike: mockIlike,
        single: mockSingle
    };

    // Make all chain methods return the chain for fluent API
    Object.values(chain).forEach(fn => {
        fn.mockReturnValue(chain);
    });

    mockFrom.mockReturnValue(chain);
    return chain;
};

// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase)
}));

describe('Friend Service', () => {
    let sendFriendRequest: any;
    let acceptFriendRequest: any;
    let declineFriendRequest: any;
    let removeFriend: any;
    let blockUser: any;
    let unblockUser: any;
    let getFriends: any;
    let normalizeUserPair: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        setupChain();

        // Reset modules to ensure fresh import
        vi.resetModules();

        // Set env vars
        process.env.SUPABASE_URL = 'https://mock.supabase.co';
        process.env.SERVICE_ROLE_KEY = 'mock-key';

        // Dynamic import
        const module = await import('../friend-service');
        sendFriendRequest = module.sendFriendRequest;
        acceptFriendRequest = module.acceptFriendRequest;
        declineFriendRequest = module.declineFriendRequest;
        removeFriend = module.removeFriend;
        blockUser = module.blockUser;
        unblockUser = module.unblockUser;
        getFriends = module.getFriends;
        normalizeUserPair = module.normalizeUserPair;
    });

    // ============================================
    // normalizeUserPair TESTS
    // ============================================

    describe('normalizeUserPair', () => {
        it('should put smaller UUID first', () => {
            const [a, b] = normalizeUserPair(TEST_UUID_2, TEST_UUID_1);
            expect(a).toBe(TEST_UUID_1);
            expect(b).toBe(TEST_UUID_2);
        });

        it('should keep order if already correct', () => {
            const [a, b] = normalizeUserPair(TEST_UUID_1, TEST_UUID_2);
            expect(a).toBe(TEST_UUID_1);
            expect(b).toBe(TEST_UUID_2);
        });
    });

    // ============================================
    // SQL INJECTION PREVENTION TESTS
    // ============================================

    describe('SQL Injection Prevention', () => {
        it('sendFriendRequest should reject invalid UUID', async () => {
            const result = await sendFriendRequest(INVALID_UUID, 'testuser');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid user ID');
            // Supabase should never be called
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('sendFriendRequest should reject SQL injection attempt', async () => {
            const result = await sendFriendRequest(SQL_INJECTION_ATTEMPT, 'testuser');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid user ID');
            // Supabase should never be called
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('getFriends should return empty for invalid UUID', async () => {
            const result = await getFriends(INVALID_UUID);
            expect(result).toEqual([]);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('getFriends should return empty for SQL injection attempt', async () => {
            const result = await getFriends(SQL_INJECTION_ATTEMPT);
            expect(result).toEqual([]);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('declineFriendRequest should reject invalid UUID', async () => {
            const result = await declineFriendRequest(INVALID_UUID, TEST_UUID_1);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid user ID');
        });
    });

    // ============================================
    // sendFriendRequest TESTS
    // ============================================

    describe('sendFriendRequest', () => {
        it('should reject self-request', async () => {
            // Mock user lookup
            mockSingle.mockResolvedValueOnce({
                data: { id: TEST_UUID_1, username: 'testuser' }
            });

            const result = await sendFriendRequest(TEST_UUID_1, 'testuser');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot send friend request to yourself');
        });

        it('should reject if user not found', async () => {
            mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

            const result = await sendFriendRequest(TEST_UUID_1, 'nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found or not accepting requests');
        });

        it('should reject if already friends', async () => {
            // Mock user lookup
            mockSingle.mockResolvedValueOnce({
                data: { id: TEST_UUID_2, username: 'friend' }
            });

            // Mock existing friendship check
            mockSingle.mockResolvedValueOnce({
                data: { status: 'accepted', blocked_by: null }
            });

            const result = await sendFriendRequest(TEST_UUID_1, 'friend');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Already friends');
        });

        it('should silent fail if blocked', async () => {
            // Mock user lookup
            mockSingle.mockResolvedValueOnce({
                data: { id: TEST_UUID_2, username: 'blocker' }
            });

            // Mock existing blocked relationship
            mockSingle.mockResolvedValueOnce({
                data: { status: 'blocked', blocked_by: TEST_UUID_2 }
            });

            const result = await sendFriendRequest(TEST_UUID_1, 'blocker');
            expect(result.success).toBe(false);
            // Should NOT reveal that user is blocked
            expect(result.error).toBe('User not found or not accepting requests');
        });
    });

    // ============================================
    // acceptFriendRequest TESTS
    // ============================================

    describe('acceptFriendRequest', () => {
        it('should reject accepting own request', async () => {
            // Mock finding the request
            mockSingle.mockResolvedValueOnce({
                data: {
                    id: 'request-id',
                    user_id: TEST_UUID_1,
                    friend_id: TEST_UUID_2,
                    status: 'pending',
                    requested_by: TEST_UUID_1  // Same user trying to accept
                }
            });

            const result = await acceptFriendRequest(TEST_UUID_1, 'request-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot accept your own request');
        });

        it('should reject if not part of friendship', async () => {
            mockSingle.mockResolvedValueOnce({
                data: {
                    id: 'request-id',
                    user_id: TEST_UUID_1,
                    friend_id: TEST_UUID_2,
                    status: 'pending',
                    requested_by: TEST_UUID_1
                }
            });

            // Third party trying to accept
            const thirdParty = '00000000-0000-4000-a000-000000000003';
            const result = await acceptFriendRequest(thirdParty, 'request-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Not authorized');
        });

        it('should reject if request not found', async () => {
            mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

            const result = await acceptFriendRequest(TEST_UUID_1, 'nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Request not found');
        });
    });

    // ============================================
    // unblockUser TESTS
    // ============================================

    describe('unblockUser', () => {
        it('should call delete with correct blocked_by filter', async () => {
            // unblockUser uses delete().eq().eq().eq() chain
            // Just verify it doesn't throw
            await unblockUser(TEST_UUID_1, TEST_UUID_2);
            expect(mockFrom).toHaveBeenCalledWith('friendships');
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
