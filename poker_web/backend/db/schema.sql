-- MVP Auth and Player Identity schema for Supabase PostgreSQL
-- Apply via: psql $DATABASE_URL -f poker_web/backend/db/schema.sql

-- Auth layer
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Gameplay layer (1:1 with users for MVP)
CREATE TABLE IF NOT EXISTS players (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL DEFAULT 1000,
    games_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches (MVP: one row per completed match)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES players(user_id),
    player2_id UUID NOT NULL REFERENCES players(user_id),
    bb_result NUMERIC(10,2) NOT NULL,
    hands_played INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);

-- Rating history (snapshot after each match)
CREATE TABLE IF NOT EXISTS rating_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(user_id),
    rating INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rating_history_player ON rating_history(player_id);
