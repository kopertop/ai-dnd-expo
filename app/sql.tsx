import { Feather } from '@expo/vector-icons';
import { useMutationApi, useQueryApi } from 'expo-auth-template/frontend';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
        ActivityIndicator,
        Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { AnimatedModal } from '@/components/animated-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenSize } from '@/hooks/use-screen-size';

interface QueryResult {
	columns: string[];
	rows: any[];
	rowCount: number;
	executionTime?: number;
	lastInsertRowid?: number | null;
	error?: string;
}

const SqlDebugScreen: React.FC = () => {
        const { width: screenWidth, height: screenHeight, isPhone } = useScreenSize();
        const {
                data: tablesData,
                isLoading: loadingTables,
                refetch: refetchTables,
        } = useQueryApi<{ tables: string[] }>('/admin/sql/tables', {
                onError: (error: any) => {
                        console.error('Error loading tables:', error);
                        if (error?.status === 403) {
                                Alert.alert(
                                        'Access Denied',
                                        'You must be an admin to access the SQL debug interface.',
                                );
                        } else {
                                Alert.alert('Error', 'Failed to load tables');
                        }
                },
        });
        const executeQueryMutation = useMutationApi<QueryResult>({ method: 'POST' });
        const tables = tablesData?.tables || [];
        const [query, setQuery] = useState('');
        const [result, setResult] = useState<QueryResult | null>(null);
        const [selectedTable, setSelectedTable] = useState<string | null>(null);
        const [cellModalVisible, setCellModalVisible] = useState(false);
        const [cellModalContent, setCellModalContent] = useState<{
		column: string;
		value: string;
	} | null>(null);
	const [rowModalVisible, setRowModalVisible] = useState(false);
	const [rowModalData, setRowModalData] = useState<any | null>(null);
	const COLUMN_WIDTH = 150;
	const ROW_ACTION_COLUMN_WIDTH = 50;

        // Calculate modal dimensions based on screen size
        const modalWidth = isPhone ? screenWidth * 0.95 : Math.max(screenWidth * 0.5, 400);
        const modalHeight = isPhone ? screenHeight * 0.95 : Math.max(screenHeight * 0.5, 400);

	const handleTableClick = (tableName: string) => {
		setSelectedTable(tableName);
		setQuery(`SELECT * FROM ${tableName} LIMIT 100`);
	};

        const executeQuery = async () => {
                if (!query.trim()) {
                        Alert.alert('Error', 'Please enter a SQL query');
                        return;
                }

                setResult(null);

                try {
                        const response = await executeQueryMutation.mutateAsync({
                                path: '/admin/sql/query',
                                body: { query },
                        });

                        setResult({
                                columns: response.columns || [],
				rows: response.rows || [],
				rowCount: response.rowCount || 0,
				executionTime: response.executionTime,
				lastInsertRowid: response.lastInsertRowid,
			});
		} catch (error: any) {
			console.error('Error executing query:', error);
                        const errorMessage =
                                error.message || error.error || 'Failed to execute query';
                        setResult({
				columns: [],
				rows: [],
				rowCount: 0,
				error: errorMessage,
			});
                }
        };

	const handleCellPress = (column: string, value: any) => {
		const stringValue =
			value !== null && value !== undefined ? String(value) : 'NULL';
		setCellModalContent({ column, value: stringValue });
		setCellModalVisible(true);
	};

	const handleRowViewPress = (row: any) => {
		setRowModalData(row);
		setRowModalVisible(true);
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'SQL Debug',
					headerShown: true,
				}}
			/>
			<View style={styles.content}>
				{/* Left Sidebar - Tables */}
				<View style={styles.sidebar}>
					<ThemedText type="subtitle" style={styles.sidebarTitle}>
						Tables
					</ThemedText>
                                        {loadingTables ? (
                                                <ActivityIndicator size="small" color="#C9B037" />
                                        ) : (
                                                <ScrollView style={styles.tableList}>
							{tables.map((table) => (
								<TouchableOpacity
									key={table}
									style={[
										styles.tableItem,
										selectedTable === table && styles.tableItemSelected,
									]}
									onPress={() => handleTableClick(table)}
								>
									<ThemedText
										style={[
											styles.tableItemText,
											selectedTable === table &&
												styles.tableItemTextSelected,
										]}
									>
										{table}
									</ThemedText>
								</TouchableOpacity>
							))}
						</ScrollView>
					)}
				</View>

				{/* Right Side - Query Input and Results */}
				<View style={styles.mainContent}>
					<View style={styles.querySection}>
						<ThemedText type="subtitle" style={styles.sectionTitle}>
							SQL Query
						</ThemedText>
						<TextInput
							style={styles.queryInput}
							value={query}
							onChangeText={setQuery}
							placeholder="Enter SQL query here..."
							placeholderTextColor="#999"
							multiline
							textAlignVertical="top"
						/>
                                                <TouchableOpacity
                                                        style={[
                                                                styles.executeButton,
                                                                executeQueryMutation.isPending && styles.executeButtonDisabled,
                                                        ]}
                                                        onPress={executeQuery}
                                                        disabled={executeQueryMutation.isPending}
                                                >
                                                        {executeQueryMutation.isPending ? (
                                                                <ActivityIndicator size="small" color="#F5E6D3" />
                                                        ) : (
                                                                <ThemedText style={styles.executeButtonText}>Execute</ThemedText>
							)}
						</TouchableOpacity>
					</View>

					{/* Results Section */}
					{result && (
						<View style={styles.resultsSection}>
							<ThemedText type="subtitle" style={styles.sectionTitle}>
								Results
							</ThemedText>
							{result.error ? (
								<View style={styles.errorBox}>
									<ThemedText style={styles.errorText}>{result.error}</ThemedText>
								</View>
							) : (
								<>
									<View style={styles.resultMeta}>
										<ThemedText style={styles.metaText}>
											Rows: {result.rowCount}
										</ThemedText>
										{result.executionTime !== undefined && (
											<ThemedText style={styles.metaText}>
												Time: {result.executionTime}ms
											</ThemedText>
										)}
										{
											result.lastInsertRowid !== null &&
											result.lastInsertRowid !== undefined && (
												<ThemedText style={styles.metaText}>
													Last ID: {result.lastInsertRowid}
												</ThemedText>
											)
										}
									</View>
									{result.columns.length > 0 && (
										<View style={styles.tableOuterContainer}>
											<ScrollView
												horizontal
												style={styles.tableContainer}
												contentContainerStyle={styles.tableContentContainer}
											>
												<View style={styles.tableWrapper}>
													{/* Table Header */}
													<View style={styles.tableRow}>
														<View
															style={[
																styles.tableHeaderCell,
																styles.rowActionCell,
																{ width: ROW_ACTION_COLUMN_WIDTH },
															]}
														>
															<ThemedText style={styles.tableHeaderText}>
																View
															</ThemedText>
														</View>
														{result.columns.map((col) => (
															<View
																key={col}
																style={[
																	styles.tableHeaderCell,
																	{ width: COLUMN_WIDTH },
																]}
															>
																<ThemedText
																	style={styles.tableHeaderText}
																	numberOfLines={1}
																>
																	{col}
																</ThemedText>
															</View>
														))}
													</View>
													{/* Table Rows */}
													{result.rows.map((row, rowIndex) => (
														<View
															key={rowIndex}
															style={[
																styles.tableRow,
																rowIndex % 2 === 0 && styles.tableRowEven,
															]}
														>
															<TouchableOpacity
																style={[
																	styles.tableCell,
																	styles.rowActionCell,
																	{ width: ROW_ACTION_COLUMN_WIDTH },
																]}
																onPress={() => handleRowViewPress(row)}
															>
																<Feather
																	name="eye"
																	size={16}
																	color="#8B6914"
																/>
															</TouchableOpacity>
															{result.columns.map((col) => (
																<TouchableOpacity
																	key={col}
																	style={[
																		styles.tableCell,
																		{ width: COLUMN_WIDTH },
																	]}
																	onPress={() =>
																		handleCellPress(col, row[col])
																	}
																>
																	<ThemedText
																		style={styles.tableCellText}
																		numberOfLines={1}
																	>
																		{row[col] !== null &&
																			row[col] !== undefined
																			? String(row[col])
																			: 'NULL'}
																	</ThemedText>
																</TouchableOpacity>
															))}
														</View>
													))}
												</View>
											</ScrollView>
										</View>
									)}
								</>
							)}
						</View>
					)}
				</View>
			</View>

			{/* Cell Value Modal */}
			<AnimatedModal
				visible={cellModalVisible}
				onClose={() => setCellModalVisible(false)}
				animationType="scale"
			>
				<ThemedView
					style={[
						styles.modalContent,
						{
							width: modalWidth,
							height: modalHeight,
						},
					]}
				>
					<View style={styles.modalHeader}>
						<ThemedText type="subtitle" style={styles.modalTitle}>
							{cellModalContent?.column}
						</ThemedText>
						<TouchableOpacity
							onPress={() => setCellModalVisible(false)}
							style={styles.modalCloseButton}
						>
							<Feather name="x" size={24} color="#3B2F1B" />
						</TouchableOpacity>
					</View>
					<ScrollView style={styles.modalBody}>
						<ThemedText style={styles.modalValueText}>
							{cellModalContent?.value}
						</ThemedText>
					</ScrollView>
				</ThemedView>
			</AnimatedModal>

			{/* Row Data Modal */}
			<AnimatedModal
				visible={rowModalVisible}
				onClose={() => setRowModalVisible(false)}
				animationType="scale"
			>
				<ThemedView
					style={[
						styles.modalContent,
						{
							width: modalWidth,
							height: modalHeight,
						},
					]}
				>
					<View style={styles.modalHeader}>
						<ThemedText type="subtitle" style={styles.modalTitle}>
							Full Row Data
						</ThemedText>
						<TouchableOpacity
							onPress={() => setRowModalVisible(false)}
							style={styles.modalCloseButton}
						>
							<Feather name="x" size={24} color="#3B2F1B" />
						</TouchableOpacity>
					</View>
					<ScrollView style={styles.modalBody}>
						{result &&
							result.columns.map((col) => (
								<View key={col} style={styles.rowDataItem}>
									<ThemedText style={styles.rowDataLabel}>{col}:</ThemedText>
									<ThemedText style={styles.rowDataValue}>
										{rowModalData &&
										rowModalData[col] !== null &&
										rowModalData[col] !== undefined
											? String(rowModalData[col])
											: 'NULL'}
									</ThemedText>
								</View>
							))}
					</ScrollView>
				</ThemedView>
			</AnimatedModal>
		</ThemedView>
	);
};

SqlDebugScreen.displayName = 'SqlDebug';
export default SqlDebugScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		flexDirection: 'row',
	},
	sidebar: {
		width: 200,
		borderRightWidth: 1,
		borderRightColor: '#E2D3B3',
		padding: 16,
		backgroundColor: 'rgba(0,0,0,0.02)',
	},
	sidebarTitle: {
		marginBottom: 12,
		fontWeight: '600',
	},
	tableList: {
		flex: 1,
	},
	tableItem: {
		padding: 10,
		borderRadius: 6,
		marginBottom: 4,
		backgroundColor: 'rgba(255,255,255,0.5)',
	},
	tableItemSelected: {
		backgroundColor: '#C9B037',
	},
	tableItemText: {
		fontSize: 14,
		color: '#3B2F1B',
	},
	tableItemTextSelected: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	mainContent: {
		flex: 1,
		padding: 16,
	},
	querySection: {
		marginBottom: 24,
	},
	sectionTitle: {
		marginBottom: 8,
		fontWeight: '600',
	},
	queryInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		padding: 12,
		fontSize: 14,
		fontFamily: 'monospace',
		minHeight: 120,
		marginBottom: 12,
		color: '#3B2F1B',
	},
	executeButton: {
		backgroundColor: '#8B6914',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
	},
	executeButtonDisabled: {
		opacity: 0.6,
	},
	executeButtonText: {
		color: '#F5E6D3',
		fontWeight: 'bold',
		fontSize: 16,
	},
	resultsSection: {
		flex: 1,
	},
	resultMeta: {
		flexDirection: 'row',
		gap: 16,
		marginBottom: 12,
	},
	metaText: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	errorBox: {
		backgroundColor: '#FFEBEE',
		padding: 12,
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#F44336',
	},
	errorText: {
		color: '#C62828',
		fontFamily: 'monospace',
		fontSize: 12,
	},
	tableOuterContainer: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		maxHeight: 500,
	},
	tableContainer: {
		flex: 1,
	},
	tableContentContainer: {
		flexGrow: 1,
	},
	tableWrapper: {
		flexDirection: 'column',
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		minHeight: 40,
	},
	tableRowEven: {
		backgroundColor: 'rgba(0,0,0,0.02)',
	},
	tableHeaderCell: {
		padding: 10,
		backgroundColor: '#F5E6D3',
		borderRightWidth: 1,
		borderRightColor: '#E2D3B3',
		justifyContent: 'center',
		alignItems: 'flex-start',
		flexShrink: 0,
	},
	tableHeaderText: {
		fontWeight: '600',
		fontSize: 12,
		color: '#3B2F1B',
	},
	tableCell: {
		padding: 10,
		borderRightWidth: 1,
		borderRightColor: '#E2D3B3',
		justifyContent: 'center',
		alignItems: 'flex-start',
		flexShrink: 0,
	},
	tableCellText: {
		fontSize: 12,
		color: '#3B2F1B',
		fontFamily: 'monospace',
	},
	rowActionCell: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalContent: {
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
		padding: 20,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	modalTitle: {
		fontWeight: '600',
		flex: 1,
	},
	modalCloseButton: {
		padding: 4,
	},
	modalBody: {
		maxHeight: 400,
	},
	modalValueText: {
		fontFamily: 'monospace',
		fontSize: 14,
		color: '#3B2F1B',
		padding: 12,
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	rowDataItem: {
		marginBottom: 12,
		padding: 12,
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	rowDataLabel: {
		fontWeight: '600',
		fontSize: 14,
		color: '#8B6914',
		marginBottom: 4,
	},
	rowDataValue: {
		fontFamily: 'monospace',
		fontSize: 13,
		color: '#3B2F1B',
	},
});

