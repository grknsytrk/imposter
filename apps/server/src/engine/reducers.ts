// Reducer functions for Vote Command
// Pure functions - immutable state transitions

import { GameState, VoteCommand } from '@imposter/shared';

/**
 * Applies a vote command to the game state.
 * Returns a NEW votes object (immutable).
 */
export function applyVote(
    state: GameState,
    cmd: VoteCommand
): Record<string, string> {
    // Immutable update - create new object
    return {
        ...state.votes,
        [cmd.playerId]: cmd.targetId
    };
}
