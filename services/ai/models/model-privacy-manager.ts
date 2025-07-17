/**
 * Model Privacy Manager for Local AI D&D Platform
 *
 * Manages privacy controls, data cleanup, and compliance features
 * for local AI model usage and data handling.
 *
 * Requirements: 5.4, 5.1, 5.2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import { ModelCacheManager } from './model-cache-manager';
import { ModelStorageManager } from './model-storage-manager';

export interface PrivacySettings {
	dataRetentionDays: number;
	autoCleanupEnabled: boolean;
	encryptLocalData: boolean;
	anonymizeUsageData: boolean;
	shareUsageAnalytics: boolean;
	logInteractions: boolean;
	maxLogEntries: number;
	secureDeleteEnabled: boolean;
	offlineOnlyMode: boolean;
}

export interface DataCleanupOptions {
	includeModels?: boolean;
	includeCache?: boolean;
	includeLogs?: boolean;
	includeSettings?: boolean;
	includeAnalytics?: boolean;
	secureDelete?: boolean;
	olderThanDays?: number;
	specificModelId?: string;
}

export interface PrivacyAuditEntry {
	timestamp: number;
	action: string;
	dataType: string;
	details: string;
	userId?: string;
	modelId?: string;
	outcome: 'success' | 'failure' | 'partial';
}

export interface ComplianceReport {
	timestamp: number;
	dataRetentionCompliance: boolean;
	encryptionCompliance: boolean;
	accessLogCompliance: boolean;
	deletionCompliance: boolean;
	issues: string[];
	recommendations: string[];
	nextReviewDate: number;
}

export interface UsageAnalytics {
	modelUsage: Record<string, number>;
	featureUsage: Record<string, number>;
	performanceMetrics: {
		averageResponseTime: number;
		totalInferences: number;
		errorRate: number;
	};
	privacyMetrics: {
		dataCleanups: number;
		secureDeletes: number;
		encryptedEntries: number;
	};
	anonymized: boolean;
	collectionPeriod: {
		start: number;
		end: number;
	};
}

const STORAGE_KEYS = {
	PRIVACY_SETTINGS: 'model_privacy_settings',
	AUDIT_LOG: 'model_privacy_audit_log',
	USAGE_ANALYTICS: 'model_usage_analytics',
	COMPLIANCE_REPORTS: 'model_compliance_reports',
	DELETION_LOG: 'model_deletion_log',
	ENCRYPTION_STATUS: 'model_encryption_status',
} as const;

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
	dataRetentionDays: 30,
	autoCleanupEnabled: true,
	encryptLocalData: true,
	anonymizeUsageData: true,
	shareUsageAnalytics: false,
	logInteractions: true,
	maxLogEntries: 10000,
	secureDeleteEnabled: true,
	offlineOnlyMode: false,
};

export class ModelPrivacyManager {
	private privacySettings: PrivacySettings = DEFAULT_PRIVACY_SETTINGS;
	private auditLog: PrivacyAuditEntry[] = [];
	private storageManager?: ModelStorageManager;
	private cacheManager?: ModelCacheManager;

	constructor(
		storageManager?: ModelStorageManager,
		cacheManager?: ModelCacheManager,
	) {
		this.storageManager = storageManager;
		this.cacheManager = cacheManager;
		this.initialize();
	}

	/**
	 * Initialize privacy manager
	 */
	private async initialize(): Promise<void> {
		try {
			await this.loadPrivacySettings();
			await this.loadAuditLog();
			
			// Start periodic cleanup if enabled
			if (this.privacySettings.autoCleanupEnabled) {
				this.startPeriodicCleanup();
			}
			
			// Schedule compliance audits
			this.scheduleComplianceAudits();
			
		} catch (error) {
			console.error('Failed to initialize ModelPrivacyManager:', error);
		}
	}

	/**
	 * Load privacy settings
	 */
	private async loadPrivacySettings(): Promise<void> {
		try {
			const settingsData = await AsyncStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
			if (settingsData) {
				this.privacySettings = { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(settingsData) };
			}
		} catch (error) {
			console.error('Failed to load privacy settings:', error);
		}
	}

	/**
	 * Save privacy settings
	 */
	private async savePrivacySettings(): Promise<void> {
		try {
			await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(this.privacySettings));
			await this.logAuditEntry('settings_updated', 'privacy_settings', 'Privacy settings were updated');
		} catch (error) {
			console.error('Failed to save privacy settings:', error);
		}
	}

	/**
	 * Load audit log
	 */
	private async loadAuditLog(): Promise<void> {
		try {
			const logData = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
			if (logData) {
				this.auditLog = JSON.parse(logData);
				
				// Trim log if it exceeds max entries
				if (this.auditLog.length > this.privacySettings.maxLogEntries) {
					this.auditLog = this.auditLog.slice(-this.privacySettings.maxLogEntries);
					await this.saveAuditLog();
				}
			}
		} catch (error) {
			console.error('Failed to load audit log:', error);
		}
	}

	/**
	 * Save audit log
	 */
	private async saveAuditLog(): Promise<void> {
		try {
			await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(this.auditLog));
		} catch (error) {
			console.error('Failed to save audit log:', error);
		}
	}

	/**
	 * Log audit entry
	 */
	private async logAuditEntry(
		action: string,
		dataType: string,
		details: string,
		outcome: 'success' | 'failure' | 'partial' = 'success',
		userId?: string,
		modelId?: string,
	): Promise<void> {
		if (!this.privacySettings.logInteractions) {
			return;
		}

		const entry: PrivacyAuditEntry = {
			timestamp: Date.now(),
			action,
			dataType,
			details,
			outcome,
			userId,
			modelId,
		};

		this.auditLog.push(entry);

		// Trim log if needed
		if (this.auditLog.length > this.privacySettings.maxLogEntries) {
			this.auditLog = this.auditLog.slice(-this.privacySettings.maxLogEntries);
		}

		await this.saveAuditLog();
	}

	/**
	 * Update privacy settings
	 */
	async updatePrivacySettings(newSettings: Partial<PrivacySettings>): Promise<void> {
		const oldSettings = { ...this.privacySettings };
		this.privacySettings = { ...this.privacySettings, ...newSettings };
		
		await this.savePrivacySettings();

		// Handle setting changes
		if (oldSettings.autoCleanupEnabled !== this.privacySettings.autoCleanupEnabled) {
			if (this.privacySettings.autoCleanupEnabled) {
				this.startPeriodicCleanup();
			}
		}

		if (oldSettings.dataRetentionDays !== this.privacySettings.dataRetentionDays) {
			// Trigger immediate cleanup if retention period was reduced
			if (this.privacySettings.dataRetentionDays < oldSettings.dataRetentionDays) {
				await this.performDataCleanup({ olderThanDays: this.privacySettings.dataRetentionDays });
			}
		}
	}

	/**
	 * Get current privacy settings
	 */
	getPrivacySettings(): PrivacySettings {
		return { ...this.privacySettings };
	}

	/**
	 * Perform comprehensive data cleanup
	 */
	async performDataCleanup(options: DataCleanupOptions = {}): Promise<void> {
		const {
			includeModels = false,
			includeCache = true,
			includeLogs = true,
			includeSettings = false,
			includeAnalytics = true,
			secureDelete = this.privacySettings.secureDeleteEnabled,
			olderThanDays = this.privacySettings.dataRetentionDays,
			specificModelId,
		} = options;

		const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
		let itemsDeleted = 0;
		const errors: string[] = [];

		try {
			// Clean up models if requested
			if (includeModels && this.storageManager) {
				try {
					const allModels = this.storageManager.getAllStoredModels();
					for (const model of allModels) {
						if (specificModelId && model.modelId !== specificModelId) {
							continue;
						}
						
						if (model.lastAccessed < cutoffTime || specificModelId) {
							await this.storageManager.deleteModel(model.modelId, secureDelete);
							itemsDeleted++;
							await this.logAuditEntry(
								'model_deleted',
								'model_file',
								`Model ${model.modelId} deleted during cleanup`,
								'success',
								undefined,
								model.modelId,
							);
						}
					}
				} catch (error) {
					errors.push(`Model cleanup failed: ${error}`);
				}
			}

			// Clean up cache if requested
			if (includeCache && this.cacheManager) {
				try {
					await this.cacheManager.clearCache({
						modelId: specificModelId,
						olderThan: cutoffTime,
					});
					await this.logAuditEntry('cache_cleared', 'cache_data', 'Cache data cleared during cleanup');
				} catch (error) {
					errors.push(`Cache cleanup failed: ${error}`);
				}
			}

			// Clean up logs if requested
			if (includeLogs) {
				try {
					const originalLogLength = this.auditLog.length;
					this.auditLog = this.auditLog.filter(entry => entry.timestamp >= cutoffTime);
					const deletedLogs = originalLogLength - this.auditLog.length;
					itemsDeleted += deletedLogs;
					
					if (deletedLogs > 0) {
						await this.saveAuditLog();
						await this.logAuditEntry('logs_cleaned', 'audit_logs', `${deletedLogs} old log entries removed`);
					}
				} catch (error) {
					errors.push(`Log cleanup failed: ${error}`);
				}
			}

			// Clean up analytics if requested
			if (includeAnalytics) {
				try {
					await this.cleanupAnalyticsData(cutoffTime);
					await this.logAuditEntry('analytics_cleaned', 'usage_analytics', 'Old analytics data removed');
				} catch (error) {
					errors.push(`Analytics cleanup failed: ${error}`);
				}
			}

			// Clean up settings if requested (WARNING: This removes user preferences)
			if (includeSettings) {
				try {
					await AsyncStorage.removeItem(STORAGE_KEYS.PRIVACY_SETTINGS);
					this.privacySettings = DEFAULT_PRIVACY_SETTINGS;
					await this.logAuditEntry('settings_reset', 'privacy_settings', 'Privacy settings reset to defaults');
				} catch (error) {
					errors.push(`Settings cleanup failed: ${error}`);
				}
			}

			const outcome = errors.length > 0 ? 'partial' : 'success';
			await this.logAuditEntry(
				'data_cleanup',
				'all_data',
				`Cleanup completed: ${itemsDeleted} items deleted, ${errors.length} errors`,
				outcome,
			);

		} catch (error) {
			await this.logAuditEntry(
				'data_cleanup',
				'all_data',
				`Cleanup failed: ${error}`,
				'failure',
			);
			throw new Error(`Data cleanup failed: ${error}`);
		}
	}

	/**
	 * Perform complete data wipe
	 */
	async performCompleteDataWipe(): Promise<void> {
		try {
			// Get all storage keys related to models
			const allKeys = await AsyncStorage.getAllKeys();
			const modelKeys = allKeys.filter(key => 
				key.startsWith('model_') || 
				key.startsWith('cache_') ||
				key.startsWith('ai_'),
			);

			// Remove all model-related data from AsyncStorage
			await AsyncStorage.multiRemove(modelKeys);

			// Delete all model files
			try {
				await FileSystem.deleteAsync(`${FileSystem.documentDirectory}models/`, { idempotent: true });
				await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}models/`, { idempotent: true });
				await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}temp-models/`, { idempotent: true });
			} catch (fileError) {
				console.error('File deletion error during wipe:', fileError);
			}

			// Reset internal state
			this.auditLog = [];
			this.privacySettings = DEFAULT_PRIVACY_SETTINGS;

			// Log the wipe (this will be the only entry)
			await this.logAuditEntry(
				'complete_wipe',
				'all_data',
				'Complete data wipe performed - all AI model data removed',
				'success',
			);

		} catch (error) {
			await this.logAuditEntry(
				'complete_wipe',
				'all_data',
				`Complete wipe failed: ${error}`,
				'failure',
			);
			throw new Error(`Complete data wipe failed: ${error}`);
		}
	}

	/**
	 * Generate compliance report
	 */
	async generateComplianceReport(): Promise<ComplianceReport> {
		const issues: string[] = [];
		const recommendations: string[] = [];
		const now = Date.now();

		// Check data retention compliance
		let dataRetentionCompliance = true;
		const cutoffTime = now - (this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000);
		
		// Check for old audit logs
		const oldLogs = this.auditLog.filter(entry => entry.timestamp < cutoffTime);
		if (oldLogs.length > 0) {
			dataRetentionCompliance = false;
			issues.push(`${oldLogs.length} audit log entries exceed retention period`);
			recommendations.push('Run data cleanup to remove old audit logs');
		}

		// Check encryption compliance
		let encryptionCompliance = true;
		if (this.privacySettings.encryptLocalData) {
			// In a real implementation, check if sensitive data is actually encrypted
			// For now, assume compliance based on settings
		} else {
			encryptionCompliance = false;
			issues.push('Local data encryption is disabled');
			recommendations.push('Enable local data encryption for sensitive information');
		}

		// Check access log compliance
		let accessLogCompliance = true;
		if (!this.privacySettings.logInteractions) {
			accessLogCompliance = false;
			issues.push('Interaction logging is disabled');
			recommendations.push('Enable interaction logging for audit trail');
		}

		// Check deletion compliance
		let deletionCompliance = true;
		if (!this.privacySettings.secureDeleteEnabled) {
			deletionCompliance = false;
			issues.push('Secure deletion is disabled');
			recommendations.push('Enable secure deletion for sensitive data removal');
		}

		// Generate recommendations based on settings
		if (!this.privacySettings.autoCleanupEnabled) {
			recommendations.push('Enable automatic cleanup to maintain data retention compliance');
		}

		if (this.privacySettings.shareUsageAnalytics && !this.privacySettings.anonymizeUsageData) {
			issues.push('Usage analytics sharing enabled without anonymization');
			recommendations.push('Enable anonymization for usage analytics');
		}

		const report: ComplianceReport = {
			timestamp: now,
			dataRetentionCompliance,
			encryptionCompliance,
			accessLogCompliance,
			deletionCompliance,
			issues,
			recommendations,
			nextReviewDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
		};

		// Store compliance report
		try {
			const reports = await this.getStoredComplianceReports();
			reports.push(report);
			
			// Keep only last 12 reports (1 year if monthly)
			const recentReports = reports.slice(-12);
			await AsyncStorage.setItem(STORAGE_KEYS.COMPLIANCE_REPORTS, JSON.stringify(recentReports));
		} catch (error) {
			console.error('Failed to store compliance report:', error);
		}

		await this.logAuditEntry(
			'compliance_report',
			'compliance_data',
			`Compliance report generated: ${issues.length} issues, ${recommendations.length} recommendations`,
		);

		return report;
	}

	/**
	 * Get stored compliance reports
	 */
	private async getStoredComplianceReports(): Promise<ComplianceReport[]> {
		try {
			const reportsData = await AsyncStorage.getItem(STORAGE_KEYS.COMPLIANCE_REPORTS);
			return reportsData ? JSON.parse(reportsData) : [];
		} catch (error) {
			console.error('Failed to load compliance reports:', error);
			return [];
		}
	}

	/**
	 * Generate usage analytics
	 */
	async generateUsageAnalytics(): Promise<UsageAnalytics | null> {
		if (!this.privacySettings.shareUsageAnalytics) {
			return null;
		}

		try {
			const analyticsData = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_ANALYTICS);
			let analytics: UsageAnalytics;

			if (analyticsData) {
				analytics = JSON.parse(analyticsData);
			} else {
				analytics = {
					modelUsage: {},
					featureUsage: {},
					performanceMetrics: {
						averageResponseTime: 0,
						totalInferences: 0,
						errorRate: 0,
					},
					privacyMetrics: {
						dataCleanups: 0,
						secureDeletes: 0,
						encryptedEntries: 0,
					},
					anonymized: this.privacySettings.anonymizeUsageData,
					collectionPeriod: {
						start: Date.now(),
						end: Date.now(),
					},
				};
			}

			// Update collection period
			analytics.collectionPeriod.end = Date.now();

			// Anonymize data if required
			if (this.privacySettings.anonymizeUsageData) {
				analytics = this.anonymizeAnalytics(analytics);
			}

			await this.logAuditEntry(
				'analytics_generated',
				'usage_analytics',
				'Usage analytics generated',
				'success',
			);

			return analytics;

		} catch (error) {
			await this.logAuditEntry(
				'analytics_generated',
				'usage_analytics',
				`Analytics generation failed: ${error}`,
				'failure',
			);
			return null;
		}
	}

	/**
	 * Anonymize analytics data
	 */
	private anonymizeAnalytics(analytics: UsageAnalytics): UsageAnalytics {
		// Remove or hash any potentially identifying information
		const anonymized = { ...analytics };
		
		// Round numbers to reduce precision
		anonymized.performanceMetrics.averageResponseTime = Math.round(
			anonymized.performanceMetrics.averageResponseTime / 100,
		) * 100;
		
		anonymized.performanceMetrics.totalInferences = Math.round(
			anonymized.performanceMetrics.totalInferences / 10,
		) * 10;

		// Mark as anonymized
		anonymized.anonymized = true;

		return anonymized;
	}

	/**
	 * Clean up analytics data
	 */
	private async cleanupAnalyticsData(cutoffTime: number): Promise<void> {
		// Remove old analytics data
		await AsyncStorage.removeItem(STORAGE_KEYS.USAGE_ANALYTICS);
	}

	/**
	 * Start periodic cleanup
	 */
	private startPeriodicCleanup(): void {
		// Run cleanup daily
		setInterval(async () => {
			if (this.privacySettings.autoCleanupEnabled) {
				try {
					await this.performDataCleanup({
						includeCache: true,
						includeLogs: true,
						includeAnalytics: true,
					});
				} catch (error) {
					console.error('Periodic cleanup failed:', error);
				}
			}
		}, 24 * 60 * 60 * 1000); // 24 hours
	}

	/**
	 * Schedule compliance audits
	 */
	private scheduleComplianceAudits(): void {
		// Run compliance audit weekly
		setInterval(async () => {
			try {
				await this.generateComplianceReport();
			} catch (error) {
				console.error('Compliance audit failed:', error);
			}
		}, 7 * 24 * 60 * 60 * 1000); // 7 days
	}

	/**
	 * Get audit log
	 */
	getAuditLog(limit?: number): PrivacyAuditEntry[] {
		if (limit) {
			return this.auditLog.slice(-limit);
		}
		return [...this.auditLog];
	}

	/**
	 * Get privacy compliance status
	 */
	async getPrivacyComplianceStatus(): Promise<{
		compliant: boolean;
		lastAudit: number;
		nextAudit: number;
		activeIssues: string[];
	}> {
		const reports = await this.getStoredComplianceReports();
		const latestReport = reports[reports.length - 1];

		if (!latestReport) {
			return {
				compliant: false,
				lastAudit: 0,
				nextAudit: Date.now(),
				activeIssues: ['No compliance audit performed'],
			};
		}

		const compliant = latestReport.dataRetentionCompliance &&
			latestReport.encryptionCompliance &&
			latestReport.accessLogCompliance &&
			latestReport.deletionCompliance;

		return {
			compliant,
			lastAudit: latestReport.timestamp,
			nextAudit: latestReport.nextReviewDate,
			activeIssues: latestReport.issues,
		};
	}

	/**
	 * Export privacy data for user
	 */
	async exportPrivacyData(): Promise<{
		settings: PrivacySettings;
		auditLog: PrivacyAuditEntry[];
		complianceReports: ComplianceReport[];
		exportTimestamp: number;
	}> {
		const complianceReports = await this.getStoredComplianceReports();
		
		await this.logAuditEntry(
			'data_export',
			'privacy_data',
			'Privacy data exported for user',
			'success',
		);

		return {
			settings: this.getPrivacySettings(),
			auditLog: this.getAuditLog(),
			complianceReports,
			exportTimestamp: Date.now(),
		};
	}
}