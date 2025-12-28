/**
 * Stats Service - Post-game statistics accounting
 * 
 * This service is intentionally separated from the game engine:
 * - Engine stays deterministic and DB-free
 * - Stats are side-effects handled after game ends
 * - Failure here doesn't break gameplay
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client for stats (server-side)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export interface GameEndResult {
    winner: 'IMPOSTER' | 'CITIZENS';
    players: Array<{
        odaPlayerId: string;     // Socket room player id
        odaUserID?: string;      // Supabase auth user id (optional - guests may not have)
        role: 'IMPOSTER' | 'CITIZEN';
        isEliminated: boolean;
    }>;
}

interface StatsUpdate {
    games_played: number;
    games_won: number;
    imposter_games: number;
    imposter_wins: number;
    citizen_games: number;
    citizen_wins: number;
}

/**
 * Records game end statistics for all players
 * Called from socket layer after GAME_OVER phase
 */
export async function recordGameEnd(result: GameEndResult): Promise<void> {
    if (!supabase) {
        console.warn('[StatsService] Supabase not configured, skipping stats update');
        return;
    }

    const { winner, players } = result;

    for (const player of players) {
        // Skip players without user IDs (guests without accounts)
        if (!player.odaUserID) continue;

        const isWinner = (winner === 'IMPOSTER' && player.role === 'IMPOSTER') ||
            (winner === 'CITIZENS' && player.role === 'CITIZEN');

        const isImposter = player.role === 'IMPOSTER';

        try {
            await updatePlayerStats(player.odaUserID, {
                games_played: 1,
                games_won: isWinner ? 1 : 0,
                imposter_games: isImposter ? 1 : 0,
                imposter_wins: isImposter && isWinner ? 1 : 0,
                citizen_games: !isImposter ? 1 : 0,
                citizen_wins: !isImposter && isWinner ? 1 : 0,
            });
        } catch (error) {
            // Log but don't throw - stats failure shouldn't break game
            console.error(`[StatsService] Failed to update stats for ${player.odaUserID}:`, error);
        }
    }
}

/**
 * Upsert player stats - creates if not exists, increments if exists
 */
async function updatePlayerStats(userId: string, delta: StatsUpdate): Promise<void> {
    if (!supabase) return;

    // First try to get existing stats
    const { data: existing } = await supabase
        .from('player_stats')
        .select('*')
        .eq('id', userId)
        .single();

    if (existing) {
        // Update existing
        await supabase
            .from('player_stats')
            .update({
                games_played: existing.games_played + delta.games_played,
                games_won: existing.games_won + delta.games_won,
                imposter_games: existing.imposter_games + delta.imposter_games,
                imposter_wins: existing.imposter_wins + delta.imposter_wins,
                citizen_games: existing.citizen_games + delta.citizen_games,
                citizen_wins: existing.citizen_wins + delta.citizen_wins,
            })
            .eq('id', userId);
    } else {
        // Insert new
        await supabase
            .from('player_stats')
            .insert({
                id: userId,
                ...delta,
            });
    }
}

/**
 * Get player stats (for API if needed)
 */
export async function getPlayerStats(userId: string) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) return null;
    return data;
}
