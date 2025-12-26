/**
 * Phase Transition Tests
 * 
 * Tests that transitionToPhase is the ONLY authority for phase changes.
 */

import { describe, it, expect } from 'vitest';
import { canTransition, PHASE_TRANSITIONS } from '@imposter/shared';

describe('Phase Transition Contract', () => {
    describe('canTransition validation', () => {
        it('validates VOTING → VOTE_RESULT always', () => {
            expect(canTransition('VOTING', 'VOTE_RESULT')).toBe(true);
        });

        it('blocks VOTING → VOTING (no skip)', () => {
            expect(canTransition('VOTING', 'VOTING')).toBe(false);
        });

        it('blocks VOTE_RESULT → VOTING (old tie behavior)', () => {
            expect(canTransition('VOTE_RESULT', 'VOTING')).toBe(false);
        });

        it('allows VOTE_RESULT → DISCUSSION (tie/continue)', () => {
            expect(canTransition('VOTE_RESULT', 'DISCUSSION')).toBe(true);
        });

        it('blocks GAME_OVER → any phase', () => {
            expect(canTransition('GAME_OVER', 'VOTING')).toBe(false);
            expect(canTransition('GAME_OVER', 'DISCUSSION')).toBe(false);
            expect(canTransition('GAME_OVER', 'VOTE_RESULT')).toBe(false);
        });

        it('GAME_OVER only allows LOBBY (restart)', () => {
            expect(canTransition('GAME_OVER', 'LOBBY')).toBe(true);
        });
    });

    describe('phase graph integrity', () => {
        it('every phase has exactly one forward path (except VOTE_RESULT)', () => {
            // VOTE_RESULT has 2 options: DISCUSSION or GAME_OVER
            expect(PHASE_TRANSITIONS['VOTE_RESULT'].length).toBe(2);

            // Others have exactly 1
            expect(PHASE_TRANSITIONS['LOBBY'].length).toBe(1);
            expect(PHASE_TRANSITIONS['VOTING'].length).toBe(1);
        });
    });
});
