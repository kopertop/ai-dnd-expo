import { Dimensions, StyleSheet } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_SMALL_SCREEN = SCREEN_WIDTH < 600;
export const MAX_CONTAINER_WIDTH = 1024;
export const CARD_MARGIN = IS_SMALL_SCREEN ? 4 : 12;
export const CARD_GAP = CARD_MARGIN * 2;

// Responsive: 2 per row <600px, 3 per row <900px, 4 per row otherwise
export function getCardsPerRow(width: number = SCREEN_WIDTH) {
	if (width >= 900) return 4;
	if (width >= 600) return 3;
	return 2;
}

export function getContainerWidth(width: number = SCREEN_WIDTH) {
	return Math.min(width, MAX_CONTAINER_WIDTH);
}

export function getCardWidth(width: number = SCREEN_WIDTH) {
	const cardsPerRow = getCardsPerRow(width);
	const containerWidth = getContainerWidth(width);
	return Math.floor((containerWidth - CARD_GAP * (cardsPerRow + 1)) / cardsPerRow);
}

export function getCardHeight(cardWidth: number) {
	return cardWidth * 2; // 1:2 aspect ratio
}

export const cardGridStyles = (width: number = SCREEN_WIDTH) => {
	const containerWidth = getContainerWidth(width);
	const cardWidth = getCardWidth(width);
	const cardHeight = getCardHeight(cardWidth);
	return StyleSheet.create({
		cardContainer: {
			width: containerWidth,
			maxWidth: MAX_CONTAINER_WIDTH,
			alignSelf: 'center',
			flexDirection: 'row',
			flexWrap: 'wrap',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			marginHorizontal: CARD_GAP,
		},
		card: {
			width: cardWidth,
			height: cardHeight,
			backgroundColor: '#F9F6EF',
			borderWidth: 2,
			borderColor: '#8B5C2A',
			borderRadius: 14,
			marginBottom: CARD_GAP,
			marginHorizontal: CARD_GAP / 2,
			padding: 0,
			alignItems: 'center',
			shadowColor: '#8B5C2A',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.12,
			shadowRadius: 6,
			display: 'flex',
			flexDirection: 'column',
			position: 'relative',
		},
		imageWrapper: {
			width: '100%',
			height: '100%',
			borderRadius: 14,
			overflow: 'hidden',
			position: 'relative',
		},
		image: {
			width: '100%',
			height: '100%',
			borderRadius: 14,
		},
		overlay: {
			position: 'absolute',
			bottom: 0,
			left: 0,
			width: '100%',
			backgroundColor: 'rgba(0,0,0,0.45)',
			paddingVertical: 12,
			paddingHorizontal: 8,
			borderBottomLeftRadius: 14,
			borderBottomRightRadius: 14,
		},
		cardTitle: {
			fontSize: 18,
			fontWeight: 'bold',
			color: '#fff',
			marginBottom: 4,
			textAlign: 'center',
		},
		cardDesc: {
			fontSize: 13,
			color: '#fff',
			textAlign: 'center',
		},
	});
};
