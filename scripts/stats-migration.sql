-- Security Migration: Stats Idempotency
-- This migration adds tables for proper game result tracking with deduplication

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Game Results Table (source of truth)
-- ============================================
-- Each game has exactly one row, identified by gameId
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY,  -- gameId from server
    ended_at TIMESTAMPTZ DEFAULT NOW(),
    winner TEXT CHECK (winner IN ('IMPOSTER', 'CITIZENS')),
    category TEXT,
    player_count INT,
    mode TEXT DEFAULT 'CLASSIC',
    room_id TEXT,  -- Optional: for debugging
    duration_seconds INT  -- Optional: game length
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_game_results_ended_at ON game_results(ended_at);
CREATE INDEX IF NOT EXISTS idx_game_results_category ON game_results(category);

-- ============================================
-- Game Participants Table
-- ============================================
-- Links users to games with their role and outcome
-- UNIQUE constraint prevents double-counting
CREATE TABLE IF NOT EXISTS game_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES game_results(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('IMPOSTER', 'CITIZEN')),
    won BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- CRITICAL: Prevents same user being recorded twice per game
    UNIQUE(game_id, user_id)
);

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON game_participants(user_id);

-- ============================================
-- Trigger: Auto-update player_stats
-- ============================================
-- When a participant is inserted, atomically update their stats
CREATE OR REPLACE FUNCTION process_game_participant()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert into player_stats with atomic increments
    INSERT INTO player_stats (
        id, 
        games_played, 
        games_won, 
        imposter_games, 
        imposter_wins, 
        citizen_games, 
        citizen_wins,
        last_played_at
    )
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.won THEN 1 ELSE 0 END,
        CASE WHEN NEW.role = 'IMPOSTER' THEN 1 ELSE 0 END,
        CASE WHEN NEW.role = 'IMPOSTER' AND NEW.won THEN 1 ELSE 0 END,
        CASE WHEN NEW.role = 'CITIZEN' THEN 1 ELSE 0 END,
        CASE WHEN NEW.role = 'CITIZEN' AND NEW.won THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        games_played = player_stats.games_played + 1,
        games_won = player_stats.games_won + EXCLUDED.games_won,
        imposter_games = player_stats.imposter_games + EXCLUDED.imposter_games,
        imposter_wins = player_stats.imposter_wins + EXCLUDED.imposter_wins,
        citizen_games = player_stats.citizen_games + EXCLUDED.citizen_games,
        citizen_wins = player_stats.citizen_wins + EXCLUDED.citizen_wins,
        last_played_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists to allow re-running
DROP TRIGGER IF EXISTS trigger_process_participant ON game_participants;

-- Create trigger
CREATE TRIGGER trigger_process_participant
AFTER INSERT ON game_participants
FOR EACH ROW EXECUTE FUNCTION process_game_participant();

-- ============================================
-- Ensure player_stats table has required columns
-- ============================================
-- Add last_played_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'player_stats' AND column_name = 'last_played_at'
    ) THEN
        ALTER TABLE player_stats ADD COLUMN last_played_at TIMESTAMPTZ;
    END IF;
END $$;
