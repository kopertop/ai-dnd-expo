import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';

interface AccordionProps {
	title: string;
	expanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({
	title,
	expanded,
	onToggle,
	children,
}) => {
	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.header}
				onPress={onToggle}
				activeOpacity={0.7}
			>
				<ThemedText type="defaultSemiBold" style={styles.title}>
					{title}
				</ThemedText>
				<ExpoIcon
					icon={expanded ? "MaterialIcons:expand-less" : "MaterialIcons:expand-more"}
					size={24}
					color="#6B5B3D"
				/>
			</TouchableOpacity>

			{expanded && (
				<View style={styles.content}>
					{children}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 12,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: '#F5E6D3',
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderBottomWidth: 0,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		color: '#3B2F1B',
		fontSize: 16,
	},
	content: {
		paddingTop: 16,
		paddingBottom: 8,
		paddingHorizontal: 16,
		marginTop: 0,
		backgroundColor: '#FFF9EF',
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderTopWidth: 0,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 2,
	},
});
