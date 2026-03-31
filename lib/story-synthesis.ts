import type { StoryState } from '@/lib/story-runtime';
import OpenAI from 'openai';

function titleCaseBand(band: string): string {
  return band.replace(/_/g, ' ');
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export function buildDeterministicFinalSynthesis(state: StoryState, playerIds: string[]): string {
  const teamAverage = Number(state.scoreboard.teamAverage ?? 0);
  const teamBand = titleCaseBand(String(state.scoreboard.teamBand ?? 'mixed'));
  const totalBeats = state.totalBeats ?? 3;
  const beatCount = (['1', '2', '3'] as const)
    .filter((k) => Number(k) <= totalBeats)
    .filter((k) => state.beats[k]?.resolved).length;
  const playerSummary = playerIds
    .map((playerId) => {
      const total = Number(state.scoreboard.playerTotals?.[playerId] ?? 0);
      return `${playerId} scored ${total}/60`;
    })
    .join(', ');

  return `The team completed ${beatCount} beats with a ${teamBand} ending and a team score of ${teamAverage}/60. ${playerSummary}.`;
}

export function buildDeterministicBeatConsequence(input: {
  beat: number;
  submissions: Array<{ name: string; text: string }>;
  rolls?: Array<{ name: string; value: number; band: string }>;
  averageRoll: number;
}): { mode: string; text: string } {
  const { beat, submissions, rolls, averageRoll } = input;
  const opener = `Beat ${beat} resolves with the team acting in sync.`;
  const highlights = submissions
    .slice(0, 3)
    .map((s) => `${s.name}: "${s.text}"`)
    .join('; ');
  const rollLine =
    rolls && rolls.length > 0
      ? ` Rolls: ${rolls.map((r) => `${r.name} ${r.value} (${titleCaseBand(r.band)})`).join('; ')}.`
      : '';
  if (averageRoll >= 15) {
    return {
      mode: 'high_momentum',
      text: `${opener} Their combined momentum pays off (${averageRoll.toFixed(1)} team average d20). ${highlights}.${rollLine} The moment lands with clear advantage.`,
    };
  }
  if (averageRoll >= 10) {
    return {
      mode: 'mixed_result',
      text: `${opener} The move works with tradeoffs (${averageRoll.toFixed(1)} team average). ${highlights}.${rollLine} Progress is real, but tension rises.`,
    };
  }
  return {
    mode: 'hard_choice',
    text: `${opener} The dice demand a hard landing (${averageRoll.toFixed(1)} team average). ${highlights}.${rollLine} The team must adapt quickly.`,
  };
}

export async function generateBeatConsequenceWithFallback(input: {
  beat: number;
  beatTitle: string;
  beatScene: string;
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
  const actionLines = input.submissions.map((s) => `${s.name}: ${s.text}`).join(' | ');
  const rollLines = input.rolls
    .map((r) => `${r.name}: d20=${r.value} (${titleCaseBand(r.band)})`)
    .join(' | ');

  try {
    const prompt = [
      `You are narrating one beat in a collaborative tabletop-style story.`,
      `Beat title: ${input.beatTitle}`,
      `Scene / stakes: ${input.beatScene || '(not specified)'}`,
      `Possible narrative paths (informational; players did not "vote", they wrote free actions):\n${pathLines || '(none)'}`,
      `What each player did: ${actionLines}`,
      `Dice: ${rollLines}. Team average roll: ${input.averageRoll.toFixed(1)}.`,
      `Write ONE short paragraph (70–130 words) that:`,
      `- References the scene and each player's action concretely.`,
      `- Explains how the combined rolls shape the outcome (use average as guide).`,
      `- Optionally alludes to how their actions relate to paths A/B/C without forcing a "winner" path.`,
      `Plain text only, present tense or immediate past, no bullet points.`,
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.65,
      max_tokens: 280,
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
  players: Array<{ id: string; name: string }>
): Promise<{ text: string; mode: string }> {
  const fallback = buildDeterministicFinalSynthesis(state, players.map((p) => p.id));
  if (!openai) {
    return { text: fallback, mode: 'deterministic_fallback' };
  }
  try {
    const teamAverage = Number(state.scoreboard.teamAverage ?? 0);
    const teamBand = titleCaseBand(String(state.scoreboard.teamBand ?? 'mixed'));
    const totalBeats = state.totalBeats ?? 3;
    const beatSummaries = (['1', '2', '3'] as const)
      .filter((key) => Number(key) <= totalBeats)
      .map((key) => {
      const beat = state.beats[key];
      const actions = players
        .map((player) => `${player.name}: ${beat.submissions[player.id] || 'no action recorded'}`)
        .join(' | ');
      return `Beat ${key}: ${actions}. Consequence: ${beat.consequence?.text || 'none'}`;
      });
    const prompt = [
      `Create a concise final narrative synthesis for a collaborative story room.`,
      `Team average: ${teamAverage}/60. Team band: ${teamBand}.`,
      ...beatSummaries,
      `Requirements: positive framing for every player, one paragraph, 80-140 words, plain text.`,
    ].join('\n');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 220,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return { text: fallback, mode: 'deterministic_fallback' };
    return { text, mode: 'ai' };
  } catch {
    return { text: fallback, mode: 'deterministic_fallback' };
  }
}
