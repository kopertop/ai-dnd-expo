/**
 * Character Equipment Tab - Equipment and inventory display
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnyCharacter } from '@/types/characters';

interface CharacterEquipmentTabProps {
	character: AnyCharacter;
	isEditable: boolean;
	onUpdate: (updates: Partial<AnyCharacter>) => void;
}

export const CharacterEquipmentTab: React.FC<CharacterEquipmentTabProps> = ({
	character,
	isEditable,
	onUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	/**
	 * Render equipment slot
	 */
	const renderEquipmentSlot = (slotName: string, icon: string, item?: string) => (
		<TouchableOpacity key={slotName} style={styles.equipmentSlot}>
			<View style={styles.slotIcon}>
				<Feather name={icon as any} size={20} color={colors.textSecondary} />
			</View>
			<View style={styles.slotContent}>
				<ThemedText style={styles.slotName}>{slotName}</ThemedText>
				<ThemedText style={styles.slotItem}>
					{item || 'Empty'}
				</ThemedText>
			</View>
			{isEditable && (
				<TouchableOpacity style={styles.slotAction}>
					<Feather name="edit-2" size={16} color={colors.primary} />
				</TouchableOpacity>
			)}
		</TouchableOpacity>
	);

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Equipment Slots */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Equipment</ThemedText>
				<View style={styles.equipmentGrid}>
					{renderEquipmentSlot('Main Hand', 'sword', 'Longsword')}
					{renderEquipmentSlot('Off Hand', 'shield', 'Shield')}
					{renderEquipmentSlot('Armor', 'shield', 'Chain Mail')}
					{renderEquipmentSlot('Helmet', 'circle', undefined)}
					{renderEquipmentSlot('Boots', 'circle', undefined)}
					{renderEquipmentSlot('Gloves', 'circle', undefined)}
					{renderEquipmentSlot('Belt', 'circle', undefined)}
					{renderEquipmentSlot('Cloak', 'circle', undefined)}
					{renderEquipmentSlot('Amulet', 'circle', undefined)}
					{renderEquipmentSlot('Ring 1', 'circle', undefined)}
					{renderEquipmentSlot('Ring 2', 'circle', undefined)}
				</View>
			</ThemedView>

			{/* Inventory */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Inventory</ThemedText>
				<View style={styles.inventoryContainer}>
					<ThemedText style={styles.placeholderText}>
						Inventory system coming soon...
					</ThemedText>
					<ThemedText style={styles.placeholderSubtext}>
						Full item management with drag-and-drop will be available here.
					</ThemedText>
				</View>
			</ThemedView>

			{/* Currency */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Currency</ThemedText>
				<View style={styles.currencyGrid}>
					<View style={styles.currencyItem}>
						<ThemedText style={styles.currencyLabel}>Platinum</ThemedText>
						<ThemedText style={styles.currencyValue}>0</ThemedText>
					</View>
					<View style={styles.currencyItem}>
						<ThemedText style={styles.currencyLabel}>Gold</ThemedText>
						<ThemedText style={styles.currencyValue}>50</ThemedText>
					</View>
					<View style={styles.currencyItem}>
						<ThemedText style={styles.currencyLabel}>Silver</ThemedText>
						<ThemedText style={styles.currencyValue}>25</ThemedText>
					</View>
					<View style={styles.currencyItem}>
						<ThemedText style={styles.currencyLabel}>Copper</ThemedText>
						<ThemedText style={styles.currencyValue}>100</ThemedText>
					</View>
				</View>
			</ThemedView>
		</ScrollView>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	section: {
		marginBottom: 24,
		padding: 16,
		borderRadius: 12,
		backgroundColor: colors.backgroundSecondary,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 16,
		color: colors.text,
	},
	equipmentGrid: {
		gap: 8,
	},
	equipmentSlot: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.border,
	},
	slotIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	slotContent: {
		flex: 1,
	},
	slotName: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	slotItem: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	slotAction: {
		padding: 8,
	},
	inventoryContainer: {
		alignItems: 'center',
		padding: 24,
	},
	placeholderText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textSecondary,
		textAlign: 'center',
	},
	placeholderSubtext: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
	currencyGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		justifyContent: 'space-between',
	},
	currencyItem: {
		width: '22%',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	currencyLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 4,
	},
	currencyValue: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
	},
});