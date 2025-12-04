import MaterialCommunityIcons from '@expo/vector-icons/build/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

interface ExpoIconProps {
	icon: string;
	size?: number;
	color?: string;
	style?: StyleProp<ViewStyle | ImageStyle | TextStyle>;
}

/**
 * Renders an icon from either Expo Vector Icons or an image URL.
 *
 * Format for vector icons: "IconFamily:icon-name" (e.g., "MaterialIcons:shield")
 * Format for images: URL string (e.g., "https://..." or "data:image/...")
 */
export const ExpoIcon: React.FC<ExpoIconProps> = ({
	icon,
	size = 24,
	color = '#3B2F1B',
	style,
}) => {
	if (!icon) {
		return null;
	}

	// Check if it's an image URL
	const isImageUrl = icon.startsWith('http') || icon.startsWith('data:');

	if (isImageUrl) {
		return (
			<Image
				source={{ uri: icon }}
				style={[
					{
						width: size,
						height: size,
						resizeMode: 'contain',
					},
					style as StyleProp<ImageStyle>,
				]}
			/>
		);
	}

	// Parse vector icon format: "IconFamily:icon-name"
	const parts = icon.split(':');
	if (parts.length !== 2) {
		// Invalid format, return null
		return null;
	}

	const [iconFamily, iconName] = parts;

	console.log('[ExpoIcon] iconFamily', iconFamily, iconName, color);
	// Render appropriate icon family
	switch (iconFamily) {
		case 'MaterialIcons':
			return (
				<MaterialIcons
					name={iconName as any}
					size={size}
					color={color}
					style={style as StyleProp<TextStyle>}
				/>
			);
		case 'MaterialCommunityIcons':
			return (
				<MaterialCommunityIcons
					name={iconName as any}
					size={size}
					color={color}
					style={style as StyleProp<TextStyle>}
				/>
			);
		case 'FontAwesome5':
			return (
				<FontAwesome5
					name={iconName as any}
					size={size}
					color={color}
					style={style}
				/>
			);
		case 'FontAwesome':
			return (
				<FontAwesome
					name={iconName as any}
					size={size}
					color={color}
					style={style as StyleProp<TextStyle>}
				/>
			);
		case 'Ionicons':
			return (
				<Ionicons
					name={iconName as any}
					size={size}
					color={color}
					style={style as StyleProp<TextStyle>}
				/>
			);
		case 'Feather':
			return (
				<Feather
					name={iconName as any}
					size={size}
					color={color}
					style={style as StyleProp<TextStyle>}
				/>
			);
		default:
			// Unknown icon family, return null
			return null;
	}
};

