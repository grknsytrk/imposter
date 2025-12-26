/**
 * Phase Transition Tests
 *
 * Tests the game state machine transitions.
 */
import { describe, it, expect } from 'vitest';
import { canTransition, PHASE_TRANSITIONS } from '../phase';
describe('Phase Contract', () => {
    describe('canTransition', () => {
        // Valid transitions
        it('allows LOBBY → ROLE_REVEAL', () => {
            expect(canTransition('LOBBY', 'ROLE_REVEAL')).toBe(true);
        });
        it('allows ROLE_REVEAL → HINT_ROUND', () => {
            expect(canTransition('ROLE_REVEAL', 'HINT_ROUND')).toBe(true);
        });
        it('allows HINT_ROUND → DISCUSSION', () => {
            expect(canTransition('HINT_ROUND', 'DISCUSSION')).toBe(true);
        });
        it('allows DISCUSSION → VOTING', () => {
            expect(canTransition('DISCUSSION', 'VOTING')).toBe(true);
        });
        it('allows VOTING → VOTE_RESULT', () => {
            expect(canTransition('VOTING', 'VOTE_RESULT')).toBe(true);
        });
        it('allows VOTE_RESULT → DISCUSSION (tie/continue)', () => {
            expect(canTransition('VOTE_RESULT', 'DISCUSSION')).toBe(true);
        });
        it('allows VOTE_RESULT → GAME_OVER', () => {
            expect(canTransition('VOTE_RESULT', 'GAME_OVER')).toBe(true);
        });
        it('allows GAME_OVER → LOBBY (restart)', () => {
            expect(canTransition('GAME_OVER', 'LOBBY')).toBe(true);
        });
        // Invalid transitions
        it('blocks VOTING → LOBBY', () => {
            expect(canTransition('VOTING', 'LOBBY')).toBe(false);
        });
        it('blocks VOTING → DISCUSSION', () => {
            expect(canTransition('VOTING', 'DISCUSSION')).toBe(false);
        });
        it('blocks LOBBY → VOTING', () => {
            expect(canTransition('LOBBY', 'VOTING')).toBe(false);
        });
        it('blocks DISCUSSION → GAME_OVER', () => {
            expect(canTransition('DISCUSSION', 'GAME_OVER')).toBe(false);
        });
    });
    describe('PHASE_TRANSITIONS coverage', () => {
        it('every phase has defined transitions', () => {
            const phases = [
                'LOBBY', 'ROLE_REVEAL', 'HINT_ROUND',
                'DISCUSSION', 'VOTING', 'VOTE_RESULT', 'GAME_OVER'
            ];
            phases.forEach(phase => {
                expect(PHASE_TRANSITIONS[phase]).toBeDefined();
                expect(Array.isArray(PHASE_TRANSITIONS[phase])).toBe(true);
            });
        });
    });
});
