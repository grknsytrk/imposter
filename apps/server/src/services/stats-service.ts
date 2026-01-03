/**
 * Stats Service - Post-game statistics accounting
 * 
 * This service is intentionally separated from the game engine:
 * - Engine stays deterministic and DB-free
 * - Stats are side-effects handled after game ends
 * - Failure here doesn't break gameplay
 * 
 * SECURITY: Uses gameId for idempotency - duplicate calls are safely ignored.
 * Stats updates are handled by database trigger on game_participants insert.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client for stats (server-side)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export interface GameEndResult {
    gameId: string;  // REQUIRED: Unique identifier for idempotency
    winner: 'IMPOSTER' | 'CITIZENS';
    category?: string;
    roomId?: string;
    durationSeconds?: number;
    players: Array<{
        odaPlayerId: string;     // Socket room player id
        odaUserID?: string;      // Supabase auth user id (optional - guests may not have)
        role: 'IMPOSTER' | 'CITIZEN';
        isEliminated: boolean;
    }>;
}

/**
 * Records game end statistics for all players.
 * Uses gameId for idempotency - safe to call multiple times.
 * Database trigger handles atomic stats updates on participant insert.
 */
export async function recordGameEnd(result: GameEndResult): Promise<void> {
    if (!supabase) {
        console.warn('[StatsService] Supabase not configured, skipping stats update');
        return;
    }

    const { gameId, winner, players, category, roomId, durationSeconds } = result;

    if (!gameId) {
        console.error('[StatsService] gameId is required for stats recording');
        return;
    }

    // Step 1: Insert game result (will fail if gameId already exists)
    const { error: gameError } = await supabase
        .from('game_results')
        .insert({
            id: gameId,
            winner: winner,
            category: category || null,
            player_count: players.length,
            room_id: roomId || null,
            duration_seconds: durationSeconds || null
        });

    if (gameError) {
        // UNIQUE constraint violation = already recorded (idempotency)
        if (gameError.code === '23505') {
            console.log(`[StatsService] Game ${gameId} already recorded (idempotent skip)`);
            return;
        }
        console.error('[StatsService] Failed to insert game result:', gameError);
        return;
    }

    console.log(`[StatsService] Game ${gameId} recorded: ${winner} wins`);

    // Step 2: Insert participants (trigger handles stats updates)
    const participants = players
        .filter(p => p.odaUserID) // Only authenticated players
        .map(p => ({
            game_id: gameId,
            user_id: p.odaUserID,
            role: p.role,
            won: (winner === 'IMPOSTER' && p.role === 'IMPOSTER') ||
                (winner === 'CITIZENS' && p.role === 'CITIZEN')
        }));

    // Deduplicate by userId (in case of multi-tab joining same game)
    const uniqueParticipants = [...new Map(
        participants.map(p => [p.user_id, p])
    ).values()];

    if (uniqueParticipants.length === 0) {
        console.log('[StatsService] No authenticated players, skipping participant insert');
        return;
    }

    const { error: participantError } = await supabase
        .from('game_participants')
        .insert(uniqueParticipants);

    if (participantError) {
        // Log but don't fail - game result is already recorded
        console.error('[StatsService] Failed to insert participants:', participantError);
    } else {
        console.log(`[StatsService] ${uniqueParticipants.length} participants recorded`);
    }

    // Update daily_stats for trend graphs (async, non-blocking)
    (async () => {
        try {
            await supabase.rpc('increment_daily_stats', {
                p_imposter_won: winner === 'IMPOSTER'
            });
            console.log('[StatsService] Daily stats updated');
        } catch (err) {
            console.error('[StatsService] Failed to update daily stats:', err);
        }
    })();

    // Update category stats if category is provided (async, non-blocking)
    if (category) {
        (async () => {
            try {
                await supabase.rpc('update_category_stats', {
                    p_category: category,
                    p_winner: winner
                });
                console.log(`[StatsService] Category stats updated for ${category}`);
            } catch (err) {
                console.error('[StatsService] Failed to update category stats:', err);
            }
        })();
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

