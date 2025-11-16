import { z } from 'zod';

export const MapTokenTypeSchema = z.enum(['player', 'npc', 'object']);

export const MapTokenSchema = z.object({
        id: z.string(),
        type: MapTokenTypeSchema,
        entityId: z.string().optional(),
        label: z.string(),
        x: z.number().nonnegative(),
        y: z.number().nonnegative(),
        zIndex: z.number().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
});

export const TerrainCellSchema = z.object({
        terrain: z.string().default('stone'),
        fogged: z.boolean().optional(),
        elevation: z.number().optional(),
        difficult: z.boolean().optional(),
});

export const MapGridSchema = z.array(z.array(TerrainCellSchema));

export const MapStateSchema = z.object({
        id: z.string(),
        name: z.string(),
        width: z.number().positive(),
        height: z.number().positive(),
        terrain: MapGridSchema.optional(),
        fog: z.array(z.array(z.boolean())).optional(),
        background: z.string().optional(),
        tokens: z.array(MapTokenSchema).default([]),
        updatedAt: z.number(),
});

export const NpcAlignmentSchema = z.enum(['hostile', 'friendly', 'vendor']);

export const NpcDefinitionSchema = z.object({
        id: z.string(),
        name: z.string(),
        alignment: NpcAlignmentSchema,
        description: z.string().optional(),
        maxHealth: z.number().positive(),
        armorClass: z.number().optional(),
        attack: z.string().optional(),
        stats: z.record(z.unknown()).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
});

export const NpcStateSchema = NpcDefinitionSchema.extend({
        currentHealth: z.number().nonnegative(),
        statusEffects: z.array(z.string()).default([]),
        tokenId: z.string().optional(),
});

export const ActivityLogEntrySchema = z.object({
        id: z.string(),
        type: z.enum(['log', 'dice', 'system']),
        message: z.string(),
        timestamp: z.number(),
        actor: z.string().optional(),
        details: z.record(z.unknown()).optional(),
});

export type MapToken = z.infer<typeof MapTokenSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type NpcDefinition = z.infer<typeof NpcDefinitionSchema>;
export type NpcState = z.infer<typeof NpcStateSchema>;
export type ActivityLogEntry = z.infer<typeof ActivityLogEntrySchema>;
