import * as React from 'react';

interface InviteCodeInputProps {
	onSubmit: (code: string) => void;
	loading?: boolean;
}

export const InviteCodeInput: React.FC<InviteCodeInputProps> = ({
	onSubmit,
	loading = false,
}) => {
	const [code, setCode] = React.useState('');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (normalizedCode.length === 6) {
			onSubmit(normalizedCode);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
					Enter Invite Code
				</h2>
				<p className="text-slate-600 dark:text-slate-400 text-center">
					Ask the host for the 6-character invite code
				</p>
			</div>
			<form onSubmit={handleSubmit} className="w-full max-w-md">
				<div className="mb-6">
					<input
						type="text"
						value={code}
						onChange={(e) => {
							// Only allow alphanumeric, max 6 characters
							const normalized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
							setCode(normalized);
						}}
						placeholder="ABC123"
						maxLength={6}
						autoCapitalize="characters"
						autoCorrect="off"
						disabled={loading}
						className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-lg px-6 text-3xl font-bold tracking-wider text-center text-slate-900 dark:text-slate-100 border-2 border-amber-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
					/>
				</div>
				<button
					type="submit"
					disabled={code.length !== 6 || loading}
					className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-lg transition-colors"
				>
					{loading ? 'Joining...' : 'Join Game'}
				</button>
			</form>
		</div>
	);
};
