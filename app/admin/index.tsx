import { Stack, router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserInfo } from '@/hooks/api/use-auth-queries';

interface AdminFeature {
	id: string;
	title: string;
	description: string;
	icon: any; // Using any for icon name flexibility
	route: string;
}

const adminFeatures: AdminFeature[] = [
	{
		id: 'sql',
		title: 'SQL Editor',
		description: 'Execute SQL queries and manage database tables',
		icon: 'database',
		route: '/sql',
	},
	{
		id: 'images',
		title: 'Image Management',
		description: 'View and manage uploaded character and NPC images',
		icon: 'image',
		route: '/admin/images',
	},
	{
		id: 'worlds',
		title: 'World Manager',
		description: 'Create and edit worlds (Faerun, Eberron, etc.)',
		icon: 'globe',
		route: '/admin/worlds',
	},
	{
		id: 'maps',
		title: 'Map Manager',
		description: 'Create, edit, and configure VTT maps with grids and backgrounds',
		icon: 'map',
		route: '/admin/maps',
	},
];

const AdminPortalScreen: React.FC = () => {
	const { data: userInfo } = useUserInfo();
	const isAdmin = !!userInfo?.is_admin;

	if (!isAdmin) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Admin Portal',
						headerShown: true,
					}}
				/>
				<View style={styles.center}>
					<ThemedText style={styles.errorText}>Access Denied</ThemedText>
					<ThemedText style={styles.errorSubtext}>
						You must be an admin to access this page.
					</ThemedText>
				</View>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Admin Portal',
					headerShown: true,
				}}
			/>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.header}>
					<ThemedText type="title" style={styles.title}>
						Admin Portal
					</ThemedText>
					<ThemedText style={styles.subtitle}>
						Manage system settings, database, and content
					</ThemedText>
				</View>

				<View style={styles.featuresGrid}>
					{adminFeatures.map((feature) => (
						<TouchableOpacity
							key={feature.id}
							style={styles.featureCard}
							onPress={() => router.push(feature.route as any)}
							activeOpacity={0.7}
						>
							<View style={styles.featureIconContainer}>
								<ExpoIcon icon={`Feather:${feature.icon}`} size={32} color="#8B6914" />
							</View>
							<ThemedText type="subtitle" style={styles.featureTitle}>
								{feature.title}
							</ThemedText>
							<ThemedText style={styles.featureDescription}>
								{feature.description}
							</ThemedText>
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5E6D3',
	},
	content: {
		padding: 20,
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	header: {
		marginBottom: 24,
		paddingBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#6B5B3D',
	},
	errorText: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 8,
	},
	errorSubtext: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	featuresGrid: {
		gap: 16,
	},
	featureCard: {
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	featureIconContainer: {
		width: 64,
		height: 64,
		borderRadius: 12,
		backgroundColor: '#F5E6D3',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	featureTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	featureDescription: {
		fontSize: 14,
		color: '#6B5B3D',
		lineHeight: 20,
	},
});

export default AdminPortalScreen;
