import React, { useState } from 'react';
import { StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DnDModelChat from '@/components/dnd-model-chat';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type DnDMessage } from '@/services/dnd-model';

const DnDModelScreen = () => {
	const [isModelReady, setIsModelReady] = useState(false);

	// Sample D&D context for demonstration
	const sampleContext: DnDMessage['context'] = {
		role: 'Dungeon Master',
		world: 'Forgotten Realms',
		location: 'The Prancing Pony Tavern',
		party: [
			'Thordak (Dragonborn Fighter, Level 5, HP: 45/45)',
			'Elara (Elf Wizard, Level 5, HP: 28/28)',
			'Grimm (Dwarf Cleric, Level 5, HP: 38/38)',
		],
		playerHealth: {
			Thordak: 45,
			Elara: 28,
			Grimm: 38,
		},
		inventory: [
			'Longsword +1',
			'Shield',
			'Healing Potion (2)',
			'Spell Components',
			'50 gold pieces',
		],
	};

	const handleModelReady = (ready: boolean) => {
		setIsModelReady(ready);
		if (ready) {
			Alert.alert(
				'🎲 D&D Model Ready!',
				'Your AI Dungeon Master is ready to help with your adventure. Try asking about:\n\n• Rolling dice\n• Combat scenarios\n• Roleplay situations\n• Game rules\n\nExample: "I want to search for traps"',
				[{ text: 'Start Adventure!', style: 'default' }],
			);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<ThemedView style={styles.header}>
				<ThemedText style={styles.title}>🎲 D&D AI Model</ThemedText>
				<ThemedText style={styles.subtitle}>
					{isModelReady ? 'Ready to Adventure!' : 'Loading AI Dungeon Master...'}
				</ThemedText>
			</ThemedView>

			<ThemedView style={styles.descriptionContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<ThemedView style={styles.featureCard}>
						<ThemedText style={styles.featureTitle}>🎯 Smart Tool Calls</ThemedText>
						<ThemedText style={styles.featureDesc}>
							Automatically handles dice rolls, health tracking, and ability checks
						</ThemedText>
					</ThemedView>
					<ThemedView style={styles.featureCard}>
						<ThemedText style={styles.featureTitle}>🗣️ Contextual Roleplay</ThemedText>
						<ThemedText style={styles.featureDesc}>
							Remembers party members, location, and ongoing story elements
						</ThemedText>
					</ThemedView>
					<ThemedView style={styles.featureCard}>
						<ThemedText style={styles.featureTitle}>⚔️ Combat Ready</ThemedText>
						<ThemedText style={styles.featureDesc}>
							Manages initiative, attacks, and tactical scenarios
						</ThemedText>
					</ThemedView>
				</ScrollView>
			</ThemedView>

			<DnDModelChat initialContext={sampleContext} onModelReady={handleModelReady} />

			<ThemedView style={styles.footer}>
				<ThemedText style={styles.footerText}>
					Powered by custom-trained HuggingFace model • Try commands like "roll 1d20" or
					"I attack the goblin"
				</ThemedText>
			</ThemedView>
		</SafeAreaView>
	);
};

export default DnDModelScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 20,
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(128, 128, 128, 0.3)',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		opacity: 0.8,
		textAlign: 'center',
	},
	descriptionContainer: {
		paddingVertical: 16,
	},
	featureCard: {
		padding: 16,
		marginHorizontal: 8,
		borderRadius: 12,
		backgroundColor: 'rgba(128, 128, 128, 0.1)',
		minWidth: 180,
	},
	featureTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	featureDesc: {
		fontSize: 14,
		opacity: 0.8,
		lineHeight: 18,
	},
	footer: {
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: 'rgba(128, 128, 128, 0.3)',
		alignItems: 'center',
	},
	footerText: {
		fontSize: 12,
		opacity: 0.6,
		textAlign: 'center',
		lineHeight: 16,
	},
});
