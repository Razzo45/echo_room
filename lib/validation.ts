import { z } from 'zod';

export const eventCodeSchema = z.object({
  code: z.string().min(1, 'Event code is required').toUpperCase(),
});

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  organisation: z.string().min(2, 'Organisation must be at least 2 characters').max(100),
  role: z.string().min(2, 'Role must be at least 2 characters').max(100),
  country: z.string().min(2, 'Country must be at least 2 characters').max(100),
  skill: z.string().min(2, 'Skill must be at least 2 characters').max(100),
  curiosity: z.string().min(2, 'Curiosity must be at least 2 characters').max(200),
});

export const joinRoomSchema = z.object({
  questId: z.string().min(1, 'Quest ID is required'),
});

export const voteSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  decisionNumber: z.number().int().min(1).max(3),
  optionKey: z.enum(['A', 'B', 'C']),
  justification: z.string().min(1, 'Justification is required').max(160, 'Justification must be 160 characters or less'),
});

export const commitSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  decisionNumber: z.number().int().min(1).max(3),
  optionKey: z.enum(['A', 'B', 'C']),
});

export const adminLoginSchema = z.object({
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
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminMoveUserInput = z.infer<typeof adminMoveUserSchema>;
