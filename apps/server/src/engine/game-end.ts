/**
 * Game End Detector
 * 
 * Pure function - detects win/lose conditions.
 * INVARIANTS:
 * - Does NOT mutate state
 * - Idempotent: same input → same output
 * - If winner set → returns same winner
 */

import { Player, GameState } from '@imposter/shared';

export type GameEndResult = {
    isGameOver: boolean;
    winner: 'CITIZENS' | 'IMPOSTER' | null;
};

/**
 * Check if the game has ended.
 * 
 * Pure terminal detector - never mutates state.
 * 
 * INVARIANTS:
 * - Does NOT interpret phase or votes
 * - Only looks at: alive players, imposter status
 * - Idempotent: same input → same output
 * 
 * @param players - All players
 * @param gameState - Current game state
 */
export function checkGameEndPure(
    players: Player[],
    gameState: GameState
): GameEndResult {
    // If winner already set, return it (idempotent)
    if (gameState.winner) {
        return { isGameOver: true, winner: gameState.winner };
    }

    const imposter = players.find(p => p.id === gameState.imposterId);
    const activeCitizens = players.filter(p => p.role === 'CITIZEN' && !p.isEliminated);

    // Imposter eliminated → citizens win
    if (imposter?.isEliminated) {
        return { isGameOver: true, winner: 'CITIZENS' };
    }

    // Only 1 citizen left → imposter wins
    if (activeCitizens.length <= 1) {
        return { isGameOver: true, winner: 'IMPOSTER' };
    }

    // Game continues
    return { isGameOver: false, winner: null };
}
