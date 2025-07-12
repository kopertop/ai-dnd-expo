import { Platform, StyleSheet } from 'react-native';

import { DnDTheme } from './dnd-theme';

export default StyleSheet.create({
	container: {
		marginTop: -45,
		backgroundColor: DnDTheme.parchment,
		borderTopWidth: 1,
		borderTopColor: DnDTheme.borderBrown,
		borderBottomWidth: 1,
		borderBottomColor: DnDTheme.borderBrown,
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: DnDTheme.borderBrown,
		borderTopWidth: 1,
		borderTopColor: DnDTheme.borderBrown,
		backgroundColor: 'transparent',
	},
	headerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: DnDTheme.textDark,
	},
	messagesContainer: {
		maxHeight: 300,
		backgroundColor: DnDTheme.parchment,
	},
	messagesContent: {
		padding: 16,
		gap: 12,
	},
	emptyState: {
		alignItems: 'center',
		padding: 20,
	},
	emptyText: {
		fontSize: 16,
		color: DnDTheme.textDark,
		textAlign: 'center',
		fontStyle: 'italic',
	},
	messageContainer: {
		padding: 12,
		borderRadius: 12,
		maxWidth: '85%',
	},
	playerMessage: {
		alignSelf: 'flex-end',
		backgroundColor: DnDTheme.gold,
		borderBottomRightRadius: 4,
	},
	dmMessage: {
		alignSelf: 'flex-start',
		backgroundColor: DnDTheme.parchment,
		borderBottomLeftRadius: 4,
	},
	speaker: {
		fontSize: 12,
		fontWeight: '600',
		color: DnDTheme.gold,
		marginBottom: 4,
	},
	messageText: {
		fontSize: 15,
		lineHeight: 20,
		color: DnDTheme.textDark,
	},
	systemText: {
		fontStyle: 'italic',
		color: DnDTheme.textDark,
	},
	toolResults: {
		marginTop: 8,
		gap: 4,
	},
	toolCall: {
		padding: 6,
		backgroundColor: DnDTheme.parchment,
		borderRadius: 6,
		borderLeftWidth: 3,
		borderLeftColor: DnDTheme.gold,
	},
	diceRoll: {
		fontSize: 13,
		color: DnDTheme.textDark,
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
	},
	characterUpdate: {
		fontSize: 13,
		color: DnDTheme.gold,
	},
	ruleLookup: {
		fontSize: 13,
		color: DnDTheme.textDark,
	},
	timestamp: {
		fontSize: 11,
		color: DnDTheme.textDark,
		marginTop: 4,
		textAlign: 'right',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
	},
	loadingText: {
		fontSize: 14,
		color: DnDTheme.textDark,
		fontStyle: 'italic',
	},
	quickActions: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: DnDTheme.borderBrown,
		backgroundColor: DnDTheme.parchment,
	},
	quickActionButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginRight: 8,
		backgroundColor: DnDTheme.gold,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: DnDTheme.gold,
	},
	quickActionText: {
		fontSize: 12,
		color: DnDTheme.textDark,
		fontWeight: '500',
	},
	inputContainer: {
		flexDirection: 'row',
		padding: 16,
		gap: 12,
		alignItems: 'flex-end',
		backgroundColor: DnDTheme.parchment,
	},
	textInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: DnDTheme.borderBrown,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: DnDTheme.textDark,
		backgroundColor: DnDTheme.parchment,
		maxHeight: 100,
	},
	sendButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: DnDTheme.gold,
		color: DnDTheme.textLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendButtonDisabled: {
		backgroundColor: DnDTheme.borderBrown,
	},
});
