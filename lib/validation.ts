import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitize';

export const eventCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Event code is required')
    .transform((v) => sanitizeText(v).toUpperCase()),
  rememberMe: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .transform((v) => sanitizeText(v)),
  organisation: z
    .string()
    .min(2, 'Organisation must be at least 2 characters')
    .max(100)
    .transform((v) => sanitizeText(v)),
  role: z
    .string()
    .min(2, 'Role must be at least 2 characters')
    .max(100)
    .transform((v) => sanitizeText(v)),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(100)
    .transform((v) => sanitizeText(v)),
  skill: z
    .string()
    .min(2, 'Skill must be at least 2 characters')
    .max(100)
    .transform((v) => sanitizeText(v)),
  curiosity: z
    .string()
    .min(2, 'Curiosity must be at least 2 characters')
    .max(200)
    .transform((v) => sanitizeText(v)),
  headline: z
    .string()
    .max(120)
    .transform((v) => sanitizeText(v))
    .optional()
    .nullable(),
  linkedinUrl: z
    .string()
    .max(500)
    .optional()
    .refine((v) => !v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()), 'Please enter a valid URL'),
  isDiscoverable: z.boolean().optional(),
});

export const joinRoomSchema = z.object({
  questId: z.string().min(1, 'Quest ID is required'),
});

export const voteSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  decisionNumber: z.number().int().min(1).max(3),
  optionKey: z.enum(['A', 'B', 'C']),
  justification: z
    .string()
    .min(1, 'Justification is required')
    .max(160, 'Justification must be 160 characters or less')
    .transform((v) => sanitizeText(v)),
});

export const commitSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  decisionNumber: z.number().int().min(1).max(3),
  optionKey: z.enum(['A', 'B', 'C']),
});

export const runtimeReadyCheckSchema = z.object({
  ready: z.boolean().optional().default(true),
});

export const runtimeActionSchema = z.object({
  beat: z.number().int().min(1).max(3),
  actionText: z
    .string()
    .min(1, 'Action text is required')
    .max(600, 'Action text must be 600 characters or less')
    .transform((v) => sanitizeText(v)),
});

export const runtimeRollSchema = z.object({
  beat: z.number().int().min(1).max(3),
  value: z.number().int().min(1).max(20),
  band: z.enum(['critical_fail', 'fail', 'mixed', 'success', 'critical_success']),
});

export const runtimeConsequenceSchema = z.object({
  beat: z.number().int().min(1).max(3),
  text: z
    .string()
    .min(1, 'Consequence text is required')
    .max(5000, 'Consequence text must be 5000 characters or less')
    .transform((v) => sanitizeText(v)),
  mode: z
    .string()
    .min(1, 'Mode is required')
    .max(100, 'Mode must be 100 characters or less')
    .transform((v) => sanitizeText(v)),
  adminOverride: z.boolean().optional().default(false),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Valid email is required').optional(),
  password: z.string().min(1, 'Password is required'),
});

export const adminMoveUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  targetRoomId: z.string().min(1, 'Target room ID is required'),
});

export type EventCodeInput = z.infer<typeof eventCodeSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type CommitInput = z.infer<typeof commitSchema>;
export type RuntimeReadyCheckInput = z.infer<typeof runtimeReadyCheckSchema>;
export type RuntimeActionInput = z.infer<typeof runtimeActionSchema>;
export type RuntimeRollInput = z.infer<typeof runtimeRollSchema>;
export type RuntimeConsequenceInput = z.infer<typeof runtimeConsequenceSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminMoveUserInput = z.infer<typeof adminMoveUserSchema>;
