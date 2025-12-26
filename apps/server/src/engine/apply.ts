/**
 * Command Application Layer
 * 
 * Single entry point for engine commands.
 * Delegates to existing validators and reducers.
 * 
 * INVARIANTS:
 * - Pure function - no side effects
 * - Returns Result, never throws
 * - Invalid command = original state returned
 */

import { Room, VoteCommand, VoteError, GameState } from '@imposter/shared';
import { validateVote } from './validators';
import { applyVote } from './reducers';
import { GameCommand, CommandType, COMMAND_META, CommandError, isCommandAllowedInPhase } from './commands';

// Result type - no exceptions, only values
export type Result<T, E> =
    | { ok: true; state: T }
    | { ok: false; error: E; state: T }; // state returned unchanged on error

/**
 * Apply a vote command to the room state.
 * Returns a new votes object if successful, or an error with unchanged state.
 */
export function applyVoteCommand(
    room: Room,
    cmd: VoteCommand
): Result<Record<string, string>, VoteError> {
    const currentVotes = room.gameState?.votes || {};

    // 1. Validate
    const error = validateVote(room, cmd);
    if (error) {
        return { ok: false, error, state: currentVotes };
    }

    // 2. Apply (pure reducer)
    if (!room.gameState) {
        return { ok: false, error: 'GAME_NOT_STARTED', state: currentVotes };
    }

    const newVotes = applyVote(room.gameState, cmd);

    return { ok: true, state: newVotes };
}

/**
 * Universal command application.
 * 
 * INVARIANTS:
 * - Phase check from COMMAND_META
 * - Invalid command = state unchanged
 * - Pure function, Result only
 */
export function applyCommand(
    room: Room,
    cmd: GameCommand
): Result<GameState, CommandError | VoteError> {
    if (!room.gameState) {
        return { ok: false, error: 'GAME_NOT_STARTED', state: room.gameState! };
    }

    const currentState = room.gameState;
    const commandType = cmd.type as CommandType;

    // 1. Phase check
    if (!isCommandAllowedInPhase(commandType, currentState.phase)) {
        return { ok: false, error: 'WRONG_PHASE', state: currentState };
    }

    // 2. Delegate to specific handler
    switch (cmd.type) {
        case 'SUBMIT_VOTE': {
            const result = applyVoteCommand(room, {
                type: 'SUBMIT_VOTE',
                playerId: cmd.playerId,
                targetId: cmd.targetId
            });
            if (result.ok) {
                return {
                    ok: true,
                    state: { ...currentState, votes: result.state }
                };
            }
            return { ok: false, error: result.error, state: currentState };
        }

        // Other commands can be added here
        default:
            return { ok: false, error: 'WRONG_PHASE', state: currentState };
    }
}
