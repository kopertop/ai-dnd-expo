export async function applyMigrations(db: D1Database) {
	// Use Vite's import.meta.glob to load all SQL files as raw strings
	const migrations = import.meta.glob('../migrations/*.sql', { query: '?raw', eager: true });

	// Sort keys to ensure migrations run in order (0000, 0001, etc.)
	const sortedKeys = Object.keys(migrations).sort();

	for (const key of sortedKeys) {
		const module = migrations[key] as { default: string };
		let sql = module.default;

        // Remove BOM if present
        sql = sql.replace(/^\uFEFF/, '');

        // Remove comments (lines starting with -- or inline --)
        // This regex matches "--" followed by anything until a newline, INCLUDING the newline.
        // We replace it with a space to effectively remove the comment and join the lines.
        // This prevents inline comments from commenting out the rest of the flattened string.
        sql = sql.replace(/--[^\r\n]*(\r\n|\r|\n)/g, ' ');

		// Remove remaining newlines (those not part of comments)
		sql = sql.replace(/[\r\n]+/g, ' ');
		
        // Replace backticks with double quotes for safety
        sql = sql.replace(/`/g, '"');

		// Split by semicolons
		const statements = sql.split(';')
			.map(s => s.trim())
			.filter(s => s.length > 0);

		for (const statement of statements) {
			try {
                // Append semicolon back as it was removed by split
				await db.exec(statement + ';');
			} catch (error) {
				console.error(`Failed to apply migration ${key} statement.`);
                // console.error(`SQL: ${statement}`);
				throw error;
			}
		}
	}
}
