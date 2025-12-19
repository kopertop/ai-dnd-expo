import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
	StyleSheet,
	Switch,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
	TERRAIN_TYPES,
	getTerrainDisplayName,
	isValidTerrainType,
} from '@/constants/terrain-types';

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
	compact?: boolean;
}

export const TilePropertyEditor: React.FC<TilePropertyEditorProps> = ({
	properties,
	onChange,
	onClose,
	compact = false,
}) => {
	// Normalize terrain type - default to 'stone' if empty, 'none', or invalid

	const normalizedTerrainType =
		properties.terrainType &&
		properties.terrainType !== 'none' &&
		isValidTerrainType(properties.terrainType)
			? properties.terrainType
			: 'stone';

	const [localProps, setLocalProps] = useState<TileProperties>({
		...properties,
		terrainType: normalizedTerrainType,
	});

	// Update localProps when properties prop changes (e.g., when selecting a different tile)
	useEffect(() => {
		const normalizedTerrainType =
			properties.terrainType &&
			properties.terrainType !== 'none' &&
			isValidTerrainType(properties.terrainType)
				? properties.terrainType
				: 'stone';

		setLocalProps({
			...properties,
			terrainType: normalizedTerrainType,
		});
	}, [
		properties.terrainType,
		properties.movementCost,
		properties.isBlocked,
		properties.isDifficult,
		properties.providesCover,
		properties.coverType,
		properties.elevation,
		properties.featureType,
	]);

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

	const content = (
		<View style={compact ? styles.contentCompact : styles.content}>
			<View style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Movement & Terrain</ThemedText>

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Terrain Type</ThemedText>
					<View style={styles.pickerContainer}>
						<Picker
							selectedValue={localProps.terrainType || 'stone'}
							onValueChange={(itemValue: string) => handleChange('terrainType', itemValue)}
							style={styles.picker}
							testID="terrain-type-input"
						>
							{TERRAIN_TYPES.map((terrain) => (
								<Picker.Item
									key={terrain}
									label={getTerrainDisplayName(terrain)}
									value={terrain}
								/>
							))}
						</Picker>
					</View>
				</View>

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Movement Cost</ThemedText>
					<TextInput
						style={[styles.input, styles.numberInput]}
						value={localProps.movementCost.toString()}
						keyboardType="numeric"
						testID="movement-cost-input"
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
						testID="blocked-switch"
						onValueChange={(val) => handleChange('isBlocked', val)}
						trackColor={{ false: '#767577', true: '#DC3545' }}
					/>
				</View>

				<View style={styles.toggleRow}>
					<ThemedText>Difficult Terrain</ThemedText>
					<Switch
						value={localProps.isDifficult}
						testID="difficult-switch"
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
						testID="cover-switch"
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

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Elevation</ThemedText>
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

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Feature Type</ThemedText>
					<TextInput
						style={styles.input}
						value={localProps.featureType || ''}
						placeholder="None"
						onChangeText={(text) => handleChange('featureType', text || null)}
					/>
				</View>
			</View>
		</View>
	);

	if (compact) {
		return content;
	}

	return (
		<ThemedView style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="subtitle">Tile Properties</ThemedText>
				<TouchableOpacity onPress={onClose}>
					<ThemedText style={styles.closeButton}>✕</ThemedText>
				</TouchableOpacity>
			</View>
			{content}
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	closeButton: {
		fontSize: 20,
		color: '#6B5B3D',
		padding: 4,
	},
	content: {
		width: '100%',
	},
	contentCompact: {
		width: '100%',
	},
	section: {
		marginBottom: 20,
		gap: 12,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 4,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
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
	inputGroup: {
		marginBottom: 12,
	},
	label: {
		width: '100%',
		fontSize: 14,
		fontWeight: '500',
		lineHeight: 16,
		textAlign: 'left',
		color: 'rgba(117, 68, 0, 1)',
		marginBottom: 4,
	},
	input: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 6,
		padding: 8,
		color: '#3B2F1B',
		width: '100%',
		textAlign: 'right',
	},
	pickerContainer: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 6,
		overflow: 'hidden',
	},
	picker: {
		width: '100%',
		height: 50,
	},
	numberInput: {
		// Inherits width: '100%' from input style
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
		borderColor: '#E2D3B3',
		borderRadius: 6,
		alignItems: 'center',
		backgroundColor: '#FFF',
	},
	selectedOption: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	selectedText: {
		color: '#FFF',
		fontWeight: 'bold',
	},
});
