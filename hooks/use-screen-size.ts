import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

interface ScreenSize {
	width: number;
	height: number;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isPhone: boolean;
}

/**
 * Hook for responsive screen size detection and breakpoints
 *
 * Breakpoints:
 * - Phone: < 768px width (subset of mobile)
 * - Mobile: < 768px width
 * - Tablet: 768px - 1024px width
 * - Desktop: > 1024px width
 */
export const useScreenSize = (): ScreenSize => {
	const [screenData, setScreenData] = useState(Dimensions.get('window'));

	useEffect(() => {
		const onChange = (result: { window: { width: number; height: number; scale: number; fontScale: number }; screen: { width: number; height: number; scale: number; fontScale: number } }) => {
			setScreenData(result.window);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => subscription?.remove();
	}, []);

	const { width, height } = screenData;

	return {
		width,
		height,
		isMobile: width < 768,
		isTablet: width >= 768 && width <= 1024,
		isDesktop: width > 1024,
		isPhone: width < 768,
	};
};
