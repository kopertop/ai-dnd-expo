import React from 'react';
import {
	Alert,
	Animated,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActivityLogs, useClearActivityLogs } from '@/hooks/api/use-game-queries';

interface GameMessage {
	id: string;
	content: string;
	timestamp: number;
	speaker?: string;
}

interface NotificationsPanelProps {
	messages: GameMessage[];
	visible: boolean;
	onClose: () => void;
	unreadCount?: number;
	inviteCode?: string;
	isHost?: boolean;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
	messages,
	visible,
	onClose,
	unreadCount = 0,
	inviteCode,
	isHost = false,
}) => {
	const insets = useSafeAreaInsets();
	const slideAnim = React.useRef(new Animated.Value(0)).current;
	const {
		data: activityLogsData,
		isFetching: loadingLogs,
	} = useActivityLogs(inviteCode ?? null, 100, 0, {
		enabled: !!inviteCode && visible,
	});
	const clearActivityLogsMutation = useClearActivityLogs(inviteCode || '');
	const activityLogs = activityLogsData?.logs ?? [];
	const clearingLogs = clearActivityLogsMutation.isPending;

	React.useEffect(() => {
		if (visible) {
			Animated.spring(slideAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
		} else {
			Animated.spring(slideAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
		}
	}, [visible, slideAnim]);

	const handleClearLogs = React.useCallback(async () => {
		console.log('[Activity Log] Clear logs called', { isHost, inviteCode });
		if (!isHost || !inviteCode) {
			console.warn('[Activity Log] Cannot clear - not host or no invite code');
			return;
		}

		try {
			await clearActivityLogsMutation.mutateAsync({
				path: `/games/${inviteCode}/log`,
			});
		} catch (error) {
			console.error('[Activity Log] Failed to clear activity logs:', error);
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to clear activity logs');
		}
	}, [clearActivityLogsMutation, inviteCode, isHost]);

	const translateX = slideAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [400, 0],
	});

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.overlay}
				activeOpacity={1}
				onPress={onClose}
			>
				<Animated.View
					style={[
						styles.panel,
						{
							transform: [{ translateX }],
							paddingTop: insets.top + 16,
							paddingBottom: insets.bottom + 16,
						},
					]}
				>
					<TouchableOpacity 
						activeOpacity={1} 
						onPress={(e) => e.stopPropagation()}
						style={styles.touchableContent}
					>
						<ThemedView style={styles.panelContent}>
							<View style={styles.header}>
								<ThemedText type="subtitle">Activity Log</ThemedText>
								<View style={styles.headerRight}>
									{unreadCount > 0 && (
										<View style={styles.badge}>
											<ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
										</View>
									)}
									{isHost && activityLogs.length > 0 && (
										<TouchableOpacity
											style={[styles.clearButton, clearingLogs && styles.clearButtonDisabled]}
											onPress={() => {
												console.log('[Activity Log] Clear button pressed', { isHost, inviteCode, logsCount: activityLogs.length });
												
												if (Platform.OS === 'web') {
													const confirmed = window.confirm(
														'Are you sure you want to clear all activity logs? This cannot be undone.',
													);
													if (confirmed) {
														console.log('[Activity Log] Clear confirmed (web), calling handleClearLogs');
														handleClearLogs();
													} else {
														console.log('[Activity Log] Clear cancelled (web)');
													}
													return;
												}
												
												Alert.alert(
													'Clear Activity Log',
													'Are you sure you want to clear all activity logs? This cannot be undone.',
													[
														{ 
															text: 'Cancel', 
															style: 'cancel',
															onPress: () => console.log('[Activity Log] Clear cancelled'),
														},
														{ 
															text: 'Clear', 
															style: 'destructive', 
															onPress: () => {
																console.log('[Activity Log] Clear confirmed, calling handleClearLogs');
																handleClearLogs();
															},
														},
													],
												);
											}}
											disabled={clearingLogs}
										>
											<ThemedText style={styles.clearButtonText}>
												{clearingLogs ? 'Clearing...' : 'Clear'}
											</ThemedText>
										</TouchableOpacity>
									)}
									<TouchableOpacity style={styles.closeButton} onPress={onClose}>
										<ThemedText style={styles.closeButtonText}>✕</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
							<ScrollView 
								style={styles.scrollView} 
								contentContainerStyle={styles.scrollContent}
								showsVerticalScrollIndicator={true}
							>
								{loadingLogs ? (
									<View style={styles.emptyState}>
										<ThemedText style={styles.emptyText}>Loading activity logs...</ThemedText>
									</View>
								) : activityLogs.length === 0 && messages.length === 0 ? (
									<View style={styles.emptyState}>
										<ThemedText style={styles.emptyText}>No activity yet</ThemedText>
									</View>
								) : (
									<>
										{activityLogs.map(log => {
											const logData = log.data ? JSON.parse(log.data) : null;
											return (
												<View key={log.id} style={styles.messageItem}>
													<ThemedText style={styles.messageContent}>{log.description}</ThemedText>
													<View style={styles.messageMeta}>
														{log.actor_name && (
															<ThemedText style={styles.messageSpeaker}>{log.actor_name}</ThemedText>
														)}
														<ThemedText style={styles.messageTime}>
															{new Date(log.timestamp).toLocaleTimeString()}
														</ThemedText>
													</View>
													{log.type && (
														<ThemedText style={styles.logType}>Type: {log.type}</ThemedText>
													)}
												</View>
											);
										})}
										{messages.slice().reverse().map(message => (
											<View key={message.id} style={styles.messageItem}>
												<ThemedText style={styles.messageContent}>{message.content}</ThemedText>
												<View style={styles.messageMeta}>
													{message.speaker && (
														<ThemedText style={styles.messageSpeaker}>{message.speaker}</ThemedText>
													)}
													<ThemedText style={styles.messageTime}>
														{new Date(message.timestamp).toLocaleTimeString()}
													</ThemedText>
												</View>
											</View>
										))}
									</>
								)}
							</ScrollView>
						</ThemedView>
					</TouchableOpacity>
				</Animated.View>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
	},
	panel: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: 350,
		zIndex: 1000,
	},
	touchableContent: {
		flex: 1,
	},
	panelContent: {
		flex: 1,
		backgroundColor: '#FFF9EF',
		borderLeftWidth: 1,
		borderLeftColor: '#C9B037',
		height: '100%',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		gap: 8,
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	badge: {
		backgroundColor: '#B91C1C',
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
	closeButton: {
		padding: 4,
	},
	closeButtonText: {
		fontSize: 18,
		color: '#6B5B3D',
		fontWeight: '700',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 16,
	},
	clearButton: {
		backgroundColor: '#DC2626',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	clearButtonDisabled: {
		opacity: 0.5,
	},
	clearButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	emptyState: {
		padding: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		color: '#6B5B3D',
		fontSize: 14,
	},
	messageItem: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		gap: 8,
	},
	messageContent: {
		fontSize: 14,
		color: '#3B2F1B',
		lineHeight: 20,
	},
	messageMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	messageSpeaker: {
		fontSize: 12,
		color: '#8B6914',
		fontWeight: '600',
	},
	messageTime: {
		fontSize: 11,
		color: '#6B5B3D',
	},
	logType: {
		fontSize: 11,
		color: '#8B6914',
		fontStyle: 'italic',
		marginTop: 4,
	},
});

