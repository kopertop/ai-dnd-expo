import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import type { Companion, CompanionTemplate, PartyConfiguration } from '@/types/companion';

// Mock console methods to avoid noise in tests
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

	describe('initialization', () => {
		it('should initialize with default values', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			expect(result.current.companions).toEqual([]);
			expect(result.current.activeCompanions).toEqual([]);
			expect(result.current.partyConfig).toEqual({
				maxSize: 4,
				activeCompanions: [],
				leadershipStyle: 'democratic',
			});
			expect(result.current.error).toBeNull();
		});

		it('should load data from storage on initialization', async () => {
			const mockCompanions: Companion[] = [
				{
					id: 'test-companion-1',
					name: 'Test Companion',
					type: 'companion',
					companionType: 'hired',
					isActive: true,
					loyalty: 75,
					level: 2,
					race: 'Human',
					class: 'Fighter',
					stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
					skills: [],
					inventory: [],
					equipped: {},
					health: 30,
					maxHealth: 30,
					actionPoints: 2,
					maxActionPoints: 2,
					behavior: {
						combatStyle: 'balanced',
						followDistance: 'medium',
						independence: 50,
					},
					voice: {
						personality: 'Friendly',
						speakingStyle: 'friendly',
						catchphrases: ['Hello!'],
					},
					recruitedAt: 123456789,
				},
			];

			const mockPartyConfig: PartyConfiguration = {
				maxSize: 4,
				activeCompanions: ['test-companion-1'],
				leadershipStyle: 'democratic',
			};

			vi.spyOn(AsyncStorage, 'getItem').mockImplementation((key: string) => {
				if (key === 'ai-dnd-companions') {
					return Promise.resolve(JSON.stringify(mockCompanions));
				}
				if (key === 'ai-dnd-party-config') {
					return Promise.resolve(JSON.stringify(mockPartyConfig));
				}
				return Promise.resolve(null);
			});

			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			expect(result.current.companions).toEqual(mockCompanions);
			expect(result.current.activeCompanions).toEqual(mockCompanions);
			expect(result.current.partyConfig).toEqual(mockPartyConfig);
		});

		it('should handle storage errors gracefully', async () => {
			vi.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			expect(result.current.error).toBe('Failed to load companion data');
		});
	});

	describe('companion management', () => {
		it('should create a companion from template', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			const template: CompanionTemplate = {
				name: 'New Companion',
				race: 'Elf',
				class: 'Ranger',
				level: 2,
				description: 'A test companion',
				personality: 'Friendly',
				catchphrases: ['Hello!'],
				companionType: 'hired',
				cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
			};

			let companion: Companion;
			await act(async () => {
				companion = await result.current.createCompanion(template);
			});

			expect(result.current.companions.length).toBe(1);
			expect(result.current.companions[0].name).toBe('New Companion');
			expect(result.current.companions[0].race).toBe('Elf');
			expect(result.current.companions[0].class).toBe('Ranger');
			expect(result.current.companions[0].level).toBe(2);
			expect(result.current.companions[0].type).toBe('companion');
			expect(result.current.companions[0].companionType).toBe('hired');
			expect(result.current.companions[0].isActive).toBe(false);
			expect(result.current.companions[0].loyalty).toBe(75);
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-companions',
				expect.any(String),
			);
		});

		it('should add companion to party', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion first
			let companion!: Companion;
			await act(async () => {
				companion = await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
			});

			// Add to party
			let success!: boolean;
			await act(async () => {
				success = await result.current.addToParty(companion.id);
			});

			expect(success).toBe(true);
			expect(result.current.activeCompanions.length).toBe(1);
			expect(result.current.activeCompanions[0].id).toBe(companion.id);
			expect(result.current.partyConfig.activeCompanions).toContain(companion.id);
			expect(result.current.companions[0].isActive).toBe(true);
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-party-config',
				expect.any(String),
			);
		});

		it('should remove companion from party', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion and add to party
			let companion!: Companion;
			await act(async () => {
				companion = await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
				await result.current.addToParty(companion.id);
			});

			// Remove from party
			let success!: boolean;
			await act(async () => {
				success = await result.current.removeFromParty(companion.id);
			});

			expect(success).toBe(true);
			expect(result.current.activeCompanions.length).toBe(0);
			expect(result.current.partyConfig.activeCompanions).not.toContain(companion.id);
			expect(result.current.companions[0].isActive).toBe(false);
		});

		it('should update companion properties', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion first
			let companion!: Companion;
			await act(async () => {
				companion = await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
			});

			// Update companion
			let success!: boolean;
			await act(async () => {
				success = await result.current.updateCompanion(companion.id, {
					level: 5,
					loyalty: 90,
				});
			});

			expect(success).toBe(true);
			expect(result.current.companions[0].level).toBe(5);
			expect(result.current.companions[0].loyalty).toBe(90);
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-companions',
				expect.any(String),
			);
		});

		it('should delete companion', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion first
			let companion!: Companion;
			await act(async () => {
				companion = await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
			});

			// Delete companion
			let success!: boolean;
			await act(async () => {
				success = await result.current.deleteCompanion(companion.id);
			});

			expect(success).toBe(true);
			expect(result.current.companions.length).toBe(0);
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-companions',
				expect.any(String),
			);
		});

		it('should generate a random companion', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			let companion!: Companion;
			await act(async () => {
				companion = await result.current.generateRandomCompanion();
			});

			expect(companion).toBeDefined();
			expect(result.current.companions.length).toBe(1);
			expect(companion.type).toBe('companion');
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-companions',
				expect.any(String),
			);
		});
	});

	describe('party management', () => {
		it('should enforce party size limits', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create 4 companions (max party size is 4 including player, so 3 companions max)
			const companions: Companion[] = [];
			await act(async () => {
				for (let i = 0; i < 4; i++) {
					companions.push(
						await result.current.createCompanion({
							name: `Companion ${i + 1}`,
							race: 'Human',
							class: 'Fighter',
							level: 1,
							description: 'Test companion',
							personality: 'Friendly',
							catchphrases: ['Hello!'],
							companionType: 'hired',
							cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
						}),
					);
				}
			});

			// Add 3 companions to party (should succeed)
			await act(async () => {
				for (let i = 0; i < 3; i++) {
					await result.current.addToParty(companions[i].id);
				}
			});

			expect(result.current.activeCompanions.length).toBe(3);

			// Try to add 4th companion (should fail)
			let success!: boolean;
			await act(async () => {
				success = await result.current.addToParty(companions[3].id);
			});

			expect(success).toBe(false);
			expect(result.current.activeCompanions.length).toBe(3);
			expect(result.current.error).toBe('Party is full');
		});

		it('should check if companion can be added to party', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion
			let companion!: Companion;
			await act(async () => {
				companion = await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
			});

			// Check if can add (should be true)
			let canAdd = result.current.canAddToParty(companion.id);
			expect(canAdd.canAdd).toBe(true);

			// Add to party
			await act(async () => {
				await result.current.addToParty(companion.id);
			});

			// Check if can add again (should be false)
			canAdd = result.current.canAddToParty(companion.id);
			expect(canAdd.canAdd).toBe(false);
			expect(canAdd.reason).toBe('Already in party');

			// Check with non-existent ID
			canAdd = result.current.canAddToParty('non-existent-id');
			expect(canAdd.canAdd).toBe(false);
			expect(canAdd.reason).toBe('Companion not found');
		});
	});

	describe('storage operations', () => {
		it('should save companion data to storage', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion
			await act(async () => {
				await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
			});

			// Verify storage was called
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'ai-dnd-companions',
				expect.any(String),
			);
		});

		it('should load companion data from storage', async () => {
			const mockCompanions: Companion[] = [
				{
					id: 'test-companion-1',
					name: 'Test Companion',
					type: 'companion',
					companionType: 'hired',
					isActive: true,
					loyalty: 75,
					level: 2,
					race: 'Human',
					class: 'Fighter',
					stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
					skills: [],
					inventory: [],
					equipped: {},
					health: 30,
					maxHealth: 30,
					actionPoints: 2,
					maxActionPoints: 2,
					behavior: {
						combatStyle: 'balanced',
						followDistance: 'medium',
						independence: 50,
					},
					voice: {
						personality: 'Friendly',
						speakingStyle: 'friendly',
						catchphrases: ['Hello!'],
					},
					recruitedAt: 123456789,
				},
			];

			vi.spyOn(AsyncStorage, 'getItem').mockImplementation((key: string) => {
				if (key === 'ai-dnd-companions') {
					return Promise.resolve(JSON.stringify(mockCompanions));
				}
				return Promise.resolve(null);
			});

			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Manually trigger load
			await act(async () => {
				await result.current.loadAll();
			});

			expect(result.current.companions).toEqual(mockCompanions);
		});

		it('should handle storage errors gracefully', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Mock storage error
			vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage error'));

			// Create a companion (should trigger save)
			await act(async () => {
				await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});
			});

			expect(result.current.error).toBe('Failed to save companion data');
		});
	});

	describe('utility functions', () => {
		it('should get companion by ID', async () => {
			const { result } = renderHook(() => useSimpleCompanions());

			// Wait for the initial load to complete
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			// Create a companion
			let companion: Companion;
			await act(async () => {
				companion = await result.current.createCompanion({
					name: 'New Companion',
					race: 'Elf',
					class: 'Ranger',
					level: 2,
					description: 'A test companion',
					personality: 'Friendly',
					catchphrases: ['Hello!'],
					companionType: 'hired',
					cost: { type: 'gold', amount: 100, description: 'Hiring fee' },
				});

				expect(companion).toBeDefined();

				// Get companion by ID
				const foundCompanion = result.current.getCompanion(companion.id);
				expect(foundCompanion).toBeDefined();
				expect(foundCompanion?.id).toBe(companion.id);
				expect(foundCompanion?.name).toBe('New Companion');

				// Try to get non-existent companion
				const notFound = result.current.getCompanion('non-existent-id');
				expect(notFound).toBeUndefined();
			});
		});
	});
});