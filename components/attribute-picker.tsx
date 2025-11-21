import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CARD_GAP, cardGridStyles, SCREEN_WIDTH } from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';

import { Colors } from '@/constants/colors';
import { ClassOption } from '@/types/class-option';
import { STAT_KEYS, StatBlock, StatKey } from '@/types/stats';

const POINT_BUY_COST: Record<number, number> = {
	8: 0,
	9: 1,
	10: 2,
	11: 3,
	12: 4,
	13: 5,
	14: 7,
	15: 9,
};
const MIN_STAT = 8;
const MAX_STAT = 15;
const POINT_BUY_TOTAL = 27;

function getPointBuyTotal(stats: StatBlock): number {
	return STAT_KEYS.reduce((sum: number, key: StatKey) => sum + POINT_BUY_COST[stats[key]], 0);
}

interface AttributePickerProps {
	classOption: ClassOption;
	initialStats?: StatBlock;
	onConfirm: (stats: StatBlock) => void;
}

function adjustStatsToBudget(
	stats: StatBlock,
	classOption: ClassOption,
	budget: number,
): StatBlock {
	let adjusted = { ...stats };
	let total = getPointBuyTotal(adjusted);

	const getPriority = (key: StatKey) => {
		if (classOption.primaryStats.includes(key)) return 2;
		if (classOption.secondaryStats?.includes(key)) return 1;
		return 0;
	};

	while (total > budget) {
		const keyToReduce = [...STAT_KEYS]
			.sort((a, b) => {
				const priorityDiff = getPriority(a) - getPriority(b);
				if (priorityDiff !== 0) return priorityDiff;
				return adjusted[b] - adjusted[a];
			})
			.find(key => adjusted[key] > MIN_STAT);

		if (!keyToReduce) break;

		adjusted = { ...adjusted, [keyToReduce]: adjusted[keyToReduce] - 1 };
		total = getPointBuyTotal(adjusted);
	}

	return adjusted;
}

export const AttributePicker: React.FC<AttributePickerProps> = ({
	classOption,
	initialStats,
	onConfirm,
}) => {
	const [stats, setStats] = useState<StatBlock>(() => {
		if (initialStats) return { ...initialStats };
		const s: StatBlock = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
		for (const key of STAT_KEYS) {
			if (classOption.primaryStats.includes(key)) s[key] = 15;
			else if (classOption.secondaryStats?.includes(key)) s[key] = 12;
		}
		return adjustStatsToBudget(s, classOption, POINT_BUY_TOTAL);
	});

	const pointsUsed = getPointBuyTotal(stats);
	const pointsRemaining = POINT_BUY_TOTAL - pointsUsed;

	const handleChange = (key: StatKey, delta: number) => {
		const newValue = stats[key] + delta;
		if (newValue < MIN_STAT || newValue > MAX_STAT) return;
		const newStats = { ...stats, [key]: newValue };
		if (getPointBuyTotal(newStats) > POINT_BUY_TOTAL) return;
		setStats(newStats);
	};

	const isPrimary = classOption.primaryStats.includes.bind(classOption.primaryStats);
	const isSecondary =
		classOption.secondaryStats?.includes.bind(classOption.secondaryStats) ?? (() => false);
	// Always 3 per row
	const containerWidth = SCREEN_WIDTH;
	const cardWidth = Math.floor((containerWidth - CARD_GAP * 4) / 3);
	const cardHeight = cardWidth;
	const styles = cardGridStyles(containerWidth);

	return (
		<View style={{ flex: 1, position: 'relative', alignItems: 'center' }}>
			<ScrollView
				contentContainerStyle={[
					newGameStyles.scrollViewContent,
					{
						width: '100%',
						margin: 0,
						paddingBottom: 96,
					},
				]}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={newGameStyles.title}>Assign Attributes</Text>
				<Text
					style={{
						textAlign: 'center',
						fontSize: 18,
						fontWeight: 'bold',
						marginBottom: 16,
					}}
				>
					Points Left: {pointsRemaining}
				</Text>
				<View
					style={{
						flexDirection: 'row',
						flexWrap: 'wrap',
						justifyContent: 'center',
						width: containerWidth,
						alignSelf: 'center',
					}}
				>
					{STAT_KEYS.map(key => (
						<View
							key={key}
							style={[
								styles.card,
								{
									width: cardWidth,
									height: cardHeight,
									maxWidth: 256,
									maxHeight: 256,
									marginHorizontal: CARD_GAP / 2,
									marginBottom: CARD_GAP,
									alignItems: 'center',
									justifyContent: 'center',
								},
								isPrimary(key) && textStyles.primaryStatBox,
								!isPrimary(key) && isSecondary(key) && textStyles.secondaryStatBox,
							]}
						>
							<Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
								{key}
							</Text>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									marginBottom: 8,
								}}
							>
								<TouchableOpacity
									onPress={() => handleChange(key, -1)}
									disabled={stats[key] <= MIN_STAT}
									style={{
										padding: 8,
										opacity: stats[key] <= MIN_STAT ? 0.4 : 1,
									}}
								>
									<Text style={{ fontSize: 28, fontWeight: 'bold' }}>-</Text>
								</TouchableOpacity>
								<Text
									style={{
										fontSize: 28,
										fontWeight: 'bold',
										marginHorizontal: 12,
									}}
								>
									{stats[key]}
								</Text>
								<TouchableOpacity
									onPress={() => handleChange(key, 1)}
									disabled={
										stats[key] >= MAX_STAT ||
										getPointBuyTotal({ ...stats, [key]: stats[key] + 1 }) >
											POINT_BUY_TOTAL
									}
									style={{
										padding: 8,
										opacity:
											stats[key] >= MAX_STAT ||
											getPointBuyTotal({ ...stats, [key]: stats[key] + 1 }) >
												POINT_BUY_TOTAL
												? 0.4
												: 1,
									}}
								>
									<Text style={{ fontSize: 28, fontWeight: 'bold' }}>+</Text>
								</TouchableOpacity>
							</View>

							{isPrimary(key) && <Text style={textStyles.textPrimary}>PRIMARY</Text>}
							{!isPrimary(key) && isSecondary(key) && (
								<Text style={textStyles.textSecondary}>SECONDARY</Text>
							)}
						</View>
					))}
				</View>
			</ScrollView>
			{/* Sticky confirm button */}
			<View
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(255,255,255,0.95)',
					padding: 0,
					margin: 0,
					alignItems: 'center',
					borderColor: '#eee',
					zIndex: 100,
				}}
			>
				<TouchableOpacity
					style={[
						pointsRemaining === 0
							? newGameStyles.submitButton
							: newGameStyles.submitButtonDisabled,
						{
							width: '100%',
							margin: 0,
							opacity: 1,
							borderRadius: 0,
							borderTopLeftRadius: 0,
							borderTopRightRadius: 0,
						},
					]}
					disabled={pointsRemaining !== 0}
					onPress={() => onConfirm(stats)}
				>
					<Text style={newGameStyles.submitButtonText}>Confirm Attributes</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const textStyles = StyleSheet.create({
	textPrimary: {
		fontSize: 12,
		color: Colors.primary,
		fontWeight: 'bold',
		textTransform: 'uppercase',
		marginTop: 2,
	},
	textSecondary: {
		fontSize: 12,
		color: Colors.secondary,
		fontWeight: 'bold',
		textTransform: 'uppercase',
		marginTop: 2,
	},
	primaryStatBox: {
		borderColor: '#C9B037',
		backgroundColor: '#FFF8E1',
	},
	secondaryStatBox: {
		borderColor: '#8B2323',
	},
});
