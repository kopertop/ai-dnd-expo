import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';

export interface SearchableListItem<T = unknown> {
	id: string;
	data: T;
	searchText: string; // Text to search against
}

interface SearchableListProps<T> {
	items: SearchableListItem<T>[];
	onSelect: (item: SearchableListItem<T>) => void;
	renderItem: (item: SearchableListItem<T>, isSelected: boolean) => React.ReactNode;
	placeholder?: string;
	emptyText?: string;
	itemHeight?: number;
}

export function SearchableList<T>({
	items,
	onSelect,
	renderItem,
	placeholder = 'Search...',
	emptyText = 'No items found',
	itemHeight = 60,
}: SearchableListProps<T>) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<TextInput>(null);
	const scrollViewRef = useRef<ScrollView>(null);

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) {
			return items;
		}

		const query = searchQuery.toLowerCase();
		return items.filter(item => item.searchText.toLowerCase().includes(query));
	}, [items, searchQuery]);

	// Reset selected index when filtered results change
	useEffect(() => {
		if (filteredItems.length > 0) {
			setSelectedIndex(0);
		}
	}, [filteredItems.length]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex(prev => {
					const newIndex = Math.min(prev + 1, filteredItems.length - 1);
					// Scroll to selected item
					setTimeout(() => {
						scrollViewRef.current?.scrollTo({
							y: newIndex * itemHeight,
							animated: true,
						});
					}, 0);
					return newIndex;
				});
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex(prev => {
					const newIndex = Math.max(prev - 1, 0);
					// Scroll to selected item
					setTimeout(() => {
						scrollViewRef.current?.scrollTo({
							y: newIndex * itemHeight,
							animated: true,
						});
					}, 0);
					return newIndex;
				});
			} else if (e.key === 'Enter' && filteredItems.length > 0 && filteredItems[selectedIndex]) {
				e.preventDefault();
				e.stopPropagation();
				const selectedItem = filteredItems[selectedIndex];
				if (selectedItem) {
					onSelect(selectedItem);
				}
			}
		};

		if (Platform.OS === 'web') {
			window.addEventListener('keydown', handleKeyDown, true);
			return () => window.removeEventListener('keydown', handleKeyDown, true);
		}
	}, [selectedIndex, filteredItems, onSelect, itemHeight]);

	return (
		<View style={styles.container}>
			{/* Search Input */}
			<TextInput
				ref={inputRef}
				style={styles.searchInput}
				placeholder={placeholder}
				value={searchQuery}
				onChangeText={setSearchQuery}
				placeholderTextColor="#6B5B3D"
				autoFocus
				returnKeyType="search"
			/>

			{/* Items List */}
			<ScrollView ref={scrollViewRef} style={styles.list} nestedScrollEnabled>
				{filteredItems.length === 0 ? (
					<View style={styles.emptyState}>
						<ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
					</View>
				) : (
					filteredItems.map((item, index) => (
						<TouchableOpacity
							key={item.id}
							onPress={() => {
								setSelectedIndex(index);
								onSelect(item);
							}}
						>
							{renderItem(item, index === selectedIndex)}
						</TouchableOpacity>
					))
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	searchInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 16,
		fontSize: 16,
		color: '#3B2F1B',
	},
	list: {
		flex: 1,
	},
	emptyState: {
		padding: 32,
		alignItems: 'center',
	},
	emptyText: {
		color: '#6B5B3D',
		fontSize: 14,
		fontStyle: 'italic',
	},
});

