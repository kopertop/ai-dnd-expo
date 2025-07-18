import { foundationModels } from '@react-native-ai/apple';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { SimpleAIManager } from '../services/ai/simple-ai-manager';
import { IOSVoiceService } from '../services/voice/ios-voice-service';

interface DnDDemo {
	name: string;
	func: () => Promise<any>;
}

const dndDemos: Record<string, DnDDemo> = {
	checkAvailability: {
		name: 'Check Apple Intelligence',
		func: async () => {
			const isAvailable = foundationModels.isAvailable();
			// Mock availability in simulator for development
			const isMockMode = __DEV__ && !isAvailable;
			return { 
				available: isAvailable, 
				mockMode: isMockMode,
				message: isMockMode ? 'Running in mock mode (simulator)' : 'Native Apple Intelligence'
			};
		},
	},
	generateDMResponse: {
		name: 'Generate DM Response',
		func: async () => {
			const aiManager = new SimpleAIManager();
			const isAvailable = aiManager.isAvailable();
			
			// Mock Apple Intelligence response in simulator
			if (__DEV__ && !isAvailable) {
				// Simulate processing delay
				await new Promise(resolve => setTimeout(resolve, 1000));
				return {
					response: "🎲 MOCK APPLE INTELLIGENCE RESPONSE:\n\nYou swing your sword at the goblin! Roll for attack... *rolls d20* You rolled a 15! Your blade finds its mark, dealing 8 damage to the snarling creature. The goblin staggers back, wounded but still fighting!",
					mockMode: true,
					fallback: "Cactus Compute not configured - using mock response"
				};
			}

			if (!isAvailable) {
				throw new Error('Apple Intelligence not available');
			}

			const response = await aiManager.generateResponse(
				'I want to attack the goblin with my sword',
				{
					playerName: 'Aragorn',
					playerClass: 'Ranger',
					playerRace: 'Human',
					currentScene: 'Dark Forest Clearing',
					gameHistory: ['You encounter a snarling goblin blocking your path'],
					playerHealth: 85,
					playerLevel: 3,
				},
			);

			return response;
		},
	},
	testVoice: {
		name: 'Test Voice Services',
		func: async () => {
			const voiceService = new IOSVoiceService();
			const status = await voiceService.healthCheck();

			if (status.tts) {
				await voiceService.speak('Welcome to your D&D adventure!', { voice: 'dm' });
			}

			return status;
		},
	},
	generateNPC: {
		name: 'Generate NPC Dialogue',
		func: async () => {
			const aiManager = new SimpleAIManager();
			const isAvailable = aiManager.isAvailable();
			
			// Mock Apple Intelligence NPC response in simulator
			if (__DEV__ && !isAvailable) {
				// Simulate processing delay
				await new Promise(resolve => setTimeout(resolve, 800));
				return {
					dialogue: "🎭 MOCK APPLE INTELLIGENCE NPC:\n\n*Elara wipes down a mug with a worn cloth, her eyes darting nervously*\n\n\"Aye, I heard whispers about old Merchant Grimbold. Haven't seen him pass through in nigh on a week now. That's... unusual for him. He always stops here on his way to market.\"\n\n*She leans in closer, lowering her voice*\n\n\"Some say they heard strange howls from the Darkwood path he usually takes. But that's just tavern talk, mind you...\"",
					mockMode: true,
					npcName: "Elara the Innkeeper (Mock)"
				};
			}

			if (!isAvailable) {
				throw new Error('Apple Intelligence not available');
			}

			const dialogue = await aiManager.generateNPCDialogue(
				'Elara the Innkeeper',
				'Friendly but cautious, knows local rumors',
				'Do you know anything about the missing merchant?',
				{
					playerName: 'Thorin',
					playerClass: 'Paladin',
					playerRace: 'Dwarf',
					currentScene: 'The Prancing Pony Inn',
					gameHistory: ['You enter the warm, bustling inn'],
					playerHealth: 100,
					playerLevel: 2,
				},
			);

			return { dialogue };
		},
	},
};

export default function AppleAIDemo() {
	const [loading, setLoading] = useState<string | null>(null);
	const isAvailable = foundationModels.isAvailable();
	const isMockMode = __DEV__ && !isAvailable;

	const runDemo = async (key: string) => {
		if (loading) return;

		setLoading(key);
		try {
			const result = await dndDemos[key].func();
			Alert.alert('Success', JSON.stringify(result, null, 2));
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : String(error),
			);
		} finally {
			setLoading(null);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>AI D&D Demo</Text>
			<Text style={styles.status}>
				Apple Intelligence: {isAvailable ? '✅ Available' : '❌ Not Available'}
				{isMockMode && '\n🎭 Mock Mode Enabled (Simulator)'}
			</Text>

			<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
				{Object.entries(dndDemos).map(([key, demo]) => (
					<TouchableOpacity
						key={key}
						style={[styles.button, loading !== null && styles.buttonDisabled]}
						onPress={() => runDemo(key)}
						disabled={loading !== null}
					>
						<View style={styles.buttonContent}>
							{loading === key && (
								<ActivityIndicator size="small" color="#fff" style={styles.spinner} />
							)}
							<Text style={styles.buttonText}>{demo.name}</Text>
						</View>
					</TouchableOpacity>
				))}
			</ScrollView>

			<StatusBar style="auto" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingTop: 60,
		paddingHorizontal: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 10,
	},
	status: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
		color: '#666',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 20,
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderRadius: 8,
		marginBottom: 10,
		minHeight: 50,
		justifyContent: 'center',
	},
	buttonDisabled: {
		backgroundColor: '#999',
	},
	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
	},
	spinner: {
		marginRight: 8,
	},
});