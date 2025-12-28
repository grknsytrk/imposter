// Unit tests for Vote Engine Core
// These tests run WITHOUT socket or database dependencies

import { describe, it, expect } from 'vitest';
import { handleVote } from '../core';
import { validateVote } from '../validators';
import { applyVote } from '../reducers';
import { Room, GameState, Player } from '@imposter/shared';

// ==================== TEST HELPERS ====================

function createMockPlayer(id: string, isEliminated = false): Player {
    return {
        id,
        name: `Player ${id}`,
        avatar: 'ghost',
        isReady: true,
        isEliminated
    };
}

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'VOTING',
        category: 'Animals',
        word: 'Lion',
        imposterId: 'p3',
        currentTurnIndex: 0,
        turnOrder: ['p1', 'p2', 'p3'],
        turnTimeLeft: 20,
        phaseTimeLeft: 30,
        roundNumber: 1,
        votes: {},
        hints: {},
        gameMode: 'CLASSIC',
        ...overrides
    };
}

function createMockRoom(gameStateOverrides: Partial<GameState> = {}): Room {
    return {
        id: 'room1',
        name: 'Test Room',
        players: [
            createMockPlayer('p1'),
            createMockPlayer('p2'),
            createMockPlayer('p3'),
            createMockPlayer('p4', true) // eliminated
        ],
        maxPlayers: 8,
        ownerId: 'p1',
        status: 'PLAYING',
        gameState: createMockGameState(gameStateOverrides)
    };
}

// ==================== TESTS ====================

describe('handleVote', () => {
    it('rejects self-vote', () => {
        const room = createMockRoom();

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p1'
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('CANNOT_VOTE_SELF');
        }
    });

    it('allows vote overwrite (last-write-wins)', () => {
        const room = createMockRoom({ votes: { 'p1': 'p2' } });

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p3'
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.nextVotes['p1']).toBe('p3');
        }
    });

    it('should not duplicate votes on overwrite', () => {
        const room = createMockRoom({ votes: { 'p1': 'p2' } });

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p3'
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(Object.keys(result.nextVotes)).toHaveLength(1);
        }
    });

    it('accepts valid vote', () => {
        const room = createMockRoom();

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p2'
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.nextVotes).toEqual({ 'p1': 'p2' });
        }
    });

    it('rejects vote for eliminated player', () => {
        const room = createMockRoom();

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p4' // eliminated
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('INVALID_TARGET');
        }
    });

    it('rejects vote in wrong phase', () => {
        const room = createMockRoom({ phase: 'HINT_ROUND' });

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p2'
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('WRONG_PHASE');
        }
    });

    it('records vote correctly for display (hasVoted check)', () => {
        const room = createMockRoom();

        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p2'
        });

        expect(result.success).toBe(true);
        if (result.success) {
            // After voting, p1 should have a vote recorded
            expect(result.nextVotes['p1']).toBeDefined();
            expect(result.nextVotes['p1']).toBe('p2');

            // This is what the client checks for "hasVoted" display
            const hasVoted = !!result.nextVotes['p1'];
            expect(hasVoted).toBe(true);
        }
    });

    it('allows vote change before phase ends (last-write-wins)', () => {
        const room = createMockRoom({ votes: { 'p1': 'p2' } });

        // First vote was p2, now change to p3
        const result = handleVote(room, {
            type: 'SUBMIT_VOTE',
            playerId: 'p1',
            targetId: 'p3'
        });

        expect(result.success).toBe(true);
        if (result.success) {
            // Vote should be updated to p3
            expect(result.nextVotes['p1']).toBe('p3');
            // Old vote should not exist
            expect(Object.values(result.nextVotes).filter(v => v === 'p2').length).toBe(0);
        }
    });
});

describe('applyVote', () => {
    it('returns immutable new votes object', () => {
        const state = createMockGameState({ votes: { 'p1': 'p2' } });
        const originalVotes = state.votes;

        const nextVotes = applyVote(state, {
            type: 'SUBMIT_VOTE',
            playerId: 'p3',
            targetId: 'p1'
        });

        // Original should be unchanged
        expect(originalVotes).toEqual({ 'p1': 'p2' });

        // New votes should have both
        expect(nextVotes).toEqual({ 'p1': 'p2', 'p3': 'p1' });
    });
});

// ==================== CALCULATE ELIMINATED TESTS ====================

import { calculateEliminated } from '../../game';

describe('calculateEliminated', () => {
    it('returns player with most votes', () => {
        const votes = { 'p1': 'p3', 'p2': 'p3', 'p3': 'p1' };
        expect(calculateEliminated(votes)).toBe('p3');
    });

    it('returns null for empty votes', () => {
        expect(calculateEliminated({})).toBe(null);
    });

    it('returns null for tie (beraberlik)', () => {
        // p1 ve p2 eşit oy -> beraberlik -> null
        const votes = { 'p1': 'p2', 'p2': 'p1' };
        expect(calculateEliminated(votes)).toBe(null);
    });

    it('returns winner when no tie', () => {
        // p3: 2 oy, p2: 1 oy -> p3 kazanır
        const votes = { 'p1': 'p3', 'p2': 'p3', 'p3': 'p2' };
        expect(calculateEliminated(votes)).toBe('p3');
    });
});
