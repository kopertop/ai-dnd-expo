import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from 'expo-auth-template/frontend';

import { API_BASE_URL } from '@/services/config/api-base-url';

type LogEntry = { at: number; label: string };

const PartyTestScreen: React.FC = () => {
	const { user } = useAuth();
	const [inviteCode, setInviteCode] = useState('');
	const [tokenOverride, setTokenOverride] = useState('');
	const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
	const [wsUrl, setWsUrl] = useState('');
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [pingText, setPingText] = useState('hello from client');

	const socketRef = useRef<WebSocket | null>(null);

	const defaultToken = useMemo(() => {
		const id = user?.id || 'guest';
		const email = user?.email || '';
		return `${id}:${email}`;
	}, [user]);

	const computedToken = tokenOverride.trim() || defaultToken;

	const appendLog = (label: string) => {
		setLogs(prev => [{ at: Date.now(), label }, ...prev].slice(0, 200));
	};

	const deriveWsUrl = (code: string): string => {
		let origin: string | undefined;
		if (API_BASE_URL.startsWith('http')) {
			const parsed = new URL(API_BASE_URL);
			origin = `${parsed.protocol}//${parsed.host}`;
		} else if (Platform.OS === 'web' && typeof window !== 'undefined') {
			origin = window.location.origin;
		} else {
			origin = 'http://localhost:8787';
		}

		const protocol = origin.startsWith('https') ? 'wss' : 'ws';
		const host = origin.replace(/^https?:\/\//, '');
		return `${protocol}://${host}/party/game-room/${code}`;
	};

	const disconnect = () => {
		if (socketRef.current) {
			socketRef.current.close();
			socketRef.current = null;
			setStatus('closed');
		}
	};

	const connect = () => {
		if (!inviteCode.trim()) {
			appendLog('Enter an invite code to connect');
			return;
		}
		disconnect();
		const baseUrl = deriveWsUrl(inviteCode.trim());
		const url = Platform.OS === 'web'
			? `${baseUrl}?token=${encodeURIComponent(computedToken)}`
			: baseUrl;

		setWsUrl(url);
		setStatus('connecting');

		const ws = Platform.OS === 'web'
			? new WebSocket(url)
			: new (WebSocket as unknown as {
				new(url: string, protocols?: string | string[], options?: { headers?: Record<string, string> }): WebSocket;
			})(url, undefined, { headers: { Authorization: `Bearer ${computedToken}` } });

		socketRef.current = ws;

		ws.onopen = () => {
			setStatus('open');
			appendLog(`connected -> ${url}`);
			ws.send(JSON.stringify({ type: 'join', characterName: user?.name || user?.email || 'Guest tester' }));
		};

		ws.onmessage = event => {
			const raw = typeof event.data === 'string' ? event.data : '';
			try {
				const parsed = JSON.parse(raw);
				const type = parsed?.type || 'message';
				appendLog(`${type}: ${raw}`);
			} catch {
				appendLog(`message: ${raw || '[binary]'}`);
			}
		};

		ws.onerror = () => {
			setStatus('error');
			appendLog('socket error');
		};

		ws.onclose = evt => {
			setStatus('closed');
			appendLog(`closed code=${evt.code} reason=${evt.reason || ''}`);
		};
	};

	const sendPing = () => {
		if (!socketRef.current || status !== 'open') {
			appendLog('connect before sending ping');
			return;
		}
		const message = pingText.trim() || 'ping';
		socketRef.current.send(JSON.stringify({ type: 'ping', message }));
		appendLog(`sent ping: ${message}`);
	};

	useEffect(() => {
		return () => {
			disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>PartyServer Test</Text>
			<Text style={styles.label}>Invite Code</Text>
			<TextInput
				value={inviteCode}
				onChangeText={setInviteCode}
				placeholder="enter invite code"
				autoCapitalize="none"
				autoCorrect={false}
				style={styles.input}
			/>

			<Text style={styles.label}>Auth Token (Bearer playerId:email)</Text>
			<TextInput
				value={tokenOverride}
				onChangeText={setTokenOverride}
				placeholder={defaultToken}
				autoCapitalize="none"
				autoCorrect={false}
				style={styles.input}
			/>

			<View style={styles.row}>
				<Pressable onPress={connect} style={[styles.button, styles.primary]}>
					<Text style={styles.buttonText}>Connect</Text>
				</Pressable>
				<Pressable onPress={disconnect} style={[styles.button, styles.secondary]}>
					<Text style={styles.buttonText}>Disconnect</Text>
				</Pressable>
			</View>

			<Text style={styles.meta}>Status: {status}</Text>
			<Text style={styles.meta} numberOfLines={2}>WS URL: {wsUrl || '(builds automatically)'}</Text>

			<Text style={styles.label}>Ping message</Text>
			<View style={styles.row}>
				<TextInput
					value={pingText}
					onChangeText={setPingText}
					placeholder="ping text"
					autoCapitalize="none"
					autoCorrect={false}
					style={[styles.input, { flex: 1 }]}
				/>
				<Pressable onPress={sendPing} style={[styles.button, styles.primary, { marginLeft: 8 }]}>
					<Text style={styles.buttonText}>Send ping</Text>
				</Pressable>
			</View>

			<Text style={styles.label}>Event log</Text>
			<ScrollView style={styles.log} contentContainerStyle={{ padding: 8 }}>
				{logs.map(entry => (
					<Text key={entry.at + entry.label} style={styles.logLine}>
						{new Date(entry.at).toLocaleTimeString()} — {entry.label}
					</Text>
				))}
				{!logs.length && <Text style={styles.meta}>No messages yet</Text>}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		paddingTop: 32,
		backgroundColor: '#0b1024',
	},
	title: {
		color: '#e5e7eb',
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 16,
	},
	label: {
		color: '#cbd5e1',
		fontSize: 14,
		marginTop: 12,
		marginBottom: 4,
	},
	input: {
		backgroundColor: '#111827',
		borderColor: '#1f2937',
		borderWidth: 1,
		borderRadius: 8,
		color: '#e5e7eb',
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
	},
	button: {
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 8,
	},
	primary: {
		backgroundColor: '#2563eb',
	},
	secondary: {
		backgroundColor: '#475569',
		marginLeft: 8,
	},
	buttonText: {
		color: '#f8fafc',
		fontWeight: '600',
	},
	meta: {
		color: '#94a3b8',
		fontSize: 12,
		marginTop: 4,
	},
	log: {
		marginTop: 8,
		borderRadius: 8,
		backgroundColor: '#0f172a',
		borderColor: '#1f2937',
		borderWidth: 1,
		minHeight: 160,
	},
	logLine: {
		color: '#e5e7eb',
		fontSize: 12,
		marginBottom: 4,
	},
});

export default PartyTestScreen;
