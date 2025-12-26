/**
 * Command Application Layer
 * 
 * Single entry point for engine commands.
 * Delegates to existing validators and reducers.
 */

import { Room, VoteCommand, VoteError } from '@imposter/shared';
import { validateVote } from './validators';
import { applyVote } from './reducers';

// Result type - no exceptions, only values
export type Result<T, E> =
    | { ok: true; state: T }
    | { ok: false; error: E };

/**
 * Apply a vote command to the room state.
 * Returns a new votes object if successful, or an error.
 * 
 * This is a delegator, not new logic:
 * - Uses existing validateVote
 * - Uses existing applyVote
 */
export function applyVoteCommand(
    room: Room,
    cmd: VoteCommand
): Result<Record<string, string>, VoteError> {
    // 1. Validate
    const error = validateVote(room, cmd);
    if (error) {
        return { ok: false, error };
    }

    // 2. Apply (pure reducer)
    if (!room.gameState) {
        return { ok: false, error: 'GAME_NOT_STARTED' };
    }

    const newVotes = applyVote(room.gameState, cmd);

    return { ok: true, state: newVotes };
}
