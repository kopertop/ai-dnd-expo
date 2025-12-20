import * as React from 'react';

interface InviteCodeDisplayProps {
	inviteCode: string;
}

export const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({ inviteCode }) => {
	const [copied, setCopied] = React.useState(false);

	// Build the full game join link
	const gameLink = React.useMemo(() => {
		if (typeof window !== 'undefined') {
			return `${window.location.origin}/game/${inviteCode}`;
		}
		// Fallback for SSR
		return `/game/${inviteCode}`;
	}, [inviteCode]);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(gameLink);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
			<h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
				Game Link
			</h3>
			<div className="mb-4 flex flex-col items-center gap-4">
				<a
					href={gameLink}
					target="_blank"
					rel="noopener noreferrer"
					className="block w-full max-w-2xl break-all rounded-md bg-slate-100 px-4 py-3 text-lg font-medium text-blue-600 underline hover:text-blue-800 dark:bg-slate-700 dark:text-blue-400 dark:hover:text-blue-300"
				>
					{gameLink}
				</a>
				<button
					type="button"
					onClick={copyToClipboard}
					className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
				>
					{copied ? 'Copied!' : 'Copy Link'}
				</button>
			</div>
			<p className="text-sm text-slate-600 dark:text-slate-400">
				Share this link with players who want to join your game
			</p>
		</div>
	);
};
