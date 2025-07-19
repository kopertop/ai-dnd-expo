/**
 * Cactus DM Example Component
 *
 * A simple example showing how to use the Cactus DM integration
 */
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CactusDMChat } from './cactus-dm-chat';

export const CactusDMExample: React.FC = () => {
	const [diceResults, setDiceResults] = useState<Array<{ roll: string; result: number }>>([]);

	// Handle tool commands from the DM
	const handleToolCommand = (type: string, params: string) => {
		switch (type) {
			case 'roll':
				handleDiceRoll(params);
				break;
			case 'damage':
				handleDamage(params);
				break;
			case 'heal':
				handleHealing(params);
				break;
			default:
				console.log(`Unhandled tool command: ${type} with params: ${params}`);
		}
	};

	// Handle dice roll commands
	const handleDiceRoll = (params: string) => {
		// Simple dice roll simulation
		const [dice, description] = params.split(' ', 2);
		const [count, sides] = dice.split('d');

		// Parse the dice notation
		const diceCount = parseInt(count || '1', 10);
		let diceSides = 20;
		let modifier = 0;

		if (sides) {
			const sidesParts = sides.split('+');
			if (sidesParts.length > 1) {
				diceSides = parseInt(sidesParts[0], 10);
				modifier = parseInt(sidesParts[1], 10);
			} else {
				const sidesMinusParts = sides.split('-');
				if (sidesMinusParts.length > 1) {
					diceSides = parseInt(sidesMinusParts[0], 10);
					modifier = -parseInt(sidesMinusParts[1], 10);
				} else {
					diceSides = parseInt(sides, 10);
				}
			}
		}

		// Roll the dice
		let total = 0;
		for (let i = 0; i < diceCount; i++) {
			total += Math.floor(Math.random() * diceSides) + 1;
		}
		total += modifier;

		// Add to dice results
		const newRoll = {
			roll: `${diceCount}d${diceSides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''} ${description || ''}`,
			result: total,
		};

		setDiceResults(prev => [newRoll, ...prev].slice(0, 5));

		// Show alert for important rolls
		if (description?.toLowerCase().includes('attack') || description?.toLowerCase().includes('save')) {
			Alert.alert('Dice Roll', `${newRoll.roll}: ${newRoll.result}`);
		}
	};

	// Handle damage commands
	const handleDamage = (params: string) => {
		handleDiceRoll(params);
		// In a real app, you would update character health here
	};

	// Handle healing commands
	const handleHealing = (params: string) => {
		handleDiceRoll(params);
		// In a real app, you would update character health here
	};

	return (
		<View style={styles.container}>
			{/* Dice Results Display */}
			<View style={styles.diceResultsContainer}>
				<Text style={styles.diceResultsTitle}>Recent Dice Rolls</Text>
				{diceResults.length === 0 ? (
					<Text style={styles.noDiceText}>No dice rolled yet</Text>
				) : (
					diceResults.map((roll, index) => (
						<Text key={index} style={styles.diceResultText}>
							{roll.roll}: <Text style={styles.diceNumber}>{roll.result}</Text>
						</Text>
					))
				)}
			</View>

			{/* Cactus DM Chat */}
			<View style={styles.chatContainer}>
				<CactusDMChat
					playerName="Elric"
					playerClass="Wizard"
					playerRace="Human"
					currentScene="The Misty Tavern"
					onToolCommand={handleToolCommand}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
	},
	diceResultsContainer: {
		backgroundColor: '#f5f5f5',
		padding: 10,
		borderRadius: 10,
		marginBottom: 10,
		maxHeight: 150,
	},
	diceResultsTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5,
	},
	diceResultText: {
		fontSize: 14,
		marginVertical: 2,
	},
	diceNumber: {
		fontWeight: 'bold',
	},
	noDiceText: {
		fontStyle: 'italic',
		color: '#888',
	},
	chatContainer: {
		flex: 1,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: '#fff',
	},
});
