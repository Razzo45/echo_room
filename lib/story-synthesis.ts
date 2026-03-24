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
  const beatCount = (['1', '2', '3'] as const).filter((k) => state.beats[k]?.resolved).length;
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
  averageRoll: number;
}): { mode: string; text: string } {
  const { beat, submissions, averageRoll } = input;
  const opener = `Beat ${beat} resolves with the team acting in sync.`;
  const highlights = submissions
    .slice(0, 3)
    .map((s) => `${s.name} chose to ${s.text}`)
    .join('; ');
  if (averageRoll >= 15) {
    return {
      mode: 'high_momentum',
      text: `${opener} Their combined momentum pays off (${averageRoll.toFixed(1)} avg roll): ${highlights}. The path opens with clear advantage.`,
    };
  }
  if (averageRoll >= 10) {
    return {
      mode: 'mixed_result',
      text: `${opener} The move works with tradeoffs (${averageRoll.toFixed(1)} avg roll): ${highlights}. Progress is real, but tension rises.`,
    };
  }
  return {
    mode: 'hard_choice',
    text: `${opener} The move succeeds only partially (${averageRoll.toFixed(1)} avg roll): ${highlights}. The team must adapt quickly to new pressure.`,
  };
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
    const beatSummaries = (['1', '2', '3'] as const).map((key) => {
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
