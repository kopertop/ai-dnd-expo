export {};

declare global {
	const Bun: {
		spawn: (...args: any[]) => {
			stdout: ReadableStream<Uint8Array>;
			stderr: ReadableStream<Uint8Array>;
			exitCode: number;
			exited: Promise<number>;
		};
		spawnSync: (...args: any[]) => any;
	};

	interface ImportMeta {
		dir: string;
	}
}

