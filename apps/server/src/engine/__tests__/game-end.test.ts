/**
 * Game End Invariant Tests
 */

import { describe, it, expect } from 'vitest';
import { checkGameEndPure, GameEndResult } from '../game-end';
import { Player, GameState } from '@imposter/shared';

function createMockPlayers(): Player[] {
    return [
        { id: 'p1', name: 'Alice', avatar: 'a', isReady: true, role: 'CITIZEN' },
        { id: 'p2', name: 'Bob', avatar: 'b', isReady: true, role: 'IMPOSTER' },
        { id: 'p3', name: 'Charlie', avatar: 'c', isReady: true, role: 'CITIZEN' }
    ];
}

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'VOTE_RESULT',
        category: 'Test',
        word: 'test',
        imposterId: 'p2',
        currentTurnIndex: 0,
        turnOrder: ['p1', 'p2', 'p3'],
        turnTimeLeft: 30,
        phaseTimeLeft: 30,
        roundNumber: 1,
        votes: {},
        hints: {},
        gameMode: 'CLASSIC',
        ...overrides
    };
}

describe('checkGameEndPure', () => {
    describe('win conditions', () => {
        it('citizens win when imposter eliminated', () => {
            const players = createMockPlayers();
            players[1].isEliminated = true; // p2 is imposter
            const result = checkGameEndPure(players, createMockGameState());
            expect(result.isGameOver).toBe(true);
            expect(result.winner).toBe('CITIZENS');
        });

        it('imposter wins when only 1 citizen left', () => {
            const players = createMockPlayers();
            players[0].isEliminated = true; // p1 eliminated
            // Now p3 is only citizen
            const result = checkGameEndPure(players, createMockGameState());
            expect(result.isGameOver).toBe(true);
            expect(result.winner).toBe('IMPOSTER');
        });

        it('game continues when multiple citizens alive', () => {
            const players = createMockPlayers();
            const result = checkGameEndPure(players, createMockGameState());
            expect(result.isGameOver).toBe(false);
            expect(result.winner).toBeNull();
        });
    });

    describe('invariants', () => {
        it('idempotent - already won returns same winner', () => {
            const players = createMockPlayers();
            const state = createMockGameState({ winner: 'CITIZENS' });
            const r1 = checkGameEndPure(players, state);
            const r2 = checkGameEndPure(players, state);
            expect(r1).toEqual(r2);
            expect(r1.winner).toBe('CITIZENS');
        });

        it('deterministic - same input same output', () => {
            const players = createMockPlayers();
            const state = createMockGameState();
            const r1 = checkGameEndPure(players, state);
            const r2 = checkGameEndPure(players, state);
            expect(r1).toEqual(r2);
        });

        it('does not interpret phase - same result regardless of phase', () => {
            const players = createMockPlayers();
            players[1].isEliminated = true; // imposter eliminated

            // Same result regardless of phase
            const phases = ['VOTING', 'VOTE_RESULT', 'DISCUSSION'] as const;
            const results = phases.map(phase =>
                checkGameEndPure(players, createMockGameState({ phase }))
            );

            // All should return same winner
            results.forEach(r => {
                expect(r.winner).toBe('CITIZENS');
            });
        });

        it('does not interpret votes - result independent of vote data', () => {
            const players = createMockPlayers();
            players[1].isEliminated = true; // imposter eliminated

            // Same result regardless of votes content
            const state1 = createMockGameState({ votes: {} });
            const state2 = createMockGameState({ votes: { 'p1': 'p2' } });

            expect(checkGameEndPure(players, state1)).toEqual(
                checkGameEndPure(players, state2)
            );
        });
    });
});
