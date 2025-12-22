// Game Engine Core - Entry point for vote command handling
// Pure function - validates and applies commands

import { Room, VoteCommand, VoteResult } from '@imposter/shared';
import { validateVote } from './validators';
import { applyVote } from './reducers';

/**
 * Handles a vote command.
 * Pure function: takes room + command, returns result.
 * NO side effects, NO socket/IO access.
 */
export function handleVote(room: Room, cmd: VoteCommand): VoteResult {
    // 1. Validate
    const error = validateVote(room, cmd);
    if (error) {
        return { success: false, error };
    }

    // 2. Apply (immutable)
    const nextVotes = applyVote(room.gameState!, cmd);

    // 3. Return result
    return { success: true, nextVotes };
}
