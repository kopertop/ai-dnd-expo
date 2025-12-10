import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { API_BASE_URL } from '@/services/config/api-base-url';
import { ThemedText } from '@/components/themed-text';

export const ApiStatusIndicator = () => {
	const [status, setStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
	const [isHovered, setIsHovered] = useState(false);
	const [isClicked, setIsClicked] = useState(false);

	useEffect(() => {
		let isMounted = true;
		const checkHealth = async () => {
			if (!API_BASE_URL) return;

			try {
				// Ensure we handle the slash correctly
				const healthUrl = API_BASE_URL.endsWith('/')
					? `${API_BASE_URL}health`
					: `${API_BASE_URL}/health`;

				const response = await fetch(healthUrl);
				if (isMounted) {
					if (response.ok) {
						setStatus('healthy');
					} else {
						setStatus('unhealthy');
					}
				}
			} catch (e) {
				if (isMounted) {
					setStatus('unhealthy');
				}
			}
		};

		checkHealth();
		const interval = setInterval(checkHealth, 30000); // Poll every 30s

		return () => {
			isMounted = false;
			clearInterval(interval);
		};
	}, []);

	const toggleClicked = () => setIsClicked(!isClicked);

	const showUrl = isHovered || isClicked;

	// Indicator logic
	let indicatorColor = '#FFC107'; // checking (yellow)
	let statusText = 'Checking API...';

	if (status === 'healthy') {
		indicatorColor = '#4CAF50'; // green
		statusText = 'API Online';
	} else if (status === 'unhealthy') {
		indicatorColor = '#F44336'; // red
		statusText = 'API Offline';
	}

	return (
		<Pressable
			onPress={toggleClicked}
			// @ts-ignore - React Native Web props
			onHoverIn={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
			// @ts-ignore - React Native Web props
			onHoverOut={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
			style={styles.container}
		>
			<View style={[styles.indicator, { backgroundColor: indicatorColor }]} />
			<ThemedText style={styles.text}>
				{showUrl ? API_BASE_URL : statusText}
			</ThemedText>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		borderRadius: 4,
	},
	indicator: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginRight: 8,
	},
	text: {
		fontSize: 14,
	},
});
