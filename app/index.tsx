import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';


const IndexScreen: React.FC = () => {
	return (
		<>
			<Stack.Screen options={{ title: 'Home' }} />
			<ThemedView style={styles.container}>
				<ThemedText type="title">
					<Text>Welcome to the AI D&D Platform</Text>
				</ThemedText>
				<Link href="/setup" style={styles.link}>
					<ThemedText type="link">
						<Text>Start a new game</Text>
					</ThemedText>
				</Link>
			</ThemedView>
		</>
	);
};
IndexScreen.displayName = 'Home';
export default IndexScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	link: {
		marginTop: 15,
		paddingVertical: 15,
	},
});
