import { z } from 'zod';

// Character types for voice assignment
export const CharacterTypeSchema = z.enum(['player', 'npc', 'companion', 'dm', 'narrator']);
export type CharacterType = z.infer<typeof CharacterTypeSchema>;

// Voice characteristics
export const VoiceCharacteristicsSchema = z.object({
	gender: z.enum(['male', 'female', 'neutral']),
	age: z.enum(['young', 'adult', 'elderly']),
	pitch: z.number().min(0.5).max(2.0).default(1.0),
	rate: z.number().min(0.1).max(1.0).default(0.5),
	quality: z.enum(['low', 'medium', 'high']).default('medium'),
});
export type VoiceCharacteristics = z.infer<typeof VoiceCharacteristicsSchema>;

// Voice profile definition
export const VoiceProfileSchema = z.object({
	id: z.string(),
	name: z.string(),
	displayName: z.string(),

	// Technical properties
	engine: z.enum(['platform', 'chatterbox', 'cloud', 'kokoro']),
	engineVoiceId: z.string(),
	language: z.string().default('en-US'),

	// Voice characteristics
	characteristics: VoiceCharacteristicsSchema,

	// Character suitability
	suitableFor: z.array(CharacterTypeSchema),
	personality: z.array(z.string()),

	// Usage tracking
	isAssigned: z.boolean().default(false),
	assignedTo: z.string().optional(),
	lastUsed: z.number().optional(),
});
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

// Character traits for voice matching
export const CharacterTraitsSchema = z.object({
	race: z.string(),
	class: z.string(),
	gender: z.enum(['male', 'female', 'neutral']).optional(),
	personality: z.string().optional(),
	age: z.enum(['young', 'adult', 'elderly']).optional(),
	characterType: CharacterTypeSchema,
});
export type CharacterTraits = z.infer<typeof CharacterTraitsSchema>;

// Voice assignment data
export const VoiceAssignmentSchema = z.object({
	characterId: z.string(),
	voiceId: z.string(),
	assignedAt: z.number(),
	characterType: CharacterTypeSchema,
	characterName: z.string(),
	isLocked: z.boolean().default(false), // Prevents automatic reassignment
});
export type VoiceAssignment = z.infer<typeof VoiceAssignmentSchema>;

// Voice assignment storage schema
export const VoiceAssignmentDataSchema = z.object({
	version: z.string().default('1.0.0'),
	lastUpdated: z.number(),
	assignments: z.record(z.string(), VoiceAssignmentSchema),
	voiceUsage: z.record(
		z.string(),
		z.object({
			assignedCount: z.number().default(0),
			lastUsed: z.number(),
			totalUsageTime: z.number().default(0),
		}),
	),
});
export type VoiceAssignmentData = z.infer<typeof VoiceAssignmentDataSchema>;

// TTS options for character-specific speech
export const CharacterTTSOptionsSchema = z.object({
	characterId: z.string().optional(),
	voiceId: z.string().optional(),
	language: z.string().optional(),
	pitch: z.number().optional(),
	rate: z.number().optional(),
	onStart: z.function().optional(),
	onDone: z.function().optional(),
	onStopped: z.function().optional(),
	onError: z.function().optional(),
});
export type CharacterTTSOptions = z.infer<typeof CharacterTTSOptionsSchema>;
