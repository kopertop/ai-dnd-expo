/**
 * Simple Companion System - Extends existing Character type
 */

import type { Character } from './character';

export interface CompanionBehavior {
	combatStyle: 'aggressive' | 'defensive' | 'balanced' | 'support';
	followDistance: 'close' | 'medium' | 'far';
	independence: number; // 0-100
}

export interface CompanionVoice {
	personality: string;
	speakingStyle: string;
	catchphrases: string[];
}

export interface Companion extends Character {
	// Companion-specific properties
	type: 'companion';
	companionType: 'hired' | 'quest' | 'story' | 'summoned';

	// Party management
	isActive: boolean;
	loyalty: number; // 0-100

	// AI behavior
	behavior: CompanionBehavior;
	voice: CompanionVoice;

	// Recruitment info
	recruiter?: string; // Who recruited this companion
	recruitedAt: number; // Timestamp
	cost?: {
		type: 'gold' | 'favor' | 'quest';
		amount?: number;
		description: string;
	};
}

export interface PartyConfiguration {
	maxSize: number;
	activeCompanions: string[]; // companion IDs
	formation?: 'line' | 'diamond' | 'circle' | 'custom';
	leadershipStyle: 'democratic' | 'authoritarian' | 'laissez-faire';
}

export interface CompanionTemplate {
	name: string;
	race: string;
	class: string;
	level: number;
	description: string;
	personality: string;
	catchphrases: string[];
	companionType: Companion['companionType'];
	cost?: Companion['cost'];
	image?: string;
}
