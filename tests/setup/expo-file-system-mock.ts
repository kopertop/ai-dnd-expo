export default {
	documentDirectory: '/tmp',
	cacheDirectory: '/tmp',
	writeAsStringAsync: async () => {},
	readAsStringAsync: async () => '',
	getInfoAsync: async () => ({ exists: true, isDirectory: false }),
	makeDirectoryAsync: async () => {},
	readDirectoryAsync: async () => [],
	downloadAsync: async () => ({ uri: '/tmp/mock.onnx' }),
	deleteAsync: async () => {},
	getFreeDiskStorageAsync: async () => 1024 * 1024 * 1024,
};
