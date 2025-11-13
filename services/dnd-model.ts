import * as FileSystem from 'expo-file-system';

export type DnDMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
	context?: {
		role?: string;
		world?: string;
		location?: string;
		party?: string[];
		playerHealth?: Record<string, number>;
		inventory?: string[];
	};
};

export type ToolCall = {
	type: 'roll' | 'health' | 'inventory' | 'spellcast' | 'check' | 'save';
	arguments: string;
	result?: string;
};

const stopWords = ['<|end_of_text|>', '<|endoftext|>', '</s>', '<end_of_utterance>'];

class DnDModelManager {
	private isInitialized = false;
	private modelConfig: any = null;

	async loadModelConfig(): Promise<void> {
		// Try multiple possible config paths
		const possiblePaths = [
			// App bundle path (for development)
			'../ai-training/trained_models/dnd_model/cactus_config.json',
			// Documents directory path (for runtime)
			`${FileSystem.documentDirectory}dnd_model/cactus_config.json`,
			// Assets path (for deployed model)
			'../assets/models/custom-dnd-model/cactus_integration.json',
		];

		let configContent: string | null = null;
		let configPath: string | null = null;

		for (const path of possiblePaths) {
			try {
				const info = await FileSystem.getInfoAsync(path);
				if (info.exists) {
					configContent = await FileSystem.readAsStringAsync(path);
					configPath = path;
					console.log(`✅ Found config at: ${path}`);
					break;
				}
			} catch (error) {
				console.warn(`Failed to check config at ${path}:`, error);
			}
		}

		if (!configContent) {
			throw new Error(`Failed to load D&D model configuration from any of the expected paths: ${possiblePaths.join(', ')}`);
		}

		try {
			this.modelConfig = JSON.parse(configContent);
			console.log('✅ D&D Model config loaded successfully:', this.modelConfig);
		} catch (error) {
			throw new Error(`Failed to parse D&D model configuration: ${error}`);
		}
	}

	async copyTrainedModel(): Promise<{ modelPath: string; configPath: string }> {
		// Source paths in the bundle/app - try multiple locations
		const sourcePaths = [
			'../ai-training/trained_models/dnd_model/',
			'../assets/models/custom-dnd-model/',
		];

		const targetDir = `${FileSystem.documentDirectory}dnd_model/`;

		// Ensure target directory exists
		await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });

		const modelFiles = [
			'adapter_config.json',
			'adapter_model.safetensors',
			'cactus_config.json',
			'chat_template.jinja',
			'merges.txt',
			'special_tokens_map.json',
			'tokenizer.json',
			'tokenizer_config.json',
			'vocab.json',
			'config.json',
			'model.safetensors',
			'cactus_integration.json',
		];

		let sourcePath: string | null = null;

		// Find which source path has the most files
		for (const path of sourcePaths) {
			try {
				let fileCount = 0;
				for (const fileName of modelFiles) {
					const filePath = path + fileName;
					const fileInfo = await FileSystem.getInfoAsync(filePath);
					if (fileInfo.exists) {
						fileCount++;
					}
				}
				if (fileCount > 0) {
					sourcePath = path;
					console.log(`✅ Found ${fileCount} model files at: ${path}`);
					break;
				}
			} catch (error) {
				console.warn(`Failed to check source path ${path}:`, error);
			}
		}

		if (!sourcePath) {
			throw new Error('No valid model source found');
		}

		// Copy all model files
		for (const fileName of modelFiles) {
			const sourcePathFull = sourcePath + fileName;
			const targetPath = targetDir + fileName;

			try {
				// Check if source exists and copy
				const sourceInfo = await FileSystem.getInfoAsync(sourcePathFull);
				if (sourceInfo.exists) {
					await FileSystem.copyAsync({
						from: sourcePathFull,
						to: targetPath,
					});
					console.log(`✅ Copied: ${fileName}`);
				}
			} catch (error) {
				console.warn(`Failed to copy ${fileName}: ${error}`);
			}
		}

		return {
			modelPath: targetDir,
			configPath: targetDir + 'cactus_config.json',
		};
	}

	async initialize(onProgress: (progress: number) => void): Promise<void> {
		if (this.isInitialized) return;

		onProgress(0.1);

		// Copy trained model from app bundle to documents directory
		const { modelPath, configPath } = await this.copyTrainedModel();
		onProgress(0.3);

		// Load model configuration
		try {
			const configContent = await FileSystem.readAsStringAsync(configPath);
			this.modelConfig = JSON.parse(configContent);
		} catch (error) {
			// Fallback to loading from bundle
			await this.loadModelConfig();
		}

		onProgress(0.5);

		// Note: Since we have HuggingFace format (not GGUF yet), we'll need to use a different approach
		// For now, we'll create a mock interface that simulates the D&D model behavior
		// In production, this would initialize the actual model files

		console.log('D&D Model Configuration:', this.modelConfig);

		onProgress(1.0);
		this.isInitialized = true;
	}

	parseToolCalls(response: string): ToolCall[] {
		const toolCallRegex = /\[(\w+):\s*([^\]]+)\]/g;
		const toolCalls: ToolCall[] = [];
		let match;

		while ((match = toolCallRegex.exec(response)) !== null) {
			const [, type, args] = match;
			if (this.modelConfig?.tools?.supported?.includes(type)) {
				toolCalls.push({
					type: type as ToolCall['type'],
					arguments: args.trim(),
				});
			}
		}

		return toolCalls;
	}

	simulateToolExecution(toolCall: ToolCall): string {
		switch (toolCall.type) {
			case 'roll':
				// Simulate dice roll: d20, 2d6, etc.
				const rollMatch = toolCall.arguments.match(/(\d+)?d(\d+)([+-]\d+)?/);
				if (rollMatch) {
					const [, numDice = '1', sides, modifier = ''] = rollMatch;
					const rolls = Array.from(
						{ length: parseInt(numDice) },
						() => Math.floor(Math.random() * parseInt(sides)) + 1,
					);
					const total =
						rolls.reduce((sum, roll) => sum + roll, 0) +
						(modifier ? parseInt(modifier) : 0);
					return `<TOOLCALL>roll: ${rolls.join(' + ')}${modifier} = *${total}*</TOOLCALL>`;
				}
				break;

			case 'health':
				const [target, change] = toolCall.arguments.split(',').map(s => s.trim());
				return `<TOOLCALL>health: ${target} health ${change.startsWith('-') ? 'reduced' : 'increased'} by ${Math.abs(parseInt(change))}</TOOLCALL>`;

			case 'check':
			case 'save':
				const roll = Math.floor(Math.random() * 20) + 1;
				return `<TOOLCALL>${toolCall.type}: ${toolCall.arguments} = ${roll}</TOOLCALL>`;

			default:
				return `<TOOLCALL>${toolCall.type}: ${toolCall.arguments}</TOOLCALL>`;
		}
		return '';
	}

	async generateResponse(userMessage: DnDMessage): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('D&D Model not initialized');
		}

		// Build context-aware system prompt
		let systemPrompt =
			this.modelConfig?.system_prompt ||
			'You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics.';

		if (userMessage.context) {
			const { role, world, location, party } = userMessage.context;
			systemPrompt += '\n\nCurrent Context:';
			if (role) systemPrompt += `\nRole: ${role}`;
			if (world) systemPrompt += `\nWorld: ${world}`;
			if (location) systemPrompt += `\nLocation: ${location}`;
			if (party && party.length > 0) systemPrompt += `\nParty: ${party.join(', ')}`;
		}

		// For now, simulate D&D-specific responses since we don't have GGUF format yet
		// This is a placeholder that demonstrates the expected interface

		const response = await this.simulateDnDResponse(userMessage, systemPrompt);

		// Parse and execute tool calls
		const toolCalls = this.parseToolCalls(response);
		let finalResponse = response;

		for (const toolCall of toolCalls) {
			const toolResult = this.simulateToolExecution(toolCall);
			toolCall.result = toolResult;
			// Replace the tool call in the response with the result
			finalResponse = finalResponse.replace(
				`[${toolCall.type}: ${toolCall.arguments}]`,
				toolResult,
			);
		}

		return finalResponse;
	}

	private async simulateDnDResponse(message: DnDMessage, systemPrompt: string): Promise<string> {
		// This simulates what the trained model would generate
		// In production, this would use the actual model via CactusVLM

		const userInput = message.content.toLowerCase();

		// Simulate D&D-specific responses based on input patterns
		if (userInput.includes('roll') || userInput.includes('check')) {
			return 'Make a perception check to notice any details. [roll: 1d20+5]';
		}

		if (userInput.includes('attack') || userInput.includes('combat')) {
			return 'Roll for initiative! [roll: 1d20] The goblin snarls and swipes at you with its rusty scimitar.';
		}

		if (userInput.includes('heal') || userInput.includes('potion')) {
			return 'You drink the healing potion and feel your wounds close. [health: player, +8] You recover 8 hit points.';
		}

		if (userInput.includes('tavern') || userInput.includes('innkeeper')) {
			return "The burly half-orc innkeeper wipes down a mug and eyes you suspiciously. 'What can I get for ye, traveler?'";
		}

		// Default D&D response
		return 'The torchlight flickers against the stone walls as you consider your next move. What would you like to do?';
	}

	getIsInitialized(): boolean {
		return this.isInitialized;
	}

	getModelConfig() {
		return this.modelConfig;
	}
}

export const dndModel = new DnDModelManager();
