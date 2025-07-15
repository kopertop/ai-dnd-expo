import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const NotFoundScreen: React.FC = () => {
	return (
		<>
			<Stack.Screen options={{ title: 'Oops!' }} />
			<ThemedView style={styles.container}>
				<ThemedText type="title">
					<Text>This screen does not exist.</Text>
				</ThemedText>
				<Link href="/" style={styles.link}>
					<ThemedText type="link">
						<Text>Go to home screen!</Text>
					</ThemedText>
				</Link>
			</ThemedView>
		</>
	);
};
NotFoundScreen.displayName = 'NotFoundScreen';
export default NotFoundScreen;

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
