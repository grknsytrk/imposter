/**
 * Phase Reducer Tests
 * 
 * Tests for the pure phase transition logic.
 */

import { describe, it, expect } from 'vitest';
import { applyPhaseTransition, getPhaseDuration, getNextPhase } from '../phase-reducer';
import { GameState, GAME_CONFIG } from '@imposter/shared';

// Helper to create mock game state
function createMockGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'LOBBY',
        category: 'Animals',
        word: 'Dog',
        imposterId: 'player2',
        currentTurnIndex: 0,
        turnOrder: ['player1', 'player2', 'player3'],
        turnTimeLeft: 30,
        phaseTimeLeft: 0,
        roundNumber: 1,
        votes: {},
        hints: {},
        gameMode: 'CLASSIC',
        ...overrides
    };
}

describe('Phase Reducer', () => {
    describe('getPhaseDuration', () => {
        it('returns correct duration for ROLE_REVEAL', () => {
            expect(getPhaseDuration('ROLE_REVEAL')).toBe(GAME_CONFIG.ROLE_REVEAL_TIME);
        });

        it('returns correct duration for VOTING', () => {
            expect(getPhaseDuration('VOTING')).toBe(GAME_CONFIG.VOTING_TIME);
        });

        it('returns correct duration for DISCUSSION', () => {
            expect(getPhaseDuration('DISCUSSION')).toBe(GAME_CONFIG.DISCUSSION_TIME);
        });

        it('returns 0 for LOBBY and GAME_OVER', () => {
            expect(getPhaseDuration('LOBBY')).toBe(0);
            expect(getPhaseDuration('GAME_OVER')).toBe(0);
        });
    });

    describe('applyPhaseTransition', () => {
        it('transitions LOBBY → ROLE_REVEAL', () => {
            const state = createMockGameState({ phase: 'LOBBY' });
            const result = applyPhaseTransition(state, 'ROLE_REVEAL');

            expect(result.ok).toBe(true);
            expect(result.state.phase).toBe('ROLE_REVEAL');
            expect(result.state.phaseTimeLeft).toBe(GAME_CONFIG.ROLE_REVEAL_TIME);
        });

        it('transitions to VOTING and resets votes', () => {
            const state = createMockGameState({
                phase: 'DISCUSSION',
                votes: { 'player1': 'player2' } // Existing votes
            });
            const result = applyPhaseTransition(state, 'VOTING');

            expect(result.ok).toBe(true);
            expect(result.state.phase).toBe('VOTING');
            expect(result.state.votes).toEqual({}); // Votes reset
            expect(result.state.phaseTimeLeft).toBe(GAME_CONFIG.VOTING_TIME);
        });

        it('transitions to HINT_ROUND and resets turn index', () => {
            const state = createMockGameState({
                phase: 'ROLE_REVEAL',
                currentTurnIndex: 5
            });
            const result = applyPhaseTransition(state, 'HINT_ROUND');

            expect(result.ok).toBe(true);
            expect(result.state.phase).toBe('HINT_ROUND');
            expect(result.state.currentTurnIndex).toBe(0); // Reset
            expect(result.state.turnTimeLeft).toBe(GAME_CONFIG.HINT_TURN_TIME);
        });

        it('rejects invalid transition VOTING → LOBBY', () => {
            const state = createMockGameState({ phase: 'VOTING' });
            const result = applyPhaseTransition(state, 'LOBBY');

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('INVALID_TRANSITION');
            }
            expect(result.state).toBe(state); // Original state unchanged
        });

        it('rejects invalid transition DISCUSSION → GAME_OVER', () => {
            const state = createMockGameState({ phase: 'DISCUSSION' });
            const result = applyPhaseTransition(state, 'GAME_OVER');

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('INVALID_TRANSITION');
            }
        });

        it('does not mutate original state', () => {
            const state = createMockGameState({ phase: 'DISCUSSION' });
            const originalPhase = state.phase;

            applyPhaseTransition(state, 'VOTING');

            expect(state.phase).toBe(originalPhase); // Original unchanged
        });

        it('preserves existing state fields', () => {
            const state = createMockGameState({
                phase: 'DISCUSSION',
                category: 'Movies',
                word: 'Batman',
                imposterId: 'player3',
                roundNumber: 2,
                hints: { 'player1': ['hint1'] }
            });
            const result = applyPhaseTransition(state, 'VOTING');

            expect(result.ok).toBe(true);
            expect(result.state.category).toBe('Movies');
            expect(result.state.word).toBe('Batman');
            expect(result.state.imposterId).toBe('player3');
            expect(result.state.roundNumber).toBe(2);
            expect(result.state.hints).toEqual({ 'player1': ['hint1'] });
        });
    });

    describe('getNextPhase', () => {
        it('returns correct next phase for linear progression', () => {
            expect(getNextPhase('ROLE_REVEAL')).toBe('HINT_ROUND');
            expect(getNextPhase('HINT_ROUND')).toBe('DISCUSSION');
            expect(getNextPhase('DISCUSSION')).toBe('VOTING');
            expect(getNextPhase('VOTING')).toBe('VOTE_RESULT');
        });

        it('returns null for phases requiring decision logic', () => {
            expect(getNextPhase('VOTE_RESULT')).toBeNull();
            expect(getNextPhase('GAME_OVER')).toBeNull();
        });
    });
});
