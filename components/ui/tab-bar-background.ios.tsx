import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet } from 'react-native';

const BlurTabBarBackground: React.FC = () => {
	return (
		<BlurView
			// System chrome material automatically adapts to the system's theme
			// and matches the native tab bar appearance on iOS.
			tint="systemChromeMaterial"
			intensity={100}
			style={StyleSheet.absoluteFill}
		/>
	);
};
BlurTabBarBackground.displayName = 'BlurTabBarBackground';
export default BlurTabBarBackground;

export const useBottomTabOverflow = () => {
	return useBottomTabBarHeight();
};
