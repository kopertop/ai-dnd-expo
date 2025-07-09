import { Dimensions, StyleSheet } from 'react-native';

import { DnDTheme } from './dnd-theme';

// Responsive sizing logic (shared)
const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_CONTAINER_WIDTH = 1024;
const IS_SMALL_SCREEN = SCREEN_WIDTH < 600;
const MIN_CARD_WIDTH = 256;
const CARDS_PER_ROW = 5;
const CARD_MARGIN = 16;
const CARD_CONTAINER_WIDTH = IS_SMALL_SCREEN ? SCREEN_WIDTH : MAX_CONTAINER_WIDTH;
const IDEAL_CARD_WIDTH = IS_SMALL_SCREEN
	? SCREEN_WIDTH - CARD_MARGIN * 2
	: Math.floor((CARD_CONTAINER_WIDTH - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW);
const CARD_WIDTH = Math.max(MIN_CARD_WIDTH, IDEAL_CARD_WIDTH);
const IMAGE_HEIGHT = CARD_WIDTH; // 1:1 aspect ratio

export const chooserCardConstants = {
	SCREEN_WIDTH,
	MAX_CONTAINER_WIDTH,
	IS_SMALL_SCREEN,
	MIN_CARD_WIDTH,
	CARDS_PER_ROW,
	CARD_MARGIN,
	CARD_CONTAINER_WIDTH,
	IDEAL_CARD_WIDTH,
	CARD_WIDTH,
	IMAGE_HEIGHT,
};

export const chooserCardStyles = StyleSheet.create({
	cardContainer: {
		width: IS_SMALL_SCREEN ? '100%' : MAX_CONTAINER_WIDTH,
		maxWidth: MAX_CONTAINER_WIDTH,
		alignSelf: 'center',
	},
	singleCardRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 24,
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		justifyContent: 'center',
		marginBottom: 24,
		flexWrap: 'wrap',
	},
	customCardRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	card: {
		width: CARD_WIDTH,
		minWidth: MIN_CARD_WIDTH,
		backgroundColor: DnDTheme.sectionBg,
		borderWidth: 2,
		borderColor: DnDTheme.borderBrown,
		borderRadius: 14,
		marginHorizontal: IS_SMALL_SCREEN ? 0 : CARD_MARGIN / 2,
		marginBottom: 10,
		padding: 0,
		alignItems: 'center',
		shadowColor: DnDTheme.borderBrown,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 6,
	},
	customCard: {
		maxWidth: CARD_WIDTH,
		marginTop: 0,
		marginBottom: 0,
	},
	image: {
		width: CARD_WIDTH,
		minWidth: CARD_WIDTH,
		height: IMAGE_HEIGHT,
		aspectRatio: 1,
		borderTopLeftRadius: 14,
		borderTopRightRadius: 14,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		margin: 0,
		backgroundColor: DnDTheme.parchmentDark,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: DnDTheme.deepRed,
		marginTop: 10,
		marginBottom: 6,
	},
	cardDesc: {
		fontSize: 14,
		color: DnDTheme.textDark,
		textAlign: 'center',
		paddingHorizontal: 8,
		marginBottom: 12,
	},
	submitButton: {
		backgroundColor: DnDTheme.gold,
		paddingVertical: 10,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginTop: 8,
	},
	submitButtonText: {
		color: DnDTheme.textDark,
		fontWeight: 'bold',
		fontSize: 16,
	},
});
