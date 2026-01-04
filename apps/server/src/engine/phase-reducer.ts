/**
 * Phase Reducer - Pure State Transitions
 * 
 * This module handles all GameState updates for phase transitions.
 * It is intentionally pure: no I/O, no mutations, no side effects.
 * 
 * Timer scheduling and player mutations stay in game.ts (imperative shell).
 */

import { GameState, GamePhase, GAME_CONFIG, canTransition } from '@imposter/shared';

// ==================== TYPES ====================

export type PhaseTransitionResult =
    | { ok: true; state: GameState }
    | { ok: false; error: 'INVALID_TRANSITION' | 'NO_GAME_STATE'; state: GameState };

// ==================== HELPERS ====================

/**
 * Get the duration (in seconds) for a given phase.
 * Single source of truth for phase timing.
 */
export function getPhaseDuration(phase: GamePhase): number {
    switch (phase) {
        case 'ROLE_REVEAL':
            return GAME_CONFIG.ROLE_REVEAL_TIME;
        case 'HINT_ROUND':
            return GAME_CONFIG.HINT_TURN_TIME;
        case 'DISCUSSION':
            return GAME_CONFIG.DISCUSSION_TIME;
        case 'VOTING':
            return GAME_CONFIG.VOTING_TIME;
        case 'VOTE_RESULT':
            return GAME_CONFIG.VOTE_RESULT_TIME;
        case 'LOBBY':
        case 'GAME_OVER':
        default:
            return 0;
    }
}

// ==================== REDUCER ====================

/**
 * Apply a phase transition to GameState.
 * 
 * Returns a NEW GameState object with updated phase fields.
 * Does NOT mutate the input state.
 * Does NOT handle: timers, socket emit, player mutations.
 * 
 * @param currentState - Current game state
 * @param targetPhase - Phase to transition to
 * @returns Result with ok=true and new state, or ok=false with error
 */
export function applyPhaseTransition(
    currentState: GameState,
    targetPhase: GamePhase
): PhaseTransitionResult {
    // Validate transition
    if (!canTransition(currentState.phase, targetPhase)) {
        return {
            ok: false,
            error: 'INVALID_TRANSITION',
            state: currentState
        };
    }

    // Create new state (immutable)
    const newState: GameState = {
        ...currentState,
        phase: targetPhase,
        phaseTimeLeft: getPhaseDuration(targetPhase)
    };

    // Phase-specific state updates
    switch (targetPhase) {
        case 'VOTING':
            // Reset votes for new voting round
            newState.votes = {};
            break;

        case 'HINT_ROUND':
            // Reset turn index for new hint round
            newState.currentTurnIndex = 0;
            newState.turnTimeLeft = GAME_CONFIG.HINT_TURN_TIME;
            break;

        case 'GAME_OVER':
            // No additional state changes needed
            // Winner should already be set before transitioning here
            break;
    }

    return { ok: true, state: newState };
}

/**
 * Get the next phase for automatic transitions.
 * Used for timer-based phase progression.
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase | null {
    switch (currentPhase) {
        case 'ROLE_REVEAL':
            return 'HINT_ROUND';
        case 'HINT_ROUND':
            return 'DISCUSSION';
        case 'DISCUSSION':
            return 'VOTING';
        case 'VOTING':
            return 'VOTE_RESULT';
        default:
            // VOTE_RESULT and GAME_OVER require decision logic
            return null;
    }
}
