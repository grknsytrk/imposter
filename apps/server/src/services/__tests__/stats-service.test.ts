import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client methods
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc
};

// Chain setup helper
const setupChain = () => {
    mockFrom.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
};

// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase)
}));

describe('Stats Service', () => {
    let recordGameEnd: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        setupChain();
        mockRpc.mockResolvedValue({ data: null, error: null });

        // Reset modules to ensure fresh import with env vars
        vi.resetModules();

        // Set env vars
        process.env.SUPABASE_URL = 'https://mock.supabase.co';
        // Test with the variable name user actually has in Railway
        process.env.SERVICE_ROLE_KEY = 'mock-key';
        delete process.env.SUPABASE_SERVICE_KEY;

        // Dynamic import to ensure env vars are read
        const module = await import('../stats-service');
        recordGameEnd = module.recordGameEnd;
    });

    it('should update stats for Imposter winner', async () => {
        // Setup scenarios: 
        // P1 (Imposter) -> Wins
        // P2 (Citizen)  -> Loses
        const result = {
            winner: 'IMPOSTER',
            players: [
                { odaPlayerId: 'p1', odaUserID: 'user1', role: 'IMPOSTER', isEliminated: false },
                { odaPlayerId: 'p2', odaUserID: 'user2', role: 'CITIZEN', isEliminated: true }
            ]
        };

        // Mock getting existing stats (user1 exists)
        mockSingle.mockResolvedValueOnce({
            data: {
                games_played: 10,
                games_won: 5,
                imposter_games: 2,
                imposter_wins: 1,
                citizen_games: 8,
                citizen_wins: 4
            }
        });

        // Mock getting stats for user2 (does not exist - null)
        mockSingle.mockResolvedValueOnce({ data: null });

        await recordGameEnd(result as any);

        // CHECK USER 1 (Imposter, Winner, Existing)
        // Should update
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            games_played: 11,      // +1
            games_won: 6,          // +1 (Won)
            imposter_games: 3,     // +1
            imposter_wins: 2,      // +1 (Won)
            citizen_games: 8,      // +0
            citizen_wins: 4        // +0
        }));

        // CHECK USER 2 (Citizen, Loser, New)
        // Should insert
        expect(mockInsert).toHaveBeenCalledWith({
            id: 'user2',
            games_played: 1,
            games_won: 0,          // Lost
            imposter_games: 0,
            imposter_wins: 0,
            citizen_games: 1,      // +1
            citizen_wins: 0
        });
    });

    it('should update stats for Citizens winner', async () => {
        // Setup:
        // P1 (Imposter) -> Loses
        // P2 (Citizen)  -> Wins
        const result = {
            winner: 'CITIZENS',
            players: [
                { odaPlayerId: 'p1', odaUserID: 'user1', role: 'IMPOSTER', isEliminated: true },
                { odaPlayerId: 'p2', odaUserID: 'user2', role: 'CITIZEN', isEliminated: false }
            ]
        };

        // Assume both new users
        mockSingle.mockResolvedValue({ data: null });

        await recordGameEnd(result as any);

        // CHECK USER 1 (Imposter, Loser)
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'user1',
            games_won: 0,
            imposter_games: 1,
            imposter_wins: 0
        }));

        // CHECK USER 2 (Citizen, Winner)
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'user2',
            games_won: 1,
            citizen_games: 1,
            citizen_wins: 1
        }));
    });

    it('should skip players without odaUserID (guests)', async () => {
        const result = {
            winner: 'CITIZENS',
            players: [
                { odaPlayerId: 'guest1', role: 'CITIZEN', isEliminated: false } // No odaUserID
            ]
        };

        await recordGameEnd(result as any);

        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle Supabase errors gracefully', async () => {
        const result = {
            winner: 'CITIZENS',
            players: [
                { odaPlayerId: 'p1', odaUserID: 'user1', role: 'CITIZEN', isEliminated: false }
            ]
        };

        // Mock error
        mockSingle.mockRejectedValue(new Error('DB connection failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await recordGameEnd(result as any);

        // Function should complete without throwing
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to update stats'), expect.any(Error));
        consoleSpy.mockRestore();
    });
});
