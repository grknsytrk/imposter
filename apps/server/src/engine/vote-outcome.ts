/**
 * Vote Outcome Calculator
 * 
 * Pure function - NO side effects, NO state mutation.
 * Input: votes, players → Output: { eliminatedId, isTie }
 */

import { Player } from '@imposter/shared';

export type VoteOutcome = {
    eliminatedId: string | null;
    isTie: boolean;
};

/**
 * Calculate the outcome of a vote.
 * 
 * INVARIANTS:
 * - Does NOT touch any state
 * - Input: votes, alivePlayers ONLY
 * - Output: { eliminatedId, isTie }
 * - REFERENTIALLY TRANSPARENT: same input → same output
 * - NO: Math.random, Date, phase, round, or external state
 * 
 * @param votes - Map of voterId → targetId
 * @param alivePlayers - List of alive player IDs
 */
export function calculateVoteOutcome(
    votes: Record<string, string>,
    alivePlayers: string[]
): VoteOutcome {
    // Precondition: votes cannot be empty when called
    if (Object.keys(votes).length === 0) {
        return { eliminatedId: null, isTie: true };
    }

    const voteCounts: Record<string, number> = {};
    Object.values(votes).forEach(votedId => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    // Sort by vote count (highest first)
    const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

    // No votes
    if (sorted.length === 0) {
        return { eliminatedId: null, isTie: true };
    }

    // Single candidate OR clear winner
    if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) {
        const eliminatedId = sorted[0][0];
        // Invariant: eliminated must be alive
        if (alivePlayers.includes(eliminatedId)) {
            return { eliminatedId, isTie: false };
        }
        return { eliminatedId: null, isTie: true };
    }

    // Tie
    return { eliminatedId: null, isTie: true };
}
