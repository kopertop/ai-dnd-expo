import React, { useEffect } from 'react';
import { Modal, ModalProps, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

interface AnimatedModalProps extends Omit<ModalProps, 'animationType'> {
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
	animationType?: 'slide' | 'fade' | 'scale';
	backdropOpacity?: number;
	closeOnBackdropPress?: boolean;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
	visible,
	onClose,
	children,
	animationType = 'scale',
	backdropOpacity = 0.5,
	closeOnBackdropPress = true,
	...modalProps
}) => {
	const backdropOpacityValue = useSharedValue(0);
	const scale = useSharedValue(0.8);
	const translateY = useSharedValue(50);
	const opacity = useSharedValue(0);

	useEffect(() => {
		if (visible) {
			// Animate in
			backdropOpacityValue.value = withTiming(backdropOpacity, { duration: 200 });

			switch (animationType) {
				case 'scale':
					scale.value = withSpring(1, {
						damping: 15,
						stiffness: 150,
					});
					opacity.value = withTiming(1, { duration: 200 });
					break;
				case 'slide':
					translateY.value = withSpring(0, {
						damping: 15,
						stiffness: 150,
					});
					opacity.value = withTiming(1, { duration: 200 });
					break;
				case 'fade':
					opacity.value = withTiming(1, { duration: 300 });
					break;
			}
		} else {
			// Animate out
			backdropOpacityValue.value = withTiming(0, { duration: 200 });

			switch (animationType) {
				case 'scale':
					scale.value = withTiming(0.8, { duration: 200 });
					opacity.value = withTiming(0, { duration: 200 });
					break;
				case 'slide':
					translateY.value = withTiming(50, { duration: 200 });
					opacity.value = withTiming(0, { duration: 200 });
					break;
				case 'fade':
					opacity.value = withTiming(0, { duration: 200 });
					break;
			}
		}
	}, [visible, animationType, backdropOpacity, backdropOpacityValue, scale, translateY, opacity]);

	const backdropStyle = useAnimatedStyle(() => ({
		opacity: backdropOpacityValue.value,
	}));

	const contentStyle = useAnimatedStyle(() => {
		const baseStyle = {
			opacity: opacity.value,
		};

		switch (animationType) {
			case 'scale':
				return {
					...baseStyle,
					transform: [{ scale: scale.value }],
				};
			case 'slide':
				return {
					...baseStyle,
					transform: [{ translateY: translateY.value }],
				};
			default:
				return baseStyle;
		}
	});

	const handleBackdropPress = () => {
		if (closeOnBackdropPress) {
			onClose();
		}
	};

	return (
		<Modal
			transparent
			visible={visible}
			onRequestClose={onClose}
			statusBarTranslucent
			{...modalProps}
		>
			<View style={styles.container}>
				<TouchableWithoutFeedback onPress={handleBackdropPress}>
					<Animated.View style={[styles.backdrop, backdropStyle]} />
				</TouchableWithoutFeedback>
				<Animated.View style={[styles.content, contentStyle]}>{children}</Animated.View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'black',
	},
	content: {
		maxWidth: '90%',
		maxHeight: '90%',
	},
});
