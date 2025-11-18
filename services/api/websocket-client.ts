import {
	WebSocketMessage,
} from '@/types/api/websocket-messages';
import { API_BASE_URL } from '@/services/config/api-base-url';

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

