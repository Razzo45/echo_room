import type { StoryState } from '@/lib/story-runtime';
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

export function buildDeterministicFinalSynthesis(
  state: StoryState,
  players: Array<{ id: string; name: string }>,
  scenarioName?: string
): string {
  const teamAverage = Number(state.scoreboard.teamAverage ?? 0);
  const totalBeats = state.totalBeats ?? 3;
  const beatKeys = (['1', '2', '3'] as const).filter((k) => Number(k) <= totalBeats);
  const beatCount = beatKeys.filter((k) => state.beats[k]?.resolved).length;

  const playerLines = players.map((p) => {
    const total = Number(state.scoreboard.playerTotals?.[p.id] ?? 0);
    const bestBeat = beatKeys
      .map((k) => ({ beat: k, value: state.beats[k].rolls[p.id]?.value ?? 0, action: state.beats[k].submissions[p.id] || '' }))
      .reduce((a, b) => (b.value > a.value ? b : a), { beat: '1' as const, value: 0, action: '' });
    const actionClip = bestBeat.action.length > 60 ? bestBeat.action.slice(0, 57) + '...' : bestBeat.action;
    if (total >= 45) return `${p.name} was highly effective throughout, with a standout contribution of "${actionClip}" (roll ${bestBeat.value}) in beat ${bestBeat.beat}. Total score: ${total}/60.`;
    if (total >= 30) return `${p.name} contributed consistently, most notably with "${actionClip}" (roll ${bestBeat.value}). Total score: ${total}/60.`;
    if (total >= 15) return `${p.name} faced difficult outcomes but stayed engaged, scoring ${total}/60 across ${beatCount} beats.`;
    return `${p.name} encountered significant resistance (${total}/60) but their participation kept the group moving.`;
  });

  const scenario = scenarioName ? `"${scenarioName}"` : 'the scenario';
  let teamLine: string;
  if (teamAverage >= 45) teamLine = `The team tackled ${scenario} across ${beatCount} beats with strong overall execution (team average ${teamAverage}/60).`;
  else if (teamAverage >= 30) teamLine = `Across ${beatCount} beats of ${scenario}, the team achieved a solid result (team average ${teamAverage}/60) despite some setbacks.`;
  else if (teamAverage >= 15) teamLine = `The team worked through ${beatCount} beats of ${scenario} with mixed results (team average ${teamAverage}/60), requiring adaptation at multiple points.`;
  else teamLine = `${scenario} proved highly challenging across ${beatCount} beats (team average ${teamAverage}/60), with the team needing to regroup repeatedly.`;

  return `${teamLine} ${playerLines.join(' ')}`;
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
    const teamAverage = Number(state.scoreboard.teamAverage ?? 0);
    const totalBeats = state.totalBeats ?? 3;
    const beatSummaries = (['1', '2', '3'] as const)
      .filter((key) => Number(key) <= totalBeats)
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
    const playerScores = players.map((p) => {
      const total = Number(state.scoreboard.playerTotals?.[p.id] ?? 0);
      return `${p.name}: ${total}/60`;
    }).join(', ');

    const scenarioLine = scenarioContext
      ? `Scenario: "${scenarioContext.name}" — ${scenarioContext.description}`
      : 'Scenario context not available.';

    const prompt = [
      tonePreamble(scenarioContext?.name || 'Collaborative Scenario', scenarioContext?.description || ''),
      ``,
      scenarioLine,
      `Team average: ${teamAverage}/60. Player scores: ${playerScores}.`,
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
