import { router, Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';


const licenses = [
	{
		name: 'Gemma',
		description: 'Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms',
		url: 'https://ai.google.dev/gemma/terms',
	},
	{
		name: 'Expo',
		description: 'Expo is an open-source platform for making universal native apps.',
		url: 'https://expo.dev',
	},
	{
		name: 'React Native',
		description: 'React Native is an open-source framework for building native apps using React.',
		url: 'https://reactnative.dev',
	},
	// Add more libraries/credits as needed
];

const LicensesScreen: React.FC = () => (
	<>
		<Stack.Screen options={{ title: 'Licenses & Credits' }} />
		<ThemedView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<ThemedText type="title" style={styles.title}>
					<Text>Licenses & Credits</Text>
				</ThemedText>
				{licenses.map((item, idx) => (
					<ThemedView key={item.name} style={styles.licenseBox}>
						<Text style={styles.licenseName}>{item.name}</Text>
						<Text style={styles.licenseDesc}>{item.description}</Text>
						{item.url && (
							<Text style={styles.licenseUrl}>{item.url}</Text>
						)}
					</ThemedView>
				))}
				<Text style={styles.footer}>
          This app uses open-source software and assets. Icons and images may be from open or licensed sources. See the LICENSE file for details.
				</Text>
				<TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
					<Text style={styles.backBtnText}>Back</Text>
				</TouchableOpacity>
			</ScrollView>
		</ThemedView>
	</>
);

export default LicensesScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scrollContent: {
		alignItems: 'center',
		paddingBottom: 40,
	},
	title: {
		marginBottom: 24,
	},
	licenseBox: {
		backgroundColor: '#FFF8E1',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		width: 320,
		maxWidth: '100%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},
	licenseName: {
		fontWeight: 'bold',
		fontSize: 16,
		marginBottom: 4,
		color: '#8B2323',
	},
	licenseDesc: {
		fontSize: 14,
		color: '#3B2F1B',
		marginBottom: 2,
	},
	licenseUrl: {
		fontSize: 13,
		color: '#1E90FF',
		textDecorationLine: 'underline',
	},
	footer: {
		marginTop: 24,
		fontSize: 13,
		color: '#8B2323',
		textAlign: 'center',
	},
	backBtn: {
		marginTop: 32,
		backgroundColor: '#C9B037',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
	backBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
