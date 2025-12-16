import React from 'react';

// Mock React Native for testing - prevents Vite from parsing the actual react-native package
export const View = ({ children, ...props }: any) => React.createElement('div', props, children);
export const Text = ({ children, ...props }: any) => React.createElement('span', props, children);
export const ScrollView = ({ children, ...props }: any) =>
	React.createElement('div', { ...props, 'data-testid': 'scroll-view' }, children);
export const TouchableOpacity = ({ children, onPress, ...props }: any) =>
	React.createElement('button', {
		...props,
		onClick: (e: any) =>
			onPress?.({
				nativeEvent: {
					locationX: e?.nativeEvent?.offsetX ?? 0,
					locationY: e?.nativeEvent?.offsetY ?? 0,
					offsetX: e?.nativeEvent?.offsetX ?? 0,
					offsetY: e?.nativeEvent?.offsetY ?? 0,
				},
			}),
	}, children);
export const TextInput = ({ onChangeText, ...props }: any) => {
	const handleChange = (e: any) => onChangeText?.(e.target.value);
	const attachRef = (node: any) => {
		if (node) {
			node.__onChangeText = onChangeText;
		}
	};
	return React.createElement('input', {
		...props,
		onChange: handleChange,
		ref: attachRef,
	});
};
export const Image = (props: any) =>
	React.createElement('img', { ...props, alt: props.alt || 'image' });
export const SafeAreaView = ({ children, ...props }: any) =>
	React.createElement('div', { ...props, 'data-testid': 'safe-area-view' }, children);
export const ActivityIndicator = ({ children, ...props }: any) =>
	React.createElement('div', { ...props, 'data-testid': props.testID }, children);
export const Switch = ({ value, onValueChange, ...props }: any) =>
	React.createElement('input', {
		...props,
		type: 'checkbox',
		checked: value,
		onChange: (e: any) => onValueChange?.(e.target.checked),
		ref: (node: any) => {
			if (node) node.__onValueChange = onValueChange;
		},
		'data-testid': props.testID,
	});
export const Modal = ({ children, visible = true, ...props }: any) =>
	visible ? React.createElement('div', { ...props, 'data-testid': props.testID ?? 'modal' }, children) : null;

export const Platform = {
	OS: 'ios',
	select: (options: any) => options.ios || options.default,
};

export const Dimensions = {
	get: () => ({ width: 375, height: 812 }),
	addEventListener: () => {},
	removeEventListener: () => {},
};

export const useWindowDimensions = () => ({ width: 1024, height: 768, scale: 2, fontScale: 2 });

export const StyleSheet = {
	create: (styles: any) => styles,
	flatten: (style: any) => style,
};

export const PanResponder = {
	create: (handlers: any) => ({
		panHandlers: handlers ?? {},
	}),
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
	ActivityIndicator,
	Switch,
	useColorScheme,
	useWindowDimensions,
	PanResponder,
	Modal,
};
