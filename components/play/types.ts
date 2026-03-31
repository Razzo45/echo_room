import type { StoryState, BeatKey } from '@/lib/story-runtime';

export type DecisionOption = {
  label: string;
  tradeoffs?: string;
  risks?: string[];
  outcomes?: string[];
};

export type QuestDecisionData = {
  number: number;
  title: string;
  description: string;
  options: Record<string, DecisionOption>;
};

export type DecisionsPayload = { decisions: QuestDecisionData[] };

export type Player = { id: string; name: string; completedAt?: string | null };

export type BeatState = StoryState['beats'][BeatKey];
