import { z } from 'zod';

/**
 * Zod schemas for validating AI-generated event content
 */

// Option schema (A, B, or C)
const OptionSchema = z.object({
  optionKey: z.enum(['A', 'B', 'C']),
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().min(1), // Can be a string or array, but we'll store as string
  tradeoff: z.string().min(1),
});

// Decision schema (exactly 3 decisions per quest)
const DecisionSchema = z.object({
  decisionNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1),
  context: z.string().min(1),
  options: z.array(OptionSchema).length(3), // Exactly 3 options (A, B, C)
});

// Quest schema
const QuestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive().default(30),
  teamSize: z.literal(3), // Fixed to 3 for now
  decisions: z.array(DecisionSchema).length(3), // Exactly 3 decisions
});

// Region schema
const RegionSchema = z.object({
  name: z.string().min(1), // slug-like identifier
  displayName: z.string().min(1),
  description: z.string().optional(),
  quests: z.array(QuestSchema).min(1), // At least 1 quest per region
});

// Root schema for AI generation output
export const EventGenerationOutputSchema = z.object({
  regions: z.array(RegionSchema).min(1), // At least 1 region
});

export type EventGenerationOutput = z.infer<typeof EventGenerationOutputSchema>;
export type RegionData = z.infer<typeof RegionSchema>;
export type QuestData = z.infer<typeof QuestSchema>;
export type DecisionData = z.infer<typeof DecisionSchema>;
export type OptionData = z.infer<typeof OptionSchema>;
