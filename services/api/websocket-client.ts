import {
	WebSocketMessage,
} from '@/types/api/websocket-messages';

// Determine API base URL (same logic as multiplayer-client.ts):
// 1. If EXPO_PUBLIC_MULTIPLAYER_API_URL is set, use it (for explicit Worker URL)
// 2. If running in browser on localhost, use http://localhost:8787 (local dev)
// 3. If running in browser on production, use relative URLs (for Cloudflare Pages routing)
// 4. Otherwise (Node/Expo), use localhost for local development
const getApiBaseUrl = (): string => {
	const explicitUrl = process.env.EXPO_PUBLIC_MULTIPLAYER_API_URL;
	if (explicitUrl) {
		return explicitUrl;
	}
	
	// Check if we're in a browser environment
	if (typeof window !== 'undefined') {
		// Check if we're on localhost (local development)
		const isLocalhost = window.location.hostname === 'localhost' || 
		                   window.location.hostname === '127.0.0.1' ||
		                   window.location.hostname === '';
		
		if (isLocalhost) {
			// Local development - use full localhost URL
			return 'http://localhost:8787';
		}
		
		// Production - use relative URLs so Cloudflare Pages routes /api/* to Worker
		// Return empty string, will be converted to WebSocket URL in connect()
		return '';
	}
	
	// Node/Expo dev server - use localhost
	return 'http://localhost:8787';
};

const API_BASE_URL = getApiBaseUrl();

export type WebSocketMessageHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
	private ws: WebSocket | null = null;
	private inviteCode: string = '';
	private playerId: string = '';
	private characterId: string = '';
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;
	private messageHandlers: Set<WebSocketMessageHandler> = new Set();
	private isConnecting: boolean = false;

	/**
	 * Connect to game WebSocket
	 */
	connect(
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

		return new Promise((resolve, reject) => {
			this.isConnecting = true;

			// Construct WebSocket URL
			let wsUrl: string;
			if (API_BASE_URL === '') {
				// Relative URL (production) - use current protocol/host
				const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8787';
				wsUrl = `${protocol}//${host}`;
			} else {
				// HTTP URL (local dev) - convert to WebSocket
				wsUrl = API_BASE_URL.replace(/^http/, 'ws');
			}
			const url = `${wsUrl}/api/games/${inviteCode}/ws?playerId=${playerId}&characterId=${characterId}`;

			try {
				const ws = new WebSocket(url);

				ws.onopen = () => {
					console.log('WebSocket connected');
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
					console.log('WebSocket closed');
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
			console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
			this.connect(this.inviteCode, this.playerId, this.characterId).catch(
				(error) => {
					console.error('Reconnection failed:', error);
				},
			);
		}, delay);
	}
}

// Singleton instance
export const websocketClient = new WebSocketClient();

