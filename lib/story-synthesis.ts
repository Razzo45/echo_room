import type { StoryState } from '@/lib/story-runtime';
import { ALL_BEAT_KEYS } from '@/lib/story-runtime';
import type { BeatKey } from '@/lib/story-runtime';
import type { ScenarioSlots } from '@/lib/ai/scenarioSlots';
import { voiceCardFromSlots } from '@/lib/ai/scenarioSlots';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const BANNED_CLOSING =
  'Do not use stock closers like "strong position", "key takeaway", "the team must adapt", "navigate challenges", "leverage", or "moving forward".';

function tonePreamble(
  scenarioName: string,
  scenarioDescription: string,
  slots?: ScenarioSlots | null
): string {
  const voice = voiceCardFromSlots(slots);
  return [
    `You narrate outcomes for a live collaborative scenario exercise.`,
    `Scenario: "${scenarioName}" — ${scenarioDescription || '(no additional context)'}`,
    voice ? `Voice card:\n${voice}` : '',
    `Match tone to the topic. Prefer concrete nouns, named pressures, and operational detail over abstract facilitation speak.`,
    `Never default to fantasy/RPG language ("heroes", "quest", "adventure", "dice gods", "dungeon master") unless the scenario is explicitly fantasy.`,
    BANNED_CLOSING,
  ]
    .filter(Boolean)
    .join('\n');
}

function rollImpactPhrase(value: number, action: string): string {
  const clip = action.trim().replace(/\.$/, '');
  if (value >= 19) return `${clip} — cut through cleanly and shifted the field`;
  if (value >= 15) return `${clip} — mostly worked, with a useful opening created`;
  if (value >= 10) return `${clip} — only half-landed; something important stayed unresolved`;
  if (value >= 4) return `${clip} — stalled against resistance`;
  return `${clip} — backfired and raised the cost of the next move`;
}

export function buildDeterministicBeatConsequence(input: {
  beat: number;
  beatScene?: string;
  submissions: Array<{ name: string; text: string }>;
  rolls?: Array<{ name: string; value: number; band: string }>;
  averageRoll: number;
}): { mode: string; text: string } {
  const { submissions, rolls, averageRoll, beatScene } = input;

  const playerLines = submissions.map((sub) => {
    const roll = rolls?.find((r) => r.name === sub.name);
    const action = sub.text?.trim() || 'held the line with the team';
    if (!roll) return `${sub.name}: ${action}.`;
    return `${sub.name}: ${rollImpactPhrase(roll.value, action)}.`;
  });

  const sceneHint = beatScene?.trim()
    ? beatScene.trim().split(/(?<=[.!?])\s+/)[0]
    : '';

  let closing: string;
  if (averageRoll >= 15) {
    closing = sceneHint
      ? `The pressure around "${sceneHint.slice(0, 90)}" eases just enough to act again.`
      : 'A narrow window opens — the next beat will decide if it holds.';
  } else if (averageRoll >= 10) {
    closing = sceneHint
      ? `Progress exists, but the friction in "${sceneHint.slice(0, 90)}" is still live.`
      : 'Gains are real, and so is the unfinished problem waiting ahead.';
  } else {
    closing = sceneHint
      ? `The setback hardens the stakes of "${sceneHint.slice(0, 90)}".`
      : 'The setback raises the price of the next decision.';
  }

  const mode = averageRoll >= 15 ? 'high_momentum' : averageRoll >= 10 ? 'mixed_result' : 'hard_choice';

  return {
    mode,
    text: `${playerLines.join(' ')} ${closing}`,
  };
}

function beatKeysForState(state: StoryState): BeatKey[] {
  const total = state.totalBeats ?? 5;
  return ALL_BEAT_KEYS.filter((k) => Number(k) <= total);
}

export function buildDeterministicFinalSynthesis(
  state: StoryState,
  players: Array<{ id: string; name: string }>,
  scenarioName?: string
): string {
  const beatKeys = beatKeysForState(state);
  const resolvedBeats = beatKeys.filter((k) => state.beats[k]?.resolved);
  const scenario = scenarioName ? `"${scenarioName}"` : 'the scenario';

  const beatNarratives = resolvedBeats.map((k) => {
    const beat = state.beats[k];
    const consequence = beat.consequence?.text || 'The team moved forward.';
    return `Beat ${k}: ${consequence}`;
  });

  const playerHighlights = players.map((p) => {
    const bestBeat = beatKeys
      .map((k) => ({
        beat: k,
        value: state.beats[k].rolls[p.id]?.value ?? 0,
        action: state.beats[k].submissions[p.id] || '',
      }))
      .reduce(
        (a, b) => (b.value > a.value ? b : a),
        { beat: '1' as BeatKey, value: 0, action: '' }
      );
    const actionClip =
      bestBeat.action.length > 60 ? bestBeat.action.slice(0, 57) + '...' : bestBeat.action;
    if (bestBeat.value >= 15) {
      return `${p.name} landed hardest with "${actionClip}" (beat ${bestBeat.beat}).`;
    }
    if (bestBeat.value >= 10) {
      return `${p.name} kept pressure on with "${actionClip}" (beat ${bestBeat.beat}).`;
    }
    return `${p.name} stayed in it through tougher outcomes, including "${actionClip || 'supporting the team'}".`;
  });

  return `Through ${resolvedBeats.length} beats of ${scenario}, the team left a traceable chain of moves. ${beatNarratives.slice(-2).join(' ')} ${playerHighlights.join(' ')}`;
}

export async function generateBeatConsequenceWithFallback(input: {
  beat: number;
  beatTitle: string;
  beatScene: string;
  scenarioName: string;
  scenarioDescription: string;
  slots?: ScenarioSlots | null;
  priorConsequence?: string | null;
  paths: Array<{ key: string; label: string; summary: string; impact?: string }>;
  submissions: Array<{ name: string; text: string }>;
  rolls: Array<{ name: string; value: number; band: string }>;
  averageRoll: number;
}): Promise<{ text: string; mode: string }> {
  const fallback = buildDeterministicBeatConsequence({
    beat: input.beat,
    beatScene: input.beatScene,
    submissions: input.submissions,
    rolls: input.rolls,
    averageRoll: input.averageRoll,
  });

  if (!openai) {
    return { text: fallback.text, mode: 'deterministic_fallback' };
  }

  const pathLines = input.paths
    .map((p) => {
      const stakes = [p.summary, p.impact].filter(Boolean).join(' | ');
      return `Path ${p.key}: ${p.label}${stakes ? ` — ${stakes}` : ''}`;
    })
    .join('\n');

  try {
    const system = tonePreamble(input.scenarioName, input.scenarioDescription, input.slots);
    const user = [
      `Beat ${input.beat}: "${input.beatTitle}"`,
      `Scene: ${input.beatScene || '(not specified)'}`,
      input.priorConsequence
        ? `Immediate prior outcome (carry forward):\n${input.priorConsequence}`
        : '',
      pathLines
        ? `Reference path stakes (inspiration only — players wrote free actions):\n${pathLines}`
        : '',
      ``,
      `Player actions and rolls:`,
      ...input.rolls.map((r) => {
        const sub = input.submissions.find((s) => s.name === r.name);
        return `- ${r.name}: "${sub?.text || '(none)'}". Roll ${r.value}/20 (${r.band}).`;
      }),
      `Team average: ${input.averageRoll.toFixed(1)}/20.`,
      ``,
      `Write ONE paragraph (70–110 words):`,
      `- One sentence per player: their action + how the roll shaped a concrete outcome in THIS scenario.`,
      `- Weave in the nearest path stake only if it fits their action.`,
      `- One closing sentence that sets up the next pressure (not a generic workshop line).`,
      `- Do not quote roll numbers. Plain text only.`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.65,
      max_tokens: 260,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return { text: fallback.text, mode: 'deterministic_fallback' };
    }
    return { text, mode: 'ai' };
  } catch {
    return { text: fallback.text, mode: 'deterministic_fallback' };
  }
}

export async function generateFinalSynthesisWithFallback(
  state: StoryState,
  players: Array<{ id: string; name: string }>,
  scenarioContext?: {
    name: string;
    description: string;
    slots?: ScenarioSlots | null;
  }
): Promise<{ text: string; mode: string }> {
  const fallback = buildDeterministicFinalSynthesis(state, players, scenarioContext?.name);
  if (!openai) {
    return { text: fallback, mode: 'deterministic_fallback' };
  }
  try {
    const beatKeys = beatKeysForState(state);
    const beatSummaries = beatKeys
      .filter((key) => state.beats[key]?.resolved)
      .map((key) => {
        const beat = state.beats[key];
        const actions = players
          .map((player) => {
            const action = beat.submissions[player.id] || 'no action recorded';
            const roll = beat.rolls[player.id]?.value ?? 0;
            return `${player.name}: "${action}" (roll ${roll})`;
          })
          .join('; ');
        return `Beat ${key}: ${actions}. Outcome: ${beat.consequence?.text || 'none'}`;
      });

    const ending = scenarioContext?.slots?.endingFeel?.trim();
    const outputStyle = scenarioContext?.slots?.outputStyle?.trim();

    const system = tonePreamble(
      scenarioContext?.name || 'Collaborative Scenario',
      scenarioContext?.description || '',
      scenarioContext?.slots
    );
    const user = [
      ...beatSummaries,
      ``,
      ending ? `Desired ending feel: ${ending}` : '',
      outputStyle ? `Write in this output style: ${outputStyle}` : '',
      ``,
      `Write the closing summary (130–180 words, one or two paragraphs):`,
      `- Open with the specific challenge and how the team actually approached it.`,
      `- Middle: one concrete sentence per player (best or most defining action + consequence).`,
      `- Close with whether the core tension was resolved, twisted, or left open — matching the ending feel if given.`,
      `- Specific to the scenario subject. ${BANNED_CLOSING}`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
      max_tokens: 360,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return { text: fallback, mode: 'deterministic_fallback' };
    return { text, mode: 'ai' };
  } catch {
    return { text: fallback, mode: 'deterministic_fallback' };
  }
}
