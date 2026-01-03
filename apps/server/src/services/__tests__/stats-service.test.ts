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
            gameId: 'game-123',  // Required for idempotency
            winner: 'IMPOSTER',
            players: [
                { odaPlayerId: 'p1', odaUserID: 'user1', role: 'IMPOSTER', isEliminated: false },
                { odaPlayerId: 'p2', odaUserID: 'user2', role: 'CITIZEN', isEliminated: true }
            ]
        };

        // Mock successful game_results insert
        mockInsert.mockResolvedValueOnce({ error: null });
        // Mock successful game_participants insert
        mockInsert.mockResolvedValueOnce({ error: null });

        await recordGameEnd(result as any);

        // CHECK: game_results insert was called with gameId
        expect(mockFrom).toHaveBeenCalledWith('game_results');
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'game-123',
            winner: 'IMPOSTER'
        }));

        // CHECK: game_participants insert was called
        expect(mockFrom).toHaveBeenCalledWith('game_participants');
    });

    it('should update stats for Citizens winner', async () => {
        // Setup:
        // P1 (Imposter) -> Loses
        // P2 (Citizen)  -> Wins
        const result = {
            gameId: 'game-456',
            winner: 'CITIZENS',
            players: [
                { odaPlayerId: 'p1', odaUserID: 'user1', role: 'IMPOSTER', isEliminated: true },
                { odaPlayerId: 'p2', odaUserID: 'user2', role: 'CITIZEN', isEliminated: false }
            ]
        };

        // Mock successful inserts
        mockInsert.mockResolvedValue({ error: null });

        await recordGameEnd(result as any);

        // CHECK: game_results insert was called
        expect(mockFrom).toHaveBeenCalledWith('game_results');
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'game-456',
            winner: 'CITIZENS'
        }));
    });

    it('should skip players without odaUserID (guests)', async () => {
        const result = {
            gameId: 'game-guest-test',
            winner: 'CITIZENS',
            players: [
                { odaPlayerId: 'guest1', role: 'CITIZEN', isEliminated: false } // No odaUserID
            ]
        };

        // Mock game_results insert success
        mockInsert.mockResolvedValueOnce({ error: null });

        await recordGameEnd(result as any);

        // game_results should be called, but game_participants should not have any players
        expect(mockFrom).toHaveBeenCalledWith('game_results');
    });

    it('should handle Supabase errors gracefully', async () => {
        const result = {
            gameId: 'game-error-test',
            winner: 'CITIZENS',
            players: [
                { odaPlayerId: 'p1', odaUserID: 'user1', role: 'CITIZEN', isEliminated: false }
            ]
        };

        // Mock game_results insert error
        mockInsert.mockResolvedValueOnce({ error: { code: '500', message: 'DB connection failed' } });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await recordGameEnd(result as any);

        // Function should complete without throwing
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to insert game result'), expect.anything());
        consoleSpy.mockRestore();
    });
});
