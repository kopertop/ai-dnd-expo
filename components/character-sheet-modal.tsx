import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface CharacterSheetModalProps {
	visible: boolean;
	characterSheet: {
		name: string;
		description: string;
		stats: Record<string, number>;
		skills?: string[];
	};
	onClose: () => void;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({ visible, characterSheet, onClose }) => {
	if (!characterSheet) return null;
	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.overlay}>
				<ThemedView style={styles.modalBox}>
					<ScrollView contentContainerStyle={styles.content}>
						<ThemedText type="title" style={styles.title}>
							<Text>Character Sheet</Text>
						</ThemedText>
						<ThemedText style={styles.label}><Text>Name:</Text></ThemedText>
						<ThemedText style={styles.value}><Text>{characterSheet.name}</Text></ThemedText>
						<ThemedText style={styles.label}><Text>Description:</Text></ThemedText>
						<ThemedText style={styles.value}><Text>{characterSheet.description}</Text></ThemedText>
						<ThemedText style={styles.label}><Text>Stats:</Text></ThemedText>
						<View style={styles.statsRow}>
							{characterSheet.stats && Object.entries(characterSheet.stats).map(([key, value]) => (
								<View key={key} style={styles.statItem}>
									<ThemedText><Text>{key}: {value}</Text></ThemedText>
								</View>
							))}
						</View>
						{characterSheet.skills && characterSheet.skills.length > 0 && (
							<>
								<ThemedText style={styles.label}><Text>Skills:</Text></ThemedText>
								<ThemedText style={styles.value}><Text>{characterSheet.skills.join(', ')}</Text></ThemedText>
							</>
						)}
					</ScrollView>
					<TouchableOpacity style={styles.closeBtn} onPress={onClose}>
						<Text style={styles.closeBtnText}>Close</Text>
					</TouchableOpacity>
				</ThemedView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalBox: {
		width: '90%',
		maxWidth: 500,
		borderRadius: 18,
		backgroundColor: '#FFF8E1',
		padding: 24,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.18,
		shadowRadius: 10,
		elevation: 8,
	},
	content: {
		alignItems: 'flex-start',
		width: '100%',
	},
	title: {
		alignSelf: 'center',
		marginBottom: 18,
	},
	label: {
		fontWeight: 'bold',
		marginTop: 10,
		color: '#8B2323',
	},
	value: {
		marginLeft: 8,
		marginBottom: 4,
		color: '#3B2F1B',
	},
	statsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
	},
	statItem: {
		marginRight: 16,
		marginBottom: 8,
	},
	closeBtn: {
		marginTop: 24,
		alignSelf: 'center',
		backgroundColor: '#C9B037',
		paddingVertical: 10,
		paddingHorizontal: 32,
		borderRadius: 8,
	},
	closeBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
