import React from 'react';
import {
	Animated,
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
	messages,
	visible,
	onClose,
	unreadCount = 0,
}) => {
	const insets = useSafeAreaInsets();
	const slideAnim = React.useRef(new Animated.Value(0)).current;

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
					<TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
						<ThemedView style={styles.panelContent}>
							<View style={styles.header}>
								<ThemedText type="subtitle">Activity Log</ThemedText>
								{unreadCount > 0 && (
									<View style={styles.badge}>
										<ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
									</View>
								)}
								<TouchableOpacity style={styles.closeButton} onPress={onClose}>
									<ThemedText style={styles.closeButtonText}>✕</ThemedText>
								</TouchableOpacity>
							</View>
							<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
								{messages.length === 0 ? (
									<View style={styles.emptyState}>
										<ThemedText style={styles.emptyText}>No activity yet</ThemedText>
									</View>
								) : (
									messages.slice().reverse().map(message => (
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
									))
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
	panelContent: {
		flex: 1,
		backgroundColor: '#FFF9EF',
		borderLeftWidth: 1,
		borderLeftColor: '#C9B037',
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
});

