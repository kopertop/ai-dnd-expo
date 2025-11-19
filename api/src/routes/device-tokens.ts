import type { Context } from 'hono';
import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

type DeviceTokensContext = { Bindings: CloudflareBindings; Variables: Variables };

interface DeviceRegistrationRequest {
	deviceToken: string;
	deviceName?: string;
	devicePlatform?: string;
	userAgent?: string;
}

const deviceTokens = new Hono<DeviceTokensContext>();

// Register a new device token
deviceTokens.post('/', async (c: Context<DeviceTokensContext>) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const body = (await c.req.json()) as DeviceRegistrationRequest;
	
	if (!body.deviceToken || typeof body.deviceToken !== 'string') {
		return c.json({ error: 'Invalid device token' }, 400);
	}

	// Validate device token format (64 hex characters)
	const hexRegex = /^[0-9a-f]{64}$/i;
	if (!hexRegex.test(body.deviceToken)) {
		return c.json({ error: 'Invalid device token format' }, 400);
	}

	try {
		// Extract IP address for logging
		const ipAddress = c.req.header('CF-Connecting-IP') 
			|| c.req.header('X-Forwarded-For') 
			|| 'unknown';

		// Check if device token already exists
		const existingDevice = await c.env.DATABASE.prepare(`
			SELECT device_token, user_id FROM device_tokens 
			WHERE device_token = ?
		`).bind(body.deviceToken).first();

		if (existingDevice) {
			if (existingDevice.user_id === user.id) {
				// Update existing device with new info
				await c.env.DATABASE.prepare(`
					UPDATE device_tokens 
					SET device_name = ?, device_platform = ?, user_agent = ?, 
						ip_address = ?, last_used_at = ?, updated_at = ?
					WHERE device_token = ?
				`).bind(
					body.deviceName || null,
					body.devicePlatform || null,
					body.userAgent || null,
					ipAddress,
					Date.now(),
					Date.now(),
					body.deviceToken,
				).run();

				return c.json({ 
					message: 'Device updated successfully',
					deviceToken: body.deviceToken, 
				});
			} else {
				return c.json({ error: 'Device token already registered to another user' }, 409);
			}
		}

		// Create new device token record
		const now = Date.now();
		await c.env.DATABASE.prepare(`
			INSERT INTO device_tokens (
				device_token, user_id, device_name, device_platform, 
				user_agent, ip_address, last_used_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			body.deviceToken,
			user.id,
			body.deviceName || null,
			body.devicePlatform || null,
			body.userAgent || null,
			ipAddress,
			now,
			now,
			now,
		).run();

		return c.json({ 
			message: 'Device registered successfully',
			deviceToken: body.deviceToken, 
		}, 201);

	} catch (error) {
		console.error('Error registering device:', error);
		return c.json({ error: 'Failed to register device' }, 500);
	}
});

// List all devices for the current user
deviceTokens.get('/', async (c: Context<DeviceTokensContext>) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	try {
		const devices = await c.env.DATABASE.prepare(`
			SELECT * FROM device_tokens 
			WHERE user_id = ? 
			ORDER BY last_used_at DESC
		`).bind(user.id).all();

		const deviceList = (devices.results || []).map((row: any) => ({
			deviceToken: row.device_token,
			deviceName: row.device_name,
			devicePlatform: row.device_platform,
			userAgent: row.user_agent,
			lastUsedAt: row.last_used_at,
			createdAt: row.created_at,
		}));

		return c.json({
			data: deviceList,
			total: deviceList.length,
		});
	} catch (error) {
		console.error('Error listing user devices:', error);
		return c.json({ error: 'Failed to list devices' }, 500);
	}
});

// Revoke a device token
deviceTokens.delete('/:deviceToken', async (c: Context<DeviceTokensContext>) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const deviceToken = c.req.param('deviceToken');

	try {
		const result = await c.env.DATABASE.prepare(`
			DELETE FROM device_tokens 
			WHERE device_token = ? AND user_id = ?
		`).bind(deviceToken, user.id).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Device token not found or not owned by user' }, 404);
		}

		return c.json({ message: 'Device revoked successfully' });
	} catch (error) {
		console.error('Error revoking device:', error);
		return c.json({ error: 'Failed to revoke device' }, 500);
	}
});

export default deviceTokens;

