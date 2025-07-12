import { Dimensions, StyleSheet } from 'react-native';

import { DnDTheme } from './dnd-theme';

// Responsive sizing logic (shared) - now dynamic
export const getChooserCardConstants = () => {
	const SCREEN_WIDTH = Dimensions.get('window').width;
	const MAX_CONTAINER_WIDTH = 1024;
	const IS_MOBILE = SCREEN_WIDTH < 768; // Bootstrap md breakpoint  
	const IS_SMALL_SCREEN = SCREEN_WIDTH < 600;
	const MIN_CARD_WIDTH = IS_MOBILE ? 280 : 256;
	const CARDS_PER_ROW = IS_MOBILE ? 1 : 5;
	const CARD_MARGIN = IS_MOBILE ? 12 : 16;
	const CARD_CONTAINER_WIDTH = IS_MOBILE ? SCREEN_WIDTH : MAX_CONTAINER_WIDTH;
	const IDEAL_CARD_WIDTH = IS_MOBILE
		? Math.min(SCREEN_WIDTH - CARD_MARGIN * 2, 400) // Max width on mobile
		: Math.floor((CARD_CONTAINER_WIDTH - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW);
	const CARD_WIDTH = Math.max(MIN_CARD_WIDTH, IDEAL_CARD_WIDTH);
	const IMAGE_HEIGHT = IS_MOBILE ? Math.min(CARD_WIDTH * 0.8, 300) : CARD_WIDTH; // Shorter on mobile
	
	return {
		SCREEN_WIDTH,
		MAX_CONTAINER_WIDTH,
		IS_MOBILE,
		IS_SMALL_SCREEN,
		MIN_CARD_WIDTH,
		CARDS_PER_ROW,
		CARD_MARGIN,
		CARD_CONTAINER_WIDTH,
		IDEAL_CARD_WIDTH,
		CARD_WIDTH,
		IMAGE_HEIGHT,
	};
};

// Legacy export for compatibility (uses current screen size)
export const chooserCardConstants = getChooserCardConstants();

export const chooserCardStyles = StyleSheet.create({
	cardContainer: {
		width: chooserCardConstants.IS_SMALL_SCREEN ? '100%' : chooserCardConstants.MAX_CONTAINER_WIDTH,
		maxWidth: chooserCardConstants.MAX_CONTAINER_WIDTH,
		alignSelf: 'center',
	},
	singleCardRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: chooserCardConstants.IS_MOBILE ? 16 : 24,
	},
	cardRow: {
		flexDirection: chooserCardConstants.IS_MOBILE ? 'column' : 'row',
		alignItems: chooserCardConstants.IS_MOBILE ? 'center' : 'stretch',
		justifyContent: 'center',
		marginBottom: chooserCardConstants.IS_MOBILE ? 16 : 24,
		flexWrap: 'wrap',
	},
	customCardRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	card: {
		width: chooserCardConstants.CARD_WIDTH,
		minWidth: chooserCardConstants.MIN_CARD_WIDTH,
		backgroundColor: DnDTheme.sectionBg,
		borderWidth: 2,
		borderColor: DnDTheme.borderBrown,
		borderRadius: 14,
		marginHorizontal: chooserCardConstants.IS_MOBILE ? 0 : chooserCardConstants.CARD_MARGIN / 2,
		marginBottom: chooserCardConstants.IS_MOBILE ? 16 : 10,
		padding: 0,
		alignItems: 'center',
		shadowColor: DnDTheme.borderBrown,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 6,
	},
	customCard: {
		maxWidth: chooserCardConstants.CARD_WIDTH,
		marginTop: 0,
		marginBottom: 0,
	},
	image: {
		width: chooserCardConstants.CARD_WIDTH,
		minWidth: chooserCardConstants.CARD_WIDTH,
		height: chooserCardConstants.IMAGE_HEIGHT,
		aspectRatio: chooserCardConstants.IS_MOBILE ? undefined : 1,
		borderTopLeftRadius: 14,
		borderTopRightRadius: 14,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		margin: 0,
		backgroundColor: DnDTheme.parchmentDark,
	},
	cardTitle: {
		fontSize: chooserCardConstants.IS_MOBILE ? 18 : 20,
		fontWeight: 'bold',
		color: DnDTheme.deepRed,
		marginTop: chooserCardConstants.IS_MOBILE ? 8 : 10,
		marginBottom: chooserCardConstants.IS_MOBILE ? 4 : 6,
		textAlign: 'center',
		paddingHorizontal: 8,
	},
	cardDesc: {
		fontSize: chooserCardConstants.IS_MOBILE ? 13 : 14,
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
