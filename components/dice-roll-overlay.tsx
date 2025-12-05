import React, { useEffect, useMemo } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type DiceRollOverlayProps = {
	visible: boolean;
	notation: string;
	rolls: number[];
	total: number;
	breakdown: string;
	speaker?: string;
	label?: string;
	onClose?: () => void;
};

export const DiceRollOverlay: React.FC<DiceRollOverlayProps> = ({
	visible,
	notation,
	rolls,
	total,
	breakdown,
	speaker,
	label,
	onClose,
}) => {
	const screenWidth = useMemo(() => Dimensions.get('window').width, []);
	const diceAnimations = useMemo(
		() =>
			rolls.map((_, index) => ({
				translateX: new Animated.Value(-screenWidth),
				rotate: new Animated.Value(0),
				delay: index * 120,
			})),
		[rolls, screenWidth],
	);

	useEffect(() => {
		if (!visible) return;
		if (!diceAnimations.length) return;

		const animations = diceAnimations.map(anim =>
			Animated.parallel([
				Animated.timing(anim.translateX, {
					toValue: 0,
					duration: 700,
					delay: anim.delay,
					useNativeDriver: true,
				}),
				Animated.spring(anim.rotate, {
					toValue: 1,
					useNativeDriver: true,
					speed: 12,
					bounciness: 10,
					delay: anim.delay,
				}),
			]),
		);
		Animated.stagger(80, animations).start(() => {
			if (onClose) {
				setTimeout(onClose, 2000);
			}
		});
	}, [visible, diceAnimations, onClose]);

	if (!visible) return null;

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<ThemedView style={styles.card}>
					<ThemedText style={styles.header}>
						{speaker ? `${speaker} rolls ${notation}` : `DM rolls ${notation}`}
					</ThemedText>
					{label && (
						<ThemedText style={styles.subheader}>
							for {label}
						</ThemedText>
					)}
					<View style={styles.diceRow}>
						{rolls.map((roll, idx) => {
							const anim = diceAnimations[idx];
							const rotate = anim
								? anim.rotate.interpolate({
									inputRange: [0, 1],
									outputRange: ['-30deg', '0deg'],
								})
								: '0deg';
							const translateX = anim ? anim.translateX : 0;
							return (
								<Animated.View
									key={`${roll}-${idx}`}
									style={[
										styles.die,
										{
											transform: [
												{ translateX },
												{ rotate },
											],
										},
									]}
								>
									<ThemedText style={styles.dieText}>{roll}</ThemedText>
								</Animated.View>
							);
						})}
					</View>
					<ThemedText style={styles.total}>Total: {total}</ThemedText>
					<ThemedText style={styles.breakdown}>{breakdown}</ThemedText>
				</ThemedView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	card: {
		backgroundColor: '#FFF9EF',
		borderRadius: 14,
		padding: 20,
		borderWidth: 1,
		borderColor: '#C9B037',
		minWidth: '70%',
		alignItems: 'center',
	},
	header: {
		fontWeight: '700',
		fontSize: 18,
		color: '#3B2F1B',
		textAlign: 'center',
	},
	subheader: {
		marginTop: 4,
		color: '#6B5B3D',
	},
	diceRow: {
		flexDirection: 'row',
		marginTop: 16,
		marginBottom: 12,
	},
	die: {
		width: 56,
		height: 56,
		borderRadius: 12,
		marginRight: 10,
		backgroundColor: '#F2E4C3',
		borderWidth: 1,
		borderColor: '#C9B037',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	dieText: {
		fontWeight: '700',
		fontSize: 18,
		color: '#3B2F1B',
	},
	total: {
		fontWeight: '700',
		fontSize: 16,
		color: '#2E6C40',
		marginBottom: 4,
	},
	breakdown: {
		color: '#6B5B3D',
		textAlign: 'center',
	},
});
