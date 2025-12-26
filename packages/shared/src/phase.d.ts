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
export declare const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]>;
/**
 * Check if a phase transition is valid.
 *
 * @param from - Current phase
 * @param to - Target phase
 * @returns true if transition is allowed
 */
export declare function canTransition(from: GamePhase, to: GamePhase): boolean;
/**
 * Assert a phase transition is valid, throw if not.
 * Use in server code to prevent invalid state changes.
 */
export declare function assertTransition(from: GamePhase, to: GamePhase): void;
