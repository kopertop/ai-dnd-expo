import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	isAnonymous: integer("is_anonymous", { mode: "boolean" }),
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	timezone: text("timezone"),
	city: text("city"),
	country: text("country"),
	region: text("region"),
	regionCode: text("region_code"),
	colo: text("colo"),
	latitude: text("latitude"),
	longitude: text("longitude"),
});

export const accounts = sqliteTable("accounts", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp_ms",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp_ms",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const verifications = sqliteTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const games = sqliteTable("games", {
	id: text("id").primaryKey(),
	inviteCode: text("invite_code").notNull(),
	hostId: text("host_id").notNull(),
	hostEmail: text("host_email"),
	questId: text("quest_id").notNull(),
	questData: text("quest_data").notNull(),
	world: text("world").notNull(),
	startingArea: text("starting_area").notNull(),
	status: text("status").notNull().default("waiting"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => ({
	inviteCodeIdx: uniqueIndex("games_invite_code_unique").on(table.inviteCode),
	hostIdIdx: index("games_host_id_idx").on(table.hostId),
	hostEmailIdx: index("games_host_email_idx").on(table.hostEmail),
}));

export const characters = sqliteTable("characters", {
	id: text("id").primaryKey(),
	playerId: text("player_id"),
	playerEmail: text("player_email"),
	name: text("name").notNull(),
	level: integer("level").notNull(),
	race: text("race").notNull(),
	class: text("class").notNull(),
	description: text("description"),
	stats: text("stats").notNull(),
	skills: text("skills").notNull(),
	inventory: text("inventory").notNull(),
	equipped: text("equipped").notNull(),
	health: integer("health").notNull(),
	maxHealth: integer("max_health").notNull(),
	actionPoints: integer("action_points").notNull(),
	maxActionPoints: integer("max_action_points").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => ({
	playerIdIdx: index("characters_player_id_idx").on(table.playerId),
	playerEmailIdx: index("characters_player_email_idx").on(table.playerEmail),
}));

export const gamePlayers = sqliteTable("game_players", {
	id: text("id").primaryKey(),
	gameId: text("game_id")
		.notNull()
		.references(() => games.id, { onDelete: "cascade" }),
	playerId: text("player_id"),
	playerEmail: text("player_email"),
	characterId: text("character_id")
		.notNull()
		.references(() => characters.id, { onDelete: "cascade" }),
	characterName: text("character_name").notNull(),
	joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
}, table => ({
	gameIdIdx: index("game_players_game_id_idx").on(table.gameId),
	playerIdIdx: index("game_players_player_id_idx").on(table.playerId),
	playerEmailIdx: index("game_players_player_email_idx").on(table.playerEmail),
}));

export const gameStates = sqliteTable("game_states", {
        gameId: text("game_id")
                .primaryKey()
                .references(() => games.id, { onDelete: "cascade" }),
        stateData: text("state_data").notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const maps = sqliteTable("maps", {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        description: text("description"),
        width: integer("width").notNull(),
        height: integer("height").notNull(),
        terrain: text("terrain").notNull(),
        fog: text("fog").notNull(),
        metadata: text("metadata"),
        createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const mapTiles = sqliteTable("map_tiles", {
        id: text("id").primaryKey(),
        mapId: text("map_id")
                .notNull()
                .references(() => maps.id, { onDelete: "cascade" }),
        x: integer("x").notNull(),
        y: integer("y").notNull(),
        terrainType: text("terrain_type").notNull(),
        elevation: integer("elevation").default(0),
        isObstacle: integer("is_obstacle", { mode: "boolean" }).default(false).notNull(),
        hasFog: integer("has_fog", { mode: "boolean" }).default(false).notNull(),
}, table => ({
        mapIdx: index("map_tiles_map_id_idx").on(table.mapId),
}));

export const npcs = sqliteTable("npcs", {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        alignment: text("alignment").notNull(),
        description: text("description"),
        stats: text("stats").notNull(),
        abilities: text("abilities").notNull(),
        icon: text("icon"),
        color: text("color"),
        metadata: text("metadata"),
        createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const mapTokens = sqliteTable("map_tokens", {
        id: text("id").primaryKey(),
        mapId: text("map_id")
                .notNull()
                .references(() => maps.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        entityId: text("entity_id"),
        label: text("label").notNull(),
        icon: text("icon"),
        color: text("color"),
        x: integer("x").notNull(),
        y: integer("y").notNull(),
        zIndex: integer("z_index").default(0).notNull(),
        metadata: text("metadata"),
        createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => ({
        mapIdIdx: index("map_tokens_map_id_idx").on(table.mapId),
        tokenTypeIdx: index("map_tokens_type_idx").on(table.type),
}));
