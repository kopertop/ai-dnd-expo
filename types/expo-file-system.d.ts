declare module 'expo-file-system' {
	export const documentDirectory: string | null;
	export const cacheDirectory: string | null;

	export const FileSystemSessionType: {
		readonly BACKGROUND: 'background';
		readonly FOREGROUND: 'foreground';
	};

	export const EncodingType: {
		readonly UTF8: 'utf8';
		readonly Base64: 'base64';
	};
}

