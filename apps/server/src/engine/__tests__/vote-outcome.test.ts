/**
 * Vote Outcome Invariant Tests
 * 
 * Tests for calculateVoteOutcome pure function.
 */

import { describe, it, expect } from 'vitest';
import { calculateVoteOutcome, VoteOutcome } from '../vote-outcome';

describe('calculateVoteOutcome', () => {
    const alivePlayers = ['p1', 'p2', 'p3'];

    describe('basic functionality', () => {
        it('returns clear winner when one player has most votes', () => {
            const votes = { 'p1': 'p2', 'p3': 'p2' }; // 2 votes for p2
            const result = calculateVoteOutcome(votes, alivePlayers);
            expect(result.eliminatedId).toBe('p2');
            expect(result.isTie).toBe(false);
        });

        it('returns tie when votes are equal', () => {
            const votes = { 'p1': 'p2', 'p2': 'p1' }; // 1 each
            const result = calculateVoteOutcome(votes, alivePlayers);
            expect(result.eliminatedId).toBeNull();
            expect(result.isTie).toBe(true);
        });

        it('handles single vote correctly', () => {
            const votes = { 'p1': 'p2' };
            const result = calculateVoteOutcome(votes, alivePlayers);
            expect(result.eliminatedId).toBe('p2');
            expect(result.isTie).toBe(false);
        });
    });

    describe('invariants', () => {
        it('empty votes returns tie', () => {
            const result = calculateVoteOutcome({}, alivePlayers);
            expect(result.eliminatedId).toBeNull();
            expect(result.isTie).toBe(true);
        });

        it('eliminated must be in alive players', () => {
            const votes = { 'p1': 'dead_player', 'p2': 'dead_player' };
            const result = calculateVoteOutcome(votes, alivePlayers);
            // dead_player not in alivePlayers, must return null
            expect(result.eliminatedId).toBeNull();
            expect(result.isTie).toBe(true);
        });

        it('is deterministic - same input same output', () => {
            const votes = { 'p1': 'p2', 'p3': 'p2' };
            const r1 = calculateVoteOutcome(votes, alivePlayers);
            const r2 = calculateVoteOutcome(votes, alivePlayers);
            expect(r1).toEqual(r2);
        });

        it('referentially transparent - no external dependencies', () => {
            // Same call multiple times in sequence must return identical results
            const votes = { 'p1': 'p2', 'p2': 'p3', 'p3': 'p2' };
            const results = Array(5).fill(null).map(() =>
                calculateVoteOutcome(votes, alivePlayers)
            );
            // All results must be identical
            results.forEach(r => expect(r).toEqual(results[0]));
        });

        it('exactly one eliminated OR none', () => {
            const votes = { 'p1': 'p2', 'p2': 'p3', 'p3': 'p2' };
            const result = calculateVoteOutcome(votes, alivePlayers);
            // Can only be one or null
            if (result.eliminatedId !== null) {
                expect(typeof result.eliminatedId).toBe('string');
            }
        });
    });
});
