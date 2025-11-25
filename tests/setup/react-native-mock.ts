import React from 'react';

// Mock React Native for testing - prevents Vite from parsing the actual react-native package
export const View = ({ children, ...props }: any) => React.createElement('div', props, children);
export const Text = ({ children, ...props }: any) => React.createElement('span', props, children);
export const ScrollView = ({ children, ...props }: any) =>
	React.createElement('div', { ...props, 'data-testid': 'scroll-view' }, children);
export const TouchableOpacity = ({ children, onPress, ...props }: any) =>
	React.createElement('button', { ...props, onClick: onPress }, children);
export const TextInput = (props: any) => React.createElement('input', props);
export const Image = (props: any) => React.createElement('img', { ...props, alt: props.alt || 'image' });
export const SafeAreaView = ({ children, ...props }: any) =>
	React.createElement('div', { ...props, 'data-testid': 'safe-area-view' }, children);

export const Platform = {
	OS: 'ios',
	select: (options: any) => options.ios || options.default,
};

export const Dimensions = {
	get: () => ({ width: 375, height: 812 }),
	addEventListener: () => {},
	removeEventListener: () => {},
};

export const StyleSheet = {
	create: (styles: any) => styles,
	flatten: (style: any) => style,
};

export const Alert = {
	alert: () => {},
};

export const useColorScheme = () => 'light';

export default {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Image,
	SafeAreaView,
	Platform,
	Dimensions,
	StyleSheet,
	Alert,
	useColorScheme,
};

