import { authService } from 'expo-auth-template/frontend';

import { API_BASE_URL } from '@/services/config/api-base-url';
import type { MultiplayerGameState } from '@/types/multiplayer-game';
import {
	WebSocketMessage,
} from '@/types/api/websocket-messages';

export type WebSocketMessageHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
	private ws: WebSocket | null = null;
	private inviteCode: string = '';
	private playerId: string = '';
	private characterId: string = '';
	private token: string = '';
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;
	private messageHandlers: Set<WebSocketMessageHandler> = new Set();
	private isConnecting: boolean = false;

	/**
	 * Connect to game WebSocket
	 */
	async connect(
		inviteCode: string,
		playerId: string,
		characterId: string,
	): Promise<void> {
		if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
			return Promise.resolve();
		}

		this.inviteCode = inviteCode;
		this.playerId = playerId;
		this.characterId = characterId;
		const user = authService.getUser ? await authService.getUser() : null;
		const email =
			(user as { email?: string | null } | null)?.email ||
			(await authService.getSession())?.email ||
			'unknown';
		this.token = `${playerId}:${email}`;

		return new Promise((resolve, reject) => {
			this.isConnecting = true;

			// Construct WebSocket URL
			const computeWsBase = () => {
				// If API_BASE_URL is absolute, use its origin (strip /api path to avoid 404)
				if (API_BASE_URL.startsWith('http')) {
					const url = new URL(API_BASE_URL);
					const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
					return `${protocol}//${url.host}`;
				}

				// For relative URLs or empty base, fall back to window or localhost
				if (typeof window !== 'undefined') {
					const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
					return `${protocol}//${window.location.host}`;
				}

				// Fallback for non-browser contexts
				return 'ws://localhost:8787';
			};

			const wsBase = computeWsBase();
			const url = `${wsBase.replace(/\/$/, '')}/party/game-room/${inviteCode}?token=${encodeURIComponent(this.token)}`;

			try {
				const ws = new WebSocket(url);

				ws.onopen = () => {
					this.ws = ws;
					this.isConnecting = false;
					this.reconnectAttempts = 0;
					resolve();
				};

				ws.onmessage = (event) => {
					try {
						const message: WebSocketMessage = JSON.parse(event.data as string);
						this.handleMessage(message);
					} catch (error) {
						console.error('Failed to parse WebSocket message:', error);
					}
				};

				ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					this.isConnecting = false;
					reject(error);
				};

				ws.onclose = () => {
					this.ws = null;
					this.isConnecting = false;
					this.attemptReconnect();
				};
			} catch (error) {
				this.isConnecting = false;
				reject(error);
			}
		});
	}

	/**
	 * Disconnect from WebSocket
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.messageHandlers.clear();
		this.reconnectAttempts = 0;
	}

	/**
	 * Send a message through WebSocket
	 */
	send(message: any): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.warn('WebSocket is not connected');
		}
	}

	sendRefresh(): void {
		this.send({ type: 'ping', message: 'refresh' });
	}

	/**
	 * Add message handler
	 */
	onMessage(handler: WebSocketMessageHandler): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	private handleMessage(message: WebSocketMessage): void {
		// Ping/pong handling
		if (message.type === 'ping') {
			this.send({ type: 'pong', timestamp: Date.now() });
			return;
		}

		// Notify all handlers
		for (const handler of this.messageHandlers) {
			try {
				handler(message);
			} catch (error) {
				console.error('Error in message handler:', error);
			}
		}
	}

	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('Max reconnection attempts reached');
			return;
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

		setTimeout(() => {
			this.connect(this.inviteCode, this.playerId, this.characterId).catch(
				(error) => {
					// Silently handle reconnection failures
				},
			);
		}, delay);
	}
}

// Singleton instance
export const websocketClient = new WebSocketClient();
