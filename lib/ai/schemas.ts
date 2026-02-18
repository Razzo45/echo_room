import { z } from 'zod';

/**
 * Zod schemas for validating AI-generated event content
 */

// Option schema (A, B, or C). description/impact/tradeoff allow "" so truncated JSON can still validate.
const OptionSchema = z.object({
  optionKey: z.enum(['A', 'B', 'C']),
  title: z.string().min(1),
  description: z.string().default(''),
  impact: z.string().default(''),
  tradeoff: z.string().default(''),
});

// Decision schema (1–3 decisions per quest). context allows "" so truncated JSON can validate.
const DecisionSchema = z.object({
  decisionNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1),
  context: z.string().default(''),
  options: z.array(OptionSchema).min(1).max(3), // 1–3 options (A, B, C); truncated may have fewer
});

// Quest schema (1–3 decisions). description required for full content; truncated may have partial.
const QuestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive().default(30),
  teamSize: z.number().int().positive().default(3),
  decisions: z.array(DecisionSchema).min(1).max(3),
});

// Region schema – 1–2 quests per region (truncation may give fewer)
const RegionSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  quests: z.array(QuestSchema).min(1).max(2),
});

// Root schema – 1–3 regions (truncation may give fewer)
export const EventGenerationOutputSchema = z.object({
  regions: z.array(RegionSchema).min(1).max(3),
});

export type EventGenerationOutput = z.infer<typeof EventGenerationOutputSchema>;
export type RegionData = z.infer<typeof RegionSchema>;
export type QuestData = z.infer<typeof QuestSchema>;
export type DecisionData = z.infer<typeof DecisionSchema>;
export type OptionData = z.infer<typeof OptionSchema>;
