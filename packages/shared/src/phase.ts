/**
 * Phase Transition Contract
 * 
 * Defines valid phase transitions for the game state machine.
 * Server is the single source of truth for phase changes.
 */

import { GamePhase } from './index';

/**
 * Valid next phases from each phase.
 * This is the game's state machine definition.
 */
export const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
    LOBBY: ['ROLE_REVEAL'],
    ROLE_REVEAL: ['HINT_ROUND'],
    HINT_ROUND: ['DISCUSSION'],
    DISCUSSION: ['VOTING'],
    VOTING: ['VOTE_RESULT'],
    VOTE_RESULT: ['DISCUSSION', 'GAME_OVER'], // Tie → new round, or game ends
    GAME_OVER: ['LOBBY'], // Restart
};

/**
 * Check if a phase transition is valid.
 * 
 * @param from - Current phase
 * @param to - Target phase
 * @returns true if transition is allowed
 */
export function canTransition(from: GamePhase, to: GamePhase): boolean {
    return PHASE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Assert a phase transition is valid, throw if not.
 * Use in server code to prevent invalid state changes.
 */
export function assertTransition(from: GamePhase, to: GamePhase): void {
    if (!canTransition(from, to)) {
        throw new Error(`INVALID_PHASE_TRANSITION: ${from} → ${to}`);
    }
}
