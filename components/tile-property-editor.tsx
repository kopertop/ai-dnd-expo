import React, { useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	Switch,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface TileProperties {
	terrainType: string;
	movementCost: number;
	isBlocked: boolean;
	isDifficult: boolean;
	providesCover: boolean;
	coverType: 'half' | 'three-quarters' | 'full' | null;
	elevation: number;
	featureType: string | null;
}

interface TilePropertyEditorProps {
	properties: TileProperties;
	onChange: (properties: TileProperties) => void;
	onClose: () => void;
}

export const TilePropertyEditor: React.FC<TilePropertyEditorProps> = ({
	properties,
	onChange,
	onClose,
}) => {
	const [localProps, setLocalProps] = useState<TileProperties>(properties);

	const handleChange = <K extends keyof TileProperties>(key: K, value: TileProperties[K]) => {
		const newProps = { ...localProps, [key]: value };

		// Auto-update logic
		if (key === 'isBlocked' && value === true) {
			newProps.movementCost = 999;
			newProps.isDifficult = false;
		}

		if (key === 'isDifficult' && value === true) {
			newProps.isBlocked = false;
			if (newProps.movementCost <= 1) newProps.movementCost = 2;
		} else if (key === 'isDifficult' && value === false && !newProps.isBlocked) {
			if (newProps.movementCost === 2) newProps.movementCost = 1;
		}

		if (key === 'providesCover' && value === false) {
			newProps.coverType = null;
		} else if (key === 'providesCover' && value === true && !newProps.coverType) {
			newProps.coverType = 'half';
		}

		setLocalProps(newProps);
		onChange(newProps);
	};

	return (
		<ThemedView style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="subtitle">Tile Properties</ThemedText>
				<TouchableOpacity onPress={onClose}>
					<ThemedText style={styles.closeButton}>✕</ThemedText>
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent}>
				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Movement & Terrain</ThemedText>

					<View style={styles.row}>
						<ThemedText>Terrain Type</ThemedText>
						<TextInput
							style={styles.input}
							value={localProps.terrainType}
							onChangeText={(text) => handleChange('terrainType', text)}
						/>
					</View>

					<View style={styles.row}>
						<ThemedText>Movement Cost</ThemedText>
						<TextInput
							style={[styles.input, styles.numberInput]}
							value={localProps.movementCost.toString()}
							keyboardType="numeric"
							onChangeText={(text) => {
								const val = parseFloat(text);
								if (!isNaN(val)) handleChange('movementCost', val);
							}}
						/>
					</View>

					<View style={styles.toggleRow}>
						<ThemedText>Blocked (Impassible)</ThemedText>
						<Switch
							value={localProps.isBlocked}
							onValueChange={(val) => handleChange('isBlocked', val)}
							trackColor={{ false: '#767577', true: '#DC3545' }}
						/>
					</View>

					<View style={styles.toggleRow}>
						<ThemedText>Difficult Terrain</ThemedText>
						<Switch
							value={localProps.isDifficult}
							onValueChange={(val) => handleChange('isDifficult', val)}
							trackColor={{ false: '#767577', true: '#E9D8A6' }}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Cover & Visibility</ThemedText>

					<View style={styles.toggleRow}>
						<ThemedText>Provides Cover</ThemedText>
						<Switch
							value={localProps.providesCover}
							onValueChange={(val) => handleChange('providesCover', val)}
							trackColor={{ false: '#767577', true: '#4CAF50' }}
						/>
					</View>

					{localProps.providesCover && (
						<View style={styles.optionGroup}>
							<TouchableOpacity
								style={[styles.option, localProps.coverType === 'half' && styles.selectedOption]}
								onPress={() => handleChange('coverType', 'half')}
							>
								<ThemedText style={localProps.coverType === 'half' ? styles.selectedText : undefined}>
									Half (+2)
								</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.option, localProps.coverType === 'three-quarters' && styles.selectedOption]}
								onPress={() => handleChange('coverType', 'three-quarters')}
							>
								<ThemedText style={localProps.coverType === 'three-quarters' ? styles.selectedText : undefined}>
									3/4 (+5)
								</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.option, localProps.coverType === 'full' && styles.selectedOption]}
								onPress={() => handleChange('coverType', 'full')}
							>
								<ThemedText style={localProps.coverType === 'full' ? styles.selectedText : undefined}>
									Full
								</ThemedText>
							</TouchableOpacity>
						</View>
					)}
				</View>

				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Details</ThemedText>

					<View style={styles.row}>
						<ThemedText>Elevation</ThemedText>
						<TextInput
							style={[styles.input, styles.numberInput]}
							value={localProps.elevation.toString()}
							keyboardType="numeric"
							onChangeText={(text) => {
								const val = parseInt(text, 10);
								if (!isNaN(val)) handleChange('elevation', val);
							}}
						/>
					</View>

					<View style={styles.row}>
						<ThemedText>Feature Type</ThemedText>
						<TextInput
							style={styles.input}
							value={localProps.featureType || ''}
							placeholder="None"
							onChangeText={(text) => handleChange('featureType', text || null)}
						/>
					</View>
				</View>
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#3B2F1B',
		backgroundColor: '#1F130A',
		maxHeight: 500,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	closeButton: {
		fontSize: 20,
		color: '#8B7355',
		padding: 4,
	},
	scrollContent: {
		flexGrow: 0,
	},
	section: {
		marginBottom: 20,
		gap: 12,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#CAB08A',
		marginBottom: 4,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.1)',
		paddingBottom: 4,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	input: {
		backgroundColor: '#160F08',
		borderWidth: 1,
		borderColor: '#3B2F1B',
		borderRadius: 6,
		padding: 8,
		color: '#FFF',
		minWidth: 120,
		textAlign: 'right',
	},
	numberInput: {
		minWidth: 60,
	},
	optionGroup: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 4,
	},
	option: {
		flex: 1,
		padding: 8,
		borderWidth: 1,
		borderColor: '#3B2F1B',
		borderRadius: 6,
		alignItems: 'center',
	},
	selectedOption: {
		backgroundColor: '#4A6741',
		borderColor: '#4A6741',
	},
	selectedText: {
		color: '#FFF',
		fontWeight: 'bold',
	},
});

