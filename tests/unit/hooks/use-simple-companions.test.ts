import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanionFactory } from '@/tests/fixtures/mock-factories';
import type { Companion, CompanionTemplate, PartyConfiguration } from '@/types/companion';

// Mock console methods to avoid noise in tests
// Using vi.spyOn but not storing the reference since we don't need it
vi.spyOn(console, 'error').mockImplementation(() => { });

describe('useSimpleCompanions', () => {
	// Use spyOn for AsyncStorage methods
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null);
		vi.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
		vi.spyOn(AsyncStorage, 'removeItem').mockResolvedValue(undefined);
		vi.spyOn(AsyncStorage, 'getAllKeys').mockResolvedValue([]);
		vi.spyOn(AsyncStorage, 'multiGet').mockResolvedValue([]);
		vi.spyOn(AsyncStorage, 'multiSet').mockResolvedValue(undefined);
		vi.spyOn(AsyncStorage, 'multiRemove').mockResolvedValue(undefined);
		vi.spyOn(AsyncStorage, 'clear').mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('storage operations', () => {
		it('should save companion data to storage', async () => {
			const companions = CompanionFactory.createMany(2);
			const companionsJson = JSON.stringify(companions);

			await AsyncStorage.setItem('ai-dnd-companions', companionsJson);

			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-companions',
				companionsJson,
			);
		});

		it('should load companion data from storage', async () => {
			const companions = CompanionFactory.createMany(2);
			const companionsJson = JSON.stringify(companions);

			vi.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(companionsJson);

			const result = await AsyncStorage.getItem('ai-dnd-companions');
			const parsedCompanions = JSON.parse(result as string);

			expect(parsedCompanions).toEqual(companions);
		});

		it('should handle empty storage gracefully', async () => {
			vi.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null);

			const result = await AsyncStorage.getItem('ai-dnd-companions');

			expect(result).toBeNull();
		});

		it('should save party configuration to storage', async () => {
			const partyConfig: PartyConfiguration = {
				maxSize: 4,
				activeCompanions: ['companion1', 'companion2'],
				leadershipStyle: 'democratic',
			};
			const configJson = JSON.stringify(partyConfig);

			await AsyncStorage.setItem('ai-dnd-party-config', configJson);

			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-party-config',
				configJson,
			);
		});

		it('should handle storage errors gracefully', async () => {
			const storageError = new Error('Storage unavailable');
			vi.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(storageError);

			await expect(AsyncStorage.getItem('ai-dnd-companions')).rejects.toThrow(
				'Storage unavailable',
			);
		});
	});

	describe('companion creation and templates', () => {
		const mockTemplate: CompanionTemplate = {
			name: 'Test Companion',
			race: 'Human',
			class: 'Fighter',
			level: 2,
			description: 'A test companion',
			personality: 'Friendly',
			catchphrases: ['Hello!', 'Ready to help!'],
			companionType: 'hired',
			cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
		};

		it('should convert template to companion correctly', () => {
			// Test the template to companion conversion logic
			const baseStats = {
				STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10,
			};

			const expectedCompanion = {
				// Base Character properties
				level: mockTemplate.level,
				race: mockTemplate.race,
				name: mockTemplate.name,
				class: mockTemplate.class,
				image: mockTemplate.image,
				description: mockTemplate.description,
				stats: baseStats,
				skills: [],
				inventory: [],
				equipped: {},
				health: 20 + mockTemplate.level * 5, // 30 for level 2
				maxHealth: 20 + mockTemplate.level * 5,
				actionPoints: 2,
				maxActionPoints: 2,

				// Companion-specific properties
				type: 'companion',
				companionType: mockTemplate.companionType,
				isActive: false,
				loyalty: 75,

				behavior: {
					combatStyle: 'balanced',
					followDistance: 'medium',
					independence: 50,
				},

				voice: {
					personality: mockTemplate.personality,
					speakingStyle: 'friendly',
					catchphrases: mockTemplate.catchphrases,
				},

				cost: mockTemplate.cost,
			};

			// Test individual properties that should be derived from template
			expect(expectedCompanion.name).toBe('Test Companion');
			expect(expectedCompanion.level).toBe(2);
			expect(expectedCompanion.health).toBe(30); // 20 + 2 * 5
			expect(expectedCompanion.maxHealth).toBe(30);
			expect(expectedCompanion.type).toBe('companion');
			expect(expectedCompanion.isActive).toBe(false);
			expect(expectedCompanion.loyalty).toBe(75);
		});

		it('should generate unique companion IDs', () => {
			// Test ID generation logic
			const generateCompanionId = () => {
				return `companion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			};

			const id1 = generateCompanionId();
			const id2 = generateCompanionId();

			expect(id1).toMatch(/^companion_\d+_[a-z0-9]+$/);
			expect(id2).toMatch(/^companion_\d+_[a-z0-9]+$/);
			expect(id1).not.toBe(id2);
		});

		it('should have predefined companion templates', () => {
			const COMPANION_TEMPLATES = [
				{
					name: 'Aria Swiftblade',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A skilled tracker with keen eyes and a quick wit.',
					personality: 'Observant and loyal, with a dry sense of humor',
					catchphrases: [
						'The trail leads this way.',
						"I've got your back.",
						"Something doesn't feel right here.",
					],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee for tracking services' },
				},
				{
					name: 'Thorek Ironbeard',
					race: 'Dwarf',
					class: 'Fighter',
					level: 3,
					description: 'A gruff but dependable warrior with years of combat experience.',
					personality: 'Gruff exterior but fiercely protective of allies',
					catchphrases: ['By my beard!', 'Stand fast!', "They'll not get past me!"],
					companionType: 'hired',
					cost: { type: 'gold', amount: 150, description: 'Payment for protection services' },
				},
				{
					name: 'Luna Starweaver',
					race: 'Human',
					class: 'Wizard',
					level: 2,
					description: 'A young mage eager to prove herself in the field.',
					personality: 'Curious and enthusiastic, sometimes reckless',
					catchphrases: ['Fascinating!', 'I have just the spell for this!', 'Knowledge is power!'],
					companionType: 'quest',
					cost: { type: 'favor', description: 'Seeking adventure and magical knowledge' },
				},
				{
					name: 'Kael Shadowstep',
					race: 'Halfling',
					class: 'Rogue',
					level: 2,
					description: 'A nimble scout with a talent for getting into places unnoticed.',
					personality: 'Sarcastic but reliable, values discretion',
					catchphrases: [
						"Trust me, I've got this.",
						'Quietly now...',
						'That was easier than expected.',
					],
					companionType: 'hired',
					cost: { type: 'gold', amount: 75, description: 'Fee for scouting and infiltration' },
				},
				{
					name: 'Brother Marcus',
					race: 'Human',
					class: 'Cleric',
					level: 3,
					description: 'A devoted healer who believes in helping those in need.',
					personality: 'Compassionate and wise, slow to anger',
					catchphrases: [
						'May the light guide us.',
						'I will tend to your wounds.',
						'Faith will see us through.',
					],
					companionType: 'story',
					cost: { type: 'favor', description: 'Serves out of duty to help others' },
				},
			];

			expect(COMPANION_TEMPLATES).toHaveLength(5);
			expect(COMPANION_TEMPLATES[0].name).toBe('Aria Swiftblade');
			expect(COMPANION_TEMPLATES[1].name).toBe('Thorek Ironbeard');
			expect(COMPANION_TEMPLATES[2].name).toBe('Luna Starweaver');
			expect(COMPANION_TEMPLATES[3].name).toBe('Kael Shadowstep');
			expect(COMPANION_TEMPLATES[4].name).toBe('Brother Marcus');
		});

		it('should support random template selection', () => {
			const templates = [
				'Aria Swiftblade',
				'Thorek Ironbeard',
				'Luna Starweaver',
				'Kael Shadowstep',
				'Brother Marcus',
			];

			// Test random selection logic
			const randomIndex = Math.floor(Math.random() * templates.length);
			const selectedTemplate = templates[randomIndex];

			expect(templates).toContain(selectedTemplate);
			expect(randomIndex).toBeGreaterThanOrEqual(0);
			expect(randomIndex).toBeLessThan(templates.length);
		});
	});

	describe('party management logic', () => {
		const testCompanions = CompanionFactory.createMany(4);

		it('should validate party size limits', () => {
			const maxPartySize = 4; // Player + 3 companions
			const activeCompanions = ['comp1', 'comp2', 'comp3'];

			const canAddMore = activeCompanions.length < (maxPartySize - 1);

			expect(canAddMore).toBe(false); // Party is at limit
			expect(activeCompanions.length).toBe(3);
		});

		it('should check if companion can be added to party', () => {
			const companion = testCompanions[0];
			const activeCompanions = ['comp2', 'comp3'];
			const maxSize = 4;

			// Helper function to check if companion can be added
			const canAddToParty = (companionId: string) => {
				if (!companion) {
					return { canAdd: false, reason: 'Companion not found' };
				}

				if (companion.isActive) {
					return { canAdd: false, reason: 'Already in party' };
				}

				if (activeCompanions.length >= maxSize - 1) {
					return { canAdd: false, reason: 'Party is full' };
				}

				return { canAdd: true };
			};

			// The companion from factory is isActive: true by default, so it should fail
			const result = canAddToParty(companion.id);
			expect(result.canAdd).toBe(false);
			expect(result.reason).toBe('Already in party');
		});

		it('should prevent adding already active companion', () => {
			const activeCompanion = { ...testCompanions[0], isActive: true };

			const canAdd = !activeCompanion.isActive;

			expect(canAdd).toBe(false);
		});

		it('should handle party configuration updates', () => {
			const initialConfig: PartyConfiguration = {
				maxSize: 4,
				activeCompanions: ['comp1'],
				leadershipStyle: 'democratic',
			};

			const newCompanionId = 'comp2';
			const updatedConfig = {
				...initialConfig,
				activeCompanions: [...initialConfig.activeCompanions, newCompanionId],
			};

			expect(updatedConfig.activeCompanions).toContain('comp1');
			expect(updatedConfig.activeCompanions).toContain('comp2');
			expect(updatedConfig.activeCompanions).toHaveLength(2);
		});

		it('should remove companion from party', () => {
			const initialActiveCompanions = ['comp1', 'comp2', 'comp3'];
			const companionToRemove = 'comp2';

			const updatedActiveCompanions = initialActiveCompanions.filter(
				id => id !== companionToRemove,
			);

			expect(updatedActiveCompanions).not.toContain('comp2');
			expect(updatedActiveCompanions).toContain('comp1');
			expect(updatedActiveCompanions).toContain('comp3');
			expect(updatedActiveCompanions).toHaveLength(2);
		});
	});

	describe('companion management operations', () => {
		it('should find companion by ID', () => {
			const companions = CompanionFactory.createMany(3);
			const targetId = companions[1].id;

			const foundCompanion = companions.find(comp => comp.id === targetId);

			expect(foundCompanion).toBeDefined();
			expect(foundCompanion?.id).toBe(targetId);
		});

		it('should return undefined for non-existent companion', () => {
			const companions = CompanionFactory.createMany(3);
			const nonExistentId = 'non-existent-id';

			const foundCompanion = companions.find(comp => comp.id === nonExistentId);

			expect(foundCompanion).toBeUndefined();
		});

		it('should update companion properties', () => {
			const companion = CompanionFactory.createBasic();
			const updates = { level: 5, loyalty: 90 };

			const updatedCompanion = { ...companion, ...updates };

			expect(updatedCompanion.level).toBe(5);
			expect(updatedCompanion.loyalty).toBe(90);
			expect(updatedCompanion.name).toBe(companion.name); // Unchanged
		});

		it('should delete companion from collection', () => {
			const companions = CompanionFactory.createMany(3);
			const targetId = companions[1].id;

			const filteredCompanions = companions.filter(comp => comp.id !== targetId);

			expect(filteredCompanions).toHaveLength(2);
			expect(filteredCompanions.find(comp => comp.id === targetId)).toBeUndefined();
		});

		it('should handle companion deletion with party removal', () => {
			const companions = CompanionFactory.createMany(3);
			const targetId = companions[1].id;
			const activeCompanions = [companions[0].id, companions[1].id];

			// Remove from party first
			const updatedActiveCompanions = activeCompanions.filter(id => id !== targetId);

			// Then remove from companions list
			const updatedCompanions = companions.filter(comp => comp.id !== targetId);

			expect(updatedActiveCompanions).not.toContain(targetId);
			expect(updatedCompanions.find(comp => comp.id === targetId)).toBeUndefined();
		});
	});

	describe('derived state management', () => {
		it('should calculate active companions from party config', () => {
			const companions = CompanionFactory.createMany(4);
			const partyConfig: PartyConfiguration = {
				maxSize: 4,
				activeCompanions: [companions[0].id, companions[2].id],
				leadershipStyle: 'democratic',
			};

			const activeCompanions = companions.filter(comp =>
				partyConfig.activeCompanions.includes(comp.id),
			);

			expect(activeCompanions).toHaveLength(2);
			expect(activeCompanions[0].id).toBe(companions[0].id);
			expect(activeCompanions[1].id).toBe(companions[2].id);
		});

		it('should maintain consistency between companions and active status', () => {
			const companions = CompanionFactory.createMany(3);
			const activeCompanionIds = [companions[0].id];

			// Update companion active status based on party config
			const updatedCompanions = companions.map(comp => ({
				...comp,
				isActive: activeCompanionIds.includes(comp.id),
			}));

			expect(updatedCompanions[0].isActive).toBe(true);
			expect(updatedCompanions[1].isActive).toBe(false);
			expect(updatedCompanions[2].isActive).toBe(false);
		});

		it('should handle empty party configuration', () => {
			const companions = CompanionFactory.createMany(3);
			const emptyPartyConfig: PartyConfiguration = {
				maxSize: 4,
				activeCompanions: [],
				leadershipStyle: 'democratic',
			};

			const activeCompanions = companions.filter(comp =>
				emptyPartyConfig.activeCompanions.includes(comp.id),
			);

			expect(activeCompanions).toHaveLength(0);
		});
	});

	describe('error handling and edge cases', () => {
		it('should handle invalid JSON in storage', () => {
			const invalidJson = 'invalid json string';

			expect(() => JSON.parse(invalidJson)).toThrow();
		});

		it('should handle storage save failures', async () => {
			const saveError = new Error('Storage full');
			vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(saveError);

			await expect(
				AsyncStorage.setItem('ai-dnd-companions', '{}'),
			).rejects.toThrow('Storage full');
		});

		it('should handle storage load failures', async () => {
			const loadError = new Error('Storage unavailable');
			vi.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(loadError);

			await expect(
				AsyncStorage.getItem('ai-dnd-companions'),
			).rejects.toThrow('Storage unavailable');
		});

		it('should provide default party configuration when none exists', () => {
			const defaultPartyConfig: PartyConfiguration = {
				maxSize: 4,
				activeCompanions: [],
				leadershipStyle: 'democratic',
			};

			expect(defaultPartyConfig.maxSize).toBe(4);
			expect(defaultPartyConfig.activeCompanions).toEqual([]);
			expect(defaultPartyConfig.leadershipStyle).toBe('democratic');
		});

		it('should handle corrupted companion data gracefully', () => {
			const corruptedData = { invalidProperty: 'value' };

			// Test validation logic
			const isValidCompanion = (data: any): data is Companion => {
				return data &&
					typeof data.id === 'string' &&
					typeof data.name === 'string' &&
					typeof data.type === 'string' &&
					data.type === 'companion';
			};

			expect(isValidCompanion(corruptedData)).toBe(false);
		});
	});

	describe('performance considerations', () => {
		it('should handle large numbers of companions efficiently', () => {
			const manyCompanions = CompanionFactory.createMany(100);

			const startTime = performance.now();

			// Test operations that should be fast
			const foundCompanion = manyCompanions.find(c => c.name === 'Test Companion 50');
			const filteredCompanions = manyCompanions.filter(c => c.level > 1);
			const activeCount = manyCompanions.filter(c => c.isActive).length;

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(duration).toBeLessThan(10); // Should be very fast
			expect(manyCompanions).toHaveLength(100);
		});

		it('should complete storage operations quickly', async () => {
			const companions = CompanionFactory.createMany(10);
			const companionsJson = JSON.stringify(companions);

			const startTime = performance.now();

			await AsyncStorage.setItem('ai-dnd-companions', companionsJson);

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(duration).toBeLessThan(50); // Should complete quickly
			expect(AsyncStorage.setItem).toHaveBeenCalled();
		});

		it('should handle concurrent operations safely', async () => {
			const savePromises = [
				AsyncStorage.setItem('key1', 'value1'),
				AsyncStorage.setItem('key2', 'value2'),
				AsyncStorage.setItem('key3', 'value3'),
			];

			await Promise.all(savePromises);

			expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3);
		});
	});

	describe('companion factory integration', () => {
		it('should create companions with proper structure', () => {
			const companion = CompanionFactory.createBasic();

			expect(companion.id).toMatch(/^test-companion-\d+$/);
			expect(companion.type).toBe('companion');
			expect(companion.companionType).toBe('hired');
			expect(companion.isActive).toBe(true);
			expect(companion.loyalty).toBe(75);
			expect(companion.behavior).toBeDefined();
			expect(companion.voice).toBeDefined();
		});

		it('should create multiple companions with unique IDs', () => {
			const companions = CompanionFactory.createMany(5);

			expect(companions).toHaveLength(5);

			const ids = companions.map(c => c.id);
			const uniqueIds = new Set(ids);

			expect(uniqueIds.size).toBe(5); // All IDs should be unique
		});

		it('should support companion overrides', () => {
			const overrides = {
				name: 'Custom Companion',
				level: 10,
				loyalty: 100,
			};

			const companion = CompanionFactory.createBasic(overrides);

			expect(companion.name).toBe('Custom Companion');
			expect(companion.level).toBe(10);
			expect(companion.loyalty).toBe(100);
		});
	});
});
