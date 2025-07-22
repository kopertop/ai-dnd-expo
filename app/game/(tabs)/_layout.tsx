import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { LayoutAnimation, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameState } from '@/hooks/use-game-state';

// Animated tab icon component
const AnimatedTabIcon: React.FC<{
	name: string;
	color: string;
	size: number;
	focused: boolean;
}> = ({ name, color, size, focused }) => {
	const scale = useSharedValue(focused ? 1.1 : 1);
	const opacity = useSharedValue(focused ? 1 : 0.8);

	React.useEffect(() => {
		scale.value = withSpring(focused ? 1.1 : 1, {
			damping: 15,
			stiffness: 150,
		});
		opacity.value = withSpring(focused ? 1 : 0.8, {
			damping: 15,
			stiffness: 150,
		});
	}, [focused, scale, opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	return (
		<Animated.View style={animatedStyle}>
			<FontAwesome name={name as any} size={size} color={color} />
		</Animated.View>
	);
};

const TabLayout: React.FC = () => {
	const colorScheme = useColorScheme();
	const { gameState } = useGameState();

	// D&D themed colors
	const activeColor = '#C9B037'; // Gold
	const inactiveColor = colorScheme === 'dark' ? '#8B7355' : '#8B6914'; // Darker gold variants
	const backgroundColor = colorScheme === 'dark' ? '#2C1810' : '#F9F6EF'; // Parchment colors
	const borderColor = colorScheme === 'dark' ? '#5D4E37' : '#C9B037'; // Gold border

	// Get game name for header
	const gameName = gameState?.gameWorld || 'D&D Adventure';

	// Handle orientation changes with smooth animations
	React.useEffect(() => {
		const configureLayoutAnimation = () => {
			LayoutAnimation.configureNext({
				duration: 300,
				create: {
					type: LayoutAnimation.Types.easeInEaseOut,
					property: LayoutAnimation.Properties.opacity,
				},
				update: {
					type: LayoutAnimation.Types.easeInEaseOut,
				},
			});
		};

		configureLayoutAnimation();
	}, []);

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
				headerStyle: {
					backgroundColor: backgroundColor,
					borderBottomColor: borderColor,
					borderBottomWidth: 1,
				},
				headerTitleStyle: {
					color: '#3B2F1B',
					fontWeight: 'bold',
					fontSize: 18,
				},
				headerTintColor: '#C9B037',
				// Ensure tab state is preserved when switching
				lazy: false,
				// Add smooth transition animation
				animation: 'shift',
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Chat',
					tabBarIcon: ({ color, size, focused }) => (
						<AnimatedTabIcon
							name="comments"
							color={color}
							size={size}
							focused={focused}
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
						<AnimatedTabIcon name="user" color={color} size={size} focused={focused} />
					),
					tabBarAccessibilityLabel: 'View Character Sheet',
				}}
			/>
			<Tabs.Screen
				name="map"
				options={{
					title: 'Map',
					tabBarIcon: ({ color, size, focused }) => (
						<AnimatedTabIcon name="map" color={color} size={size} focused={focused} />
					),
					tabBarAccessibilityLabel: 'View Game Map',
				}}
			/>
			<Tabs.Screen
				name="dnd-model"
				options={{
					title: 'AI Model',
					tabBarIcon: ({ color, size, focused }) => (
						<AnimatedTabIcon name="magic" color={color} size={size} focused={focused} />
					),
					tabBarAccessibilityLabel: 'D&D AI Model Test',
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({ color, size, focused }) => (
						<AnimatedTabIcon name="cog" color={color} size={size} focused={focused} />
					),
					tabBarAccessibilityLabel: 'Game Settings',
				}}
			/>
		</Tabs>
	);
};

export default TabLayout;
