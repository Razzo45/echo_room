import type { StoryState } from '@/lib/story-runtime';
import { ALL_BEAT_KEYS } from '@/lib/story-runtime';
import type { BeatKey } from '@/lib/story-runtime';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ── Shared tone preamble ───────────────────────────────────────────────────

function tonePreamble(scenarioName: string, scenarioDescription: string): string {
  return [
    `You are a professional facilitator summarising a collaborative scenario exercise.`,
    `The scenario is: "${scenarioName}" — ${scenarioDescription || '(no additional context)'}`,
    `Match your tone to this topic. If it is a policy or business exercise, write analytically.`,
    `If it is a creative scenario, you may be more narrative — but never default to fantasy/RPG language.`,
    `Do not use words like "heroes", "quest", "adventure", "dice gods", or "dungeon master".`,
  ].join('\n');
}

// ── Deterministic beat consequence ─────────────────────────────────────────

function rollImpactPhrase(value: number): string {
  if (value >= 19) return 'landed with exceptional effectiveness';
  if (value >= 15) return 'executed well and advanced the position';
  if (value >= 10) return 'had partial effect with complications';
  if (value >= 4) return 'fell short of the intended outcome';
  return 'backfired, creating new obstacles';
}

export function buildDeterministicBeatConsequence(input: {
  beat: number;
  submissions: Array<{ name: string; text: string }>;
  rolls?: Array<{ name: string; value: number; band: string }>;
  averageRoll: number;
}): { mode: string; text: string } {
  const { submissions, rolls, averageRoll } = input;

  const playerLines = submissions.map((sub) => {
    const roll = rolls?.find((r) => r.name === sub.name);
    if (!roll) return `${sub.name} proposed: ${sub.text}.`;
    return `${sub.name} pursued "${sub.text}" (roll ${roll.value}/20) — this ${rollImpactPhrase(roll.value)}.`;
  });

  let closing: string;
  if (averageRoll >= 15) {
    closing = 'The team is in a strong position heading into the next phase.';
  } else if (averageRoll >= 10) {
    closing = 'Progress was made, but unresolved complications will carry forward.';
  } else {
    closing = 'Significant challenges remain; the team will need to adjust their approach.';
  }

  const mode = averageRoll >= 15 ? 'high_momentum' : averageRoll >= 10 ? 'mixed_result' : 'hard_choice';

  return {
    mode,
    text: `${playerLines.join(' ')} ${closing}`,
  };
}

// ── Deterministic final synthesis ──────────────────────────────────────────

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
    return `In beat ${k}, ${consequence.charAt(0).toLowerCase()}${consequence.slice(1)}`;
  });

  const playerHighlights = players.map((p) => {
    const bestBeat = beatKeys
      .map((k) => ({ beat: k, value: state.beats[k].rolls[p.id]?.value ?? 0, action: state.beats[k].submissions[p.id] || '' }))
      .reduce((a, b) => (b.value > a.value ? b : a), { beat: '1' as BeatKey, value: 0, action: '' });
    const actionClip = bestBeat.action.length > 50 ? bestBeat.action.slice(0, 47) + '...' : bestBeat.action;
    if (bestBeat.value >= 15) return `${p.name} made a strong impact with "${actionClip}" in beat ${bestBeat.beat}.`;
    if (bestBeat.value >= 10) return `${p.name} contributed with "${actionClip}" in beat ${bestBeat.beat}, with mixed results.`;
    return `${p.name} faced challenging outcomes but stayed engaged throughout.`;
  });

  return `The team worked through ${resolvedBeats.length} beats of ${scenario}. ${beatNarratives.join(' ')} ${playerHighlights.join(' ')}`;
}

// ── AI beat consequence ────────────────────────────────────────────────────

export async function generateBeatConsequenceWithFallback(input: {
  beat: number;
  beatTitle: string;
  beatScene: string;
  scenarioName: string;
  scenarioDescription: string;
  paths: Array<{ key: string; label: string; summary: string }>;
  submissions: Array<{ name: string; text: string }>;
  rolls: Array<{ name: string; value: number; band: string }>;
  averageRoll: number;
}): Promise<{ text: string; mode: string }> {
  const fallback = buildDeterministicBeatConsequence({
    beat: input.beat,
    submissions: input.submissions,
    rolls: input.rolls,
    averageRoll: input.averageRoll,
  });

  if (!openai) {
    return { text: fallback.text, mode: 'deterministic_fallback' };
  }

  const pathLines = input.paths
    .map((p) => `Path ${p.key}: ${p.label} — ${p.summary}`)
    .join('\n');

  try {
    const prompt = [
      tonePreamble(input.scenarioName, input.scenarioDescription),
      ``,
      `Beat ${input.beat}: "${input.beatTitle}"`,
      `Context: ${input.beatScene || '(not specified)'}`,
      pathLines ? `Reference paths:\n${pathLines}` : '',
      ``,
      `Player actions and outcomes:`,
      ...input.rolls.map((r) => {
        const sub = input.submissions.find((s) => s.name === r.name);
        return `- ${r.name}: "${sub?.text || '(none)'}". Roll: ${r.value}/20.`;
      }),
      `Team average roll: ${input.averageRoll.toFixed(1)}/20.`,
      ``,
      `Write ONE concise paragraph (60–100 words):`,
      `- One sentence per player: what they did and how the roll shaped the outcome (concrete, specific to the scenario topic).`,
      `- One closing sentence on the team's position going forward.`,
      `- Be specific to the scenario subject matter. No generic filler.`,
      `- Do not repeat roll numbers literally — describe the impact instead.`,
      `Plain text only, no bullet points or headers.`,
    ].filter(Boolean).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 200,
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

// ── AI final synthesis ─────────────────────────────────────────────────────

export async function generateFinalSynthesisWithFallback(
  state: StoryState,
  players: Array<{ id: string; name: string }>,
  scenarioContext?: { name: string; description: string }
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

    const scenarioLine = scenarioContext
      ? `Scenario: "${scenarioContext.name}" — ${scenarioContext.description}`
      : 'Scenario context not available.';

    const prompt = [
      tonePreamble(scenarioContext?.name || 'Collaborative Scenario', scenarioContext?.description || ''),
      ``,
      scenarioLine,
      ...beatSummaries,
      ``,
      `Write the closing summary (120–180 words, one or two paragraphs, plain text):`,
      `- Opening: one sentence stating the scenario challenge and the team's overall approach.`,
      `- Middle: for each player, one sentence about their most impactful action and how outcomes shaped the result. Be concrete and specific to the scenario topic.`,
      `- Closing: one sentence on whether the team's approach addressed the core challenge and what the key takeaway is.`,
      `- Write as a professional facilitator summarising a workshop outcome. Factual, specific, no filler.`,
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      max_tokens: 300,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return { text: fallback, mode: 'deterministic_fallback' };
    return { text, mode: 'ai' };
  } catch {
    return { text: fallback, mode: 'deterministic_fallback' };
  }
}
