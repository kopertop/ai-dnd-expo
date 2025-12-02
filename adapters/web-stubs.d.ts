/**
 * TypeScript declarations for web stubs
 */

export const InferenceSession: {
	create: (modelPath: string, options?: any) => Promise<any>;
};

export class Tensor {
	constructor(data: any, type?: any, dims?: any);
}

export const ExpoSpeechRecognitionModule: {
	start: () => void;
	stop: () => void;
};

export function useSpeechRecognitionEvent(): void;

export function requireNativeViewManager(viewName: string): React.ComponentType<any>;

