-- Initial schema for D&D Multiplayer Game
-- Games table: stores game sessions
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    host_id TEXT NOT NULL,
    host_email TEXT,
    quest_id TEXT NOT NULL,
    quest_data TEXT NOT NULL, -- JSON string
    world TEXT NOT NULL,
    starting_area TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, active, completed, cancelled
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    INDEX idx_invite_code (invite_code),
    INDEX idx_host_id (host_id),
    INDEX idx_status (status)
);

-- Characters table: stores player characters (can be reused across games)
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    player_email TEXT,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    race TEXT NOT NULL,
    class TEXT NOT NULL,
    description TEXT,
    stats TEXT NOT NULL, -- JSON string: {strength, dexterity, etc}
    skills TEXT NOT NULL DEFAULT '[]', -- JSON array
    inventory TEXT NOT NULL DEFAULT '[]', -- JSON array
    equipped TEXT NOT NULL DEFAULT '{}', -- JSON object
    health INTEGER NOT NULL,
    max_health INTEGER NOT NULL,
    action_points INTEGER NOT NULL DEFAULT 3,
    max_action_points INTEGER NOT NULL DEFAULT 3,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    INDEX idx_player_id (player_id),
    INDEX idx_player_email (player_email)
);

-- Players table: links players to games with their characters
CREATE TABLE IF NOT EXISTS game_players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_email TEXT,
    character_id TEXT NOT NULL,
    character_name TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id),
    INDEX idx_game_id (game_id),
    INDEX idx_player_id (player_id),
    INDEX idx_character_id (character_id)
);

-- Game state table: stores the current state of active games
CREATE TABLE IF NOT EXISTS game_states (
    game_id TEXT PRIMARY KEY,
    state_data TEXT NOT NULL, -- JSON string of MultiplayerGameState
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

