// Validator functions for Vote Command
// Pure functions - NO side effects

import { Room, VoteCommand, VoteError } from '@imposter/shared';

/**
 * Validates a vote command against the current room state.
 * Returns null if valid, or a VoteError if invalid.
 */
export function validateVote(room: Room, cmd: VoteCommand): VoteError | null {
    const { gameState } = room;

    // Check if game is running
    if (!gameState) {
        return 'GAME_NOT_STARTED';
    }

    // Check if we're in voting phase
    if (gameState.phase !== 'VOTING') {
        return 'WRONG_PHASE';
    }

    // Vote overwrite allowed (last-write-wins)
    // The last submitted vote overwrites any previous one
    // No ALREADY_VOTED check - players can change their vote until timer ends

    // Check if trying to vote for self
    if (cmd.playerId === cmd.targetId) {
        return 'CANNOT_VOTE_SELF';
    }

    // Check if target is valid (exists and not eliminated)
    const targetPlayer = room.players.find(p => p.id === cmd.targetId);
    if (!targetPlayer || targetPlayer.isEliminated) {
        return 'INVALID_TARGET';
    }

    return null; // Valid!
}
