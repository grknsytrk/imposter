-- Friendship System Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- FRIENDSHIPS TABLE (Symmetric Model)
-- ============================================
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    requested_by UUID REFERENCES profiles(id),
    blocked_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Symmetric invariant: smaller UUID always in user_id
    CHECK (user_id < friend_id),
    UNIQUE(user_id, friend_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ============================================
-- ROOM INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL,
    room_name TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_invites_to_user ON room_invites(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON room_invites(expires_at);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_invites ENABLE ROW LEVEL SECURITY;

-- Friendships: Users can see their own friendships
CREATE POLICY "Users can view own friendships" ON friendships
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = friend_id
    );

-- Friendships: Users can insert (via service role for now)
CREATE POLICY "Service role can manage friendships" ON friendships
    FOR ALL USING (auth.role() = 'service_role');

-- Room Invites: Users can see invites sent to them
CREATE POLICY "Users can view own invites" ON room_invites
    FOR SELECT USING (
        auth.uid() = to_user_id OR auth.uid() = from_user_id
    );

-- Room Invites: Users can update invites sent to them (accept/decline)
CREATE POLICY "Users can respond to invites" ON room_invites
    FOR UPDATE USING (auth.uid() = to_user_id);

-- Service role full access
CREATE POLICY "Service role can manage invites" ON room_invites
    FOR ALL USING (auth.role() = 'service_role');
