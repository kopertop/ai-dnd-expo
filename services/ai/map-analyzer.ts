import { createOllamaProvider, OllamaProviderInterface } from '@/services/ai/providers/ollama-provider';

export interface MapRegion {
	type: 'wall' | 'door' | 'tree' | 'difficult' | 'water' | 'road' | 'unknown';
	// Bounding box in percentage (0-1) of the image
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	confidence?: number;
}

export interface MapGridEstimate {
	columns: number;
	rows: number;
	tileSize?: number;
}

export interface MapAnalysisResult {
	grid?: MapGridEstimate;
	regions: MapRegion[];
	description?: string;
}

export class MapAnalyzer {
	private provider: OllamaProviderInterface;
	private model: string;

	constructor(config?: { provider?: OllamaProviderInterface; model?: string }) {
		this.model = config?.model || process.env.MAP_ANALYSIS_MODEL || 'llama3.2-vision';
		this.provider =
			config?.provider ||
			createOllamaProvider({
				defaultModel: this.model,
				// Ensure we have a timeout long enough for image processing
				timeout: 60000,
			});
	}

	async initialize(): Promise<boolean> {
		return this.provider.initialize();
	}

	/**
	 * Analyze a map image to detect grid and terrain features
	 * @param base64Image Base64 encoded image string (without data URI prefix)
	 */
	async analyze(base64Image: string): Promise<MapAnalysisResult> {
		if (!this.provider.isInitialized) {
			await this.provider.initialize();
		}

		const prompt = `
You are a Dungeon Master's assistant analyzing a battle map for a tabletop RPG.
Analyze the provided map image and extract the following information in strict JSON format:

1.  **Grid Estimation**: Estimate the number of grid columns and rows.
2.  **Terrain Regions**: Identify areas of interest such as:
    *   "wall": Impassable walls or obstacles (often black or thick lines).
    *   "tree": Trees or foliage that provide cover.
    *   "water": Water bodies (difficult or impassable).
    *   "difficult": Rubble, marsh, or other difficult terrain.
    *   "door": Entryways or doors.
    *   "road": Clear paths or roads.

For each region, provide a bounding box as percentages (0.0 to 1.0) of the image width/height.

Output ONLY valid JSON matching this schema:
{
  "grid": { "columns": number, "rows": number },
  "regions": [
    { "type": "string", "bounds": { "x": number, "y": number, "width": number, "height": number } }
  ],
  "description": "Short summary of the map"
}
`;

		try {
			const response = await this.provider.completion(
				[
					{
						role: 'user',
						content: prompt,
						images: [base64Image],
					},
				],
				{
					model: this.model,
					temperature: 0.2, // Low temperature for more deterministic JSON
					num_predict: 1024,
				},
			);

			return this.parseResponse(response);
		} catch (error) {
			console.error('Map analysis failed:', error);
			// Return empty result on failure rather than crashing
			return { regions: [] };
		}
	}

	private parseResponse(response: string): MapAnalysisResult {
		try {
			// Find JSON block if wrapped in markdown
			const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                              response.match(/```\n([\s\S]*?)\n```/) ||
                              [null, response];

			const jsonStr = jsonMatch[1] || response;
			const parsed = JSON.parse(jsonStr);

			return {
				grid: parsed.grid,
				regions: Array.isArray(parsed.regions) ? parsed.regions : [],
				description: parsed.description,
			};
		} catch (error) {
			console.warn('Failed to parse map analysis JSON:', error);
			console.debug('Raw response:', response);
			return { regions: [] };
		}
	}
}






