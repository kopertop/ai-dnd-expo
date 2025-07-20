import type { CactusOAICompatibleMessage } from 'cactus-react-native';
import { CactusVLM } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system';

export type Message = CactusOAICompatibleMessage & {
	images?: string[];
};

const modelUrl =
	'https://huggingface.co/Cactus-Compute/SmolVLM2-500m-Instruct-GGUF/resolve/main/SmolVLM2-500M-Video-Instruct-Q8_0.gguf';
const mmprojUrl =
	'https://huggingface.co/Cactus-Compute/SmolVLM2-500m-Instruct-GGUF/resolve/main/mmproj-SmolVLM2-500M-Video-Instruct-Q8_0.gguf';
const stopWords = ['<|end_of_text|>', '<|endoftext|>', '</s>', '<end_of_utterance>'];
const demoImageUrl =
	'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';

class CactusManager {
	private vlm: CactusVLM | null = null;
	private isInitialized = false;

	async downloadFile(
		url: string,
		fileName: string,
		onProgress: (progress: number, file: string) => void,
	): Promise<string> {
		const filePath = `${FileSystem.documentDirectory}${fileName}`;

		// Check if file already exists
		const fileInfo = await FileSystem.getInfoAsync(filePath);
		if (fileInfo.exists) {
			return filePath;
		}

		onProgress(0, fileName);

		// Download with progress tracking
		const downloadResumable = FileSystem.createDownloadResumable(
			url,
			filePath,
			{},
			downloadProgress => {
				const progress =
					downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
				onProgress(progress, fileName);
			},
		);

		const result = await downloadResumable.downloadAsync();

		if (result && result.uri) {
			return result.uri;
		} else {
			throw new Error(`Failed to download ${fileName}`);
		}
	}

	async downloadDemoImage(): Promise<string> {
		const targetPath = `${FileSystem.documentDirectory}demo_image.jpg`;

		// Check if file already exists
		const fileInfo = await FileSystem.getInfoAsync(targetPath);
		if (fileInfo.exists) {
			return targetPath;
		}

		const result = await FileSystem.downloadAsync(demoImageUrl, targetPath);

		if (result.uri) {
			return result.uri;
		} else {
			throw new Error('Failed to download demo image');
		}
	}

	async initialize(onProgress: (progress: number) => void): Promise<void> {
		if (this.isInitialized) return;

		const [modelPath, mmprojPath] = await Promise.all([
			this.downloadFile(modelUrl, 'SmolVLM2-500M-Video-Instruct-Q8_0.gguf', onProgress),
			this.downloadFile(
				mmprojUrl,
				'mmproj-SmolVLM2-500M-Video-Instruct-Q8_0.gguf',
				onProgress,
			),
		]);

		const { vlm, error } = await CactusVLM.init(
			{
				model: modelPath,
				mmproj: mmprojPath,
				n_ctx: 2048,
				n_batch: 32,
				n_gpu_layers: 99,
				n_threads: 4,
			},
			onProgress,
			// cactusToken: 'contact founders@cactuscompute.com for enterprise token',
		);

		if (error) throw new Error('Error initializing Cactus VLM: ' + error);

		this.vlm = vlm;
		this.isInitialized = true;
	}

	async generateResponse(userMessage: Message): Promise<string> {
		if (!this.vlm) {
			throw new Error('Cactus VLM not initialized');
		}

		const messages = [
			{
				role: 'system',
				content:
					'You are a helpful AI assistant. Always provide neat, straightforward, short and relevant responses. Be concise and direct.',
			},
			{ role: 'user', content: userMessage.content },
		];

		const params = {
			images: userMessage.images,
			n_predict: 256,
			stop: stopWords,
			temperature: 0.7,
			top_p: 0.9,
			penalty_repeat: 1.05,
			// mode: 'localfirst', // enterprise feature: try local, fall back to cloud if local inference fails and vice versa
		};

		const startTime = performance.now();
		let firstTokenTime: number | null = null;
		let responseText = '';

		const result = await this.vlm.completion(messages, params, (data: any) => {
			if (firstTokenTime === null && data.token) {
				firstTokenTime = performance.now();
			}
			if (data.token) {
				responseText += data.token;
			}
		});

		responseText = responseText || result.text || 'No response generated';

		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : totalTime;
		const tokenCount = responseText.split(/\s+/).length;
		const tokensPerSecond = tokenCount > 0 ? tokenCount / (totalTime / 1000) : 0;

		const logPrefix = userMessage.images?.length ? 'VLM' : 'LLM';
		console.log(
			`${logPrefix}: TTFT ${timeToFirstToken.toFixed(0)}ms | ${tokensPerSecond.toFixed(0)} tok/s | ${tokenCount} tokens`,
		);

		return responseText;
	}

	clearConversation(): void {
		this.vlm?.rewind();
	}

	getIsInitialized(): boolean {
		return this.isInitialized;
	}
}

export const cactus = new CactusManager();
