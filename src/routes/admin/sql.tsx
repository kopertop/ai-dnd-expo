import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { resolveApiBaseUrl } from '~/utils/api-base-url';
import { currentUserQueryOptions } from '~/utils/auth';
import { useAuthSession } from '~/utils/session';

type QueryResult = {
	columns: string[];
	rows: Array<Record<string, unknown>>;
	rowCount: number;
	executionTime?: number;
	lastInsertRowid?: number | null;
	error?: string;
};

const joinApiPath = (baseUrl: string, path: string) => {
	const trimmed = path.startsWith('/') ? path.slice(1) : path;
	return `${baseUrl}${trimmed}`;
};

const getServerApiBaseUrl = () => {
	const requestUrl = new URL(getRequestUrl({ xForwardedHost: true }));
	const base = resolveApiBaseUrl(requestUrl.origin);
	if (base.startsWith('http')) {
		return base;
	}
	return `${requestUrl.origin}${base.startsWith('/') ? '' : '/'}${base}`;
};

const fetchSqlTables = createServerFn({ method: 'GET' }).handler(async () => {
	const session = await useAuthSession();
	const token = session.data.deviceToken;

	if (!token) {
		throw new Error('Not authenticated');
	}

	const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/admin/sql/tables'), {
		headers: {
			Authorization: `Device ${token}`,
		},
	});

	if (response.status === 401 || response.status === 404) {
		await session.clear();
		throw new Error('Not authenticated');
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to load tables: ${response.status} ${errorText}`);
	}

	return (await response.json()) as { tables: string[] };
});

const executeSqlQuery = createServerFn({ method: 'POST' })
	.inputValidator((data: { query: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/admin/sql/query'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Device ${token}`,
			},
			body: JSON.stringify({ query: data.query }),
		});

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		const json = (await response.json().catch(() => null)) as any;

		if (!response.ok) {
			const errorMessage =
				typeof json?.error === 'string'
					? json.error
					: typeof json?.message === 'string'
						? json.message
						: `Failed to execute query: ${response.status}`;
			throw new Error(errorMessage);
		}

		return json as QueryResult;
	});

const SqlModal: React.FC<{
	title: string;
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}> = ({ title, isOpen, onClose, children }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
				<div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
					<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
						{title}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						Close
					</button>
				</div>
				<div className="max-h-[70vh] overflow-auto p-4">{children}</div>
			</div>
		</div>
	);
};

const AdminSql: React.FC = () => {
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const [selectedTable, setSelectedTable] = React.useState<string | null>(null);
	const [query, setQuery] = React.useState('');
	const [result, setResult] = React.useState<QueryResult | null>(null);
	const [cellModal, setCellModal] = React.useState<{ column: string; value: string } | null>(null);
	const [rowModal, setRowModal] = React.useState<Record<string, unknown> | null>(null);

	const tablesQuery = useQuery({
		queryKey: ['admin-sql-tables'],
		queryFn: fetchSqlTables,
		enabled: isAdmin,
	});

	const executeMutation = useMutation({
		mutationFn: async (payload: { query: string }) => executeSqlQuery({ data: payload }),
		onSuccess: (data) => {
			setResult(data);
		},
		onError: (error) => {
			setResult({
				columns: [],
				rows: [],
				rowCount: 0,
				error: error instanceof Error ? error.message : 'Failed to execute query',
			});
		},
	});

	const tables = tablesQuery.data?.tables ?? [];

	const handleSelectTable = (tableName: string) => {
		setSelectedTable(tableName);
		setQuery(`SELECT * FROM ${tableName} LIMIT 100`);
	};

	const handleExecute = async () => {
		if (!query.trim()) {
			setResult({
				columns: [],
				rows: [],
				rowCount: 0,
				error: 'Please enter a SQL query',
			});
			return;
		}

		setResult(null);
		await executeMutation.mutateAsync({ query });
	};

	if (!isAdmin) {
		return (
			<RouteShell
				title="SQL"
				description="Execute SQL queries and inspect database state."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to use the SQL interface.
				</div>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title="SQL"
			description="Execute SQL queries and inspect database state."
		>
			<div className="grid gap-4 lg:grid-cols-[260px_1fr]">
				<div className="rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
					<div className="mb-3 flex items-center justify-between gap-2">
						<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
							Tables
						</div>
						{tablesQuery.isFetching ? (
							<div className="text-xs text-slate-500">Loading…</div>
						) : null}
					</div>

					{tablesQuery.isError ? (
						<div className="text-sm text-red-600">
							{tablesQuery.error instanceof Error
								? tablesQuery.error.message
								: 'Failed to load tables'}
						</div>
					) : (
						<div className="max-h-[60vh] space-y-1 overflow-auto">
							{tables.length === 0 ? (
								<div className="text-sm text-slate-500">No tables found.</div>
							) : (
								tables.map((table) => (
									<button
										key={table}
										type="button"
										onClick={() => handleSelectTable(table)}
										className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
											selectedTable === table
												? 'bg-amber-600 text-white'
												: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
										}`}
									>
										{table}
									</button>
								))
							)}
						</div>
					)}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
						<div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
							SQL Query
						</div>
						<textarea
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							rows={7}
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
							placeholder="Enter SQL query here…"
						/>

						<div className="mt-3 flex items-center gap-3">
							<button
								type="button"
								onClick={handleExecute}
								disabled={executeMutation.isPending}
								className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
							>
								{executeMutation.isPending ? 'Executing…' : 'Execute'}
							</button>
							<div className="text-xs text-slate-500">
								Be careful: non-SELECT queries will mutate data.
							</div>
						</div>
					</div>

					{result ? (
						<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
							<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
								<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									Results
								</div>
								<div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
									<div>
										Rows: <span className="font-semibold">{result.rowCount}</span>
									</div>
									{result.executionTime !== undefined ? (
										<div>
											Time:{' '}
											<span className="font-semibold">{result.executionTime}ms</span>
										</div>
									) : null}
									{result.lastInsertRowid !== undefined && result.lastInsertRowid !== null ? (
										<div>
											Last ID:{' '}
											<span className="font-semibold">{result.lastInsertRowid}</span>
										</div>
									) : null}
								</div>
							</div>

							{result.error ? (
								<div className="rounded-md border border-red-200 bg-red-50 p-3 font-mono text-sm text-red-700">
									{result.error}
								</div>
							) : result.columns.length === 0 ? (
								<div className="text-sm text-slate-500">No rows returned.</div>
							) : (
								<div className="overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
									<table className="min-w-full border-collapse text-left text-sm">
										<thead className="bg-slate-100 dark:bg-slate-800">
											<tr>
												<th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
													View
												</th>
												{result.columns.map((col) => (
													<th
														key={col}
														className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
													>
														{col}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{result.rows.map((row, rowIndex) => (
												<tr
													key={rowIndex}
													className={rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-900'}
												>
													<td className="sticky left-0 z-10 border-b border-slate-200 bg-inherit px-3 py-2 dark:border-slate-700">
														<button
															type="button"
															onClick={() => setRowModal(row)}
															className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-slate-800"
														>
															View
														</button>
													</td>
													{result.columns.map((col) => {
														const value = row[col];
														const display =
															value === null || value === undefined ? 'NULL' : String(value);
														return (
															<td
																key={col}
																className="border-b border-slate-200 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
															>
																<button
																	type="button"
																	onClick={() => setCellModal({ column: col, value: display })}
																	className="block max-w-[260px] truncate text-left hover:underline"
																>
																	{display}
																</button>
															</td>
														);
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					) : null}
				</div>
			</div>

			<SqlModal
				title={cellModal ? `Cell: ${cellModal.column}` : 'Cell'}
				isOpen={cellModal !== null}
				onClose={() => setCellModal(null)}
			>
				<pre className="whitespace-pre-wrap break-words font-mono text-sm text-slate-900 dark:text-slate-100">
					{cellModal?.value}
				</pre>
			</SqlModal>

			<SqlModal
				title="Row Data"
				isOpen={rowModal !== null}
				onClose={() => setRowModal(null)}
			>
				{rowModal ? (
					<div className="space-y-3">
						{Object.entries(rowModal).map(([key, value]) => (
							<div
								key={key}
								className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
							>
								<div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
									{key}
								</div>
								<div className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
									{value === null || value === undefined ? 'NULL' : String(value)}
								</div>
							</div>
						))}
					</div>
				) : null}
			</SqlModal>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/sql')({
	component: AdminSql,
});

