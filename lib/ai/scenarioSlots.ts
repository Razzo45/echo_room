/**
 * Structured scenario slots for organiser → generation → live narrative voice.
 */

export type ScenarioSlots = {
  eventType: string;
  audienceType: string;
  toneMood: string;
  playfulnessLevel: string;
  endingFeel: string;
  outputStyle: string;
  gameplayFeel: string;
  themesMotifs: string;
  constraints: string;
  brandContext: string;
  forbiddenDirections: string;
  customNotes: string;
};

export const EMPTY_SCENARIO_SLOTS: ScenarioSlots = {
  eventType: '',
  audienceType: '',
  toneMood: '',
  playfulnessLevel: '',
  endingFeel: '',
  outputStyle: '',
  gameplayFeel: '',
  themesMotifs: '',
  constraints: '',
  brandContext: '',
  forbiddenDirections: '',
  customNotes: '',
};

const SLOT_LABELS: Record<keyof ScenarioSlots, string> = {
  eventType: 'Event type',
  audienceType: 'Audience type',
  toneMood: 'Tone / mood',
  playfulnessLevel: 'Playfulness level',
  endingFeel: 'Desired ending feel',
  outputStyle: 'Output / artifact style',
  gameplayFeel: 'Gameplay feel',
  themesMotifs: 'Themes / motifs',
  constraints: 'Constraints',
  brandContext: 'Brand context',
  forbiddenDirections: 'Forbidden tones / directions',
  customNotes: 'Custom notes',
};

export function normalizeScenarioSlots(raw: unknown): ScenarioSlots {
  const base = { ...EMPTY_SCENARIO_SLOTS };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof ScenarioSlots)[]) {
    const v = obj[key];
    if (typeof v === 'string') base[key] = v.trim();
  }
  return base;
}

/** Only filled slots — never emit "Not specified" noise. */
export function buildScenarioBriefFromSlots(slots: ScenarioSlots): string {
  const lines = (Object.keys(SLOT_LABELS) as (keyof ScenarioSlots)[])
    .filter((k) => slots[k].trim())
    .map((k) => `- ${SLOT_LABELS[k]}: ${slots[k].trim()}`);

  const parts = [
    'Scenario generation intent (filled slots only):',
    ...(lines.length ? lines : ['- (no structured slots; use event name/description and freeform brief)']),
    '',
    'Generate a 5-beat collaborative storytelling scenario suitable for live multiplayer play.',
    'Players write free-text actions and resolve with dice; A/B/C paths are short inspiration only.',
  ];
  return parts.join('\n');
}

/** Compact voice card for runtime consequence / synthesis / artifact. */
export function voiceCardFromSlots(slots: ScenarioSlots | null | undefined): string {
  if (!slots) return '';
  const bits: string[] = [];
  if (slots.toneMood) bits.push(`Tone: ${slots.toneMood}`);
  if (slots.playfulnessLevel) bits.push(`Playfulness: ${slots.playfulnessLevel}`);
  if (slots.endingFeel) bits.push(`Ending feel: ${slots.endingFeel}`);
  if (slots.outputStyle) bits.push(`Output style: ${slots.outputStyle}`);
  if (slots.gameplayFeel) bits.push(`Gameplay feel: ${slots.gameplayFeel}`);
  if (slots.themesMotifs) bits.push(`Motifs: ${slots.themesMotifs}`);
  if (slots.forbiddenDirections) bits.push(`Avoid: ${slots.forbiddenDirections}`);
  if (slots.brandContext) bits.push(`Brand: ${slots.brandContext}`);
  return bits.join('\n');
}

export function hasAnyScenarioSlot(slots: ScenarioSlots | null | undefined): boolean {
  if (!slots) return false;
  return Object.values(slots).some((v) => v.trim().length > 0);
}
