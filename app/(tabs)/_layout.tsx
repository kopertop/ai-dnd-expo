import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const TabLayout: React.FC = () => {
	const colorScheme = useColorScheme();

	// D&D themed colors
	const activeColor = '#C9B037'; // Gold
	const inactiveColor = colorScheme === 'dark' ? '#8B7355' : '#8B6914'; // Darker gold variants
	const backgroundColor = colorScheme === 'dark' ? '#2C1810' : '#F9F6EF'; // Parchment colors
	const borderColor = colorScheme === 'dark' ? '#5D4E37' : '#C9B037'; // Gold border

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: activeColor,
				tabBarInactiveTintColor: inactiveColor,
				tabBarStyle: {
					backgroundColor: backgroundColor,
					borderTopColor: borderColor,
					borderTopWidth: 2,
					height: Platform.OS === 'ios' ? 85 : 65,
					paddingBottom: Platform.OS === 'ios' ? 25 : 10,
					paddingTop: 8,
					// Add subtle shadow for better visual separation
					shadowColor: '#000',
					shadowOffset: {
						width: 0,
						height: -2,
					},
					shadowOpacity: 0.1,
					shadowRadius: 3,
					elevation: 5,
				},
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: '600',
					marginTop: 2,
					// Ensure text is readable
					textAlign: 'center',
				},
				tabBarIconStyle: {
					marginBottom: 2,
				},
				headerShown: false,
				// Ensure tab state is preserved when switching
				lazy: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Chat',
					tabBarIcon: ({ color, size, focused }) => (
						<FontAwesome
							name="comments"
							size={focused ? size + 2 : size}
							color={color}
							style={{
								opacity: focused ? 1 : 0.8,
							}}
						/>
					),
					tabBarAccessibilityLabel: 'Chat with Dungeon Master',
				}}
			/>
			<Tabs.Screen
				name="character"
				options={{
					title: 'Character',
					tabBarIcon: ({ color, size, focused }) => (
						<FontAwesome
							name="user"
							size={focused ? size + 2 : size}
							color={color}
							style={{
								opacity: focused ? 1 : 0.8,
							}}
						/>
					),
					tabBarAccessibilityLabel: 'View Character Sheet',
				}}
			/>
			<Tabs.Screen
				name="map"
				options={{
					title: 'Map',
					tabBarIcon: ({ color, size, focused }) => (
						<FontAwesome
							name="map"
							size={focused ? size + 2 : size}
							color={color}
							style={{
								opacity: focused ? 1 : 0.8,
							}}
						/>
					),
					tabBarAccessibilityLabel: 'View Game Map',
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({ color, size, focused }) => (
						<FontAwesome
							name="cog"
							size={focused ? size + 2 : size}
							color={color}
							style={{
								opacity: focused ? 1 : 0.8,
							}}
						/>
					),
					tabBarAccessibilityLabel: 'Game Settings',
				}}
			/>
		</Tabs>
	);
};

export default TabLayout;
