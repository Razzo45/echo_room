import type { StoryState } from '@/lib/story-runtime';
import OpenAI from 'openai';

function titleCaseBand(band: string): string {
  return band.replace(/_/g, ' ');
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export function buildDeterministicFinalSynthesis(state: StoryState, players: Array<{ id: string; name: string }>): string {
  const teamAverage = Number(state.scoreboard.teamAverage ?? 0);
  const totalBeats = state.totalBeats ?? 3;
  const beatCount = (['1', '2', '3'] as const)
    .filter((k) => Number(k) <= totalBeats)
    .filter((k) => state.beats[k]?.resolved).length;

  const playerLines = players.map((p) => {
    const total = Number(state.scoreboard.playerTotals?.[p.id] ?? 0);
    const best = (['1', '2', '3'] as const)
      .filter((k) => Number(k) <= totalBeats)
      .map((k) => state.beats[k].rolls[p.id]?.value ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);
    if (total >= 45) return `${p.name} was the driving force across every beat, ending with ${total} points and a peak roll of ${best}.`;
    if (total >= 30) return `${p.name} contributed solidly throughout, earning ${total} points with a best roll of ${best}.`;
    if (total >= 15) return `${p.name} faced tough dice but stayed in the fight, finishing with ${total} points.`;
    return `${p.name} weathered difficult rolls (${total} points) — their persistence kept the group grounded.`;
  });

  let teamSentence: string;
  if (teamAverage >= 45) {
    teamSentence = `Over ${beatCount} beats the team rolled with extraordinary fortune, closing out the story with commanding authority.`;
  } else if (teamAverage >= 30) {
    teamSentence = `Across ${beatCount} beats the team built steady momentum, navigating complications and earning a strong finish.`;
  } else if (teamAverage >= 15) {
    teamSentence = `The ${beatCount} beats tested the team at every turn. They adapted, improvised, and emerged changed by the experience.`;
  } else {
    teamSentence = `The dice were unforgiving across all ${beatCount} beats — but the team never stopped pushing forward, and that resilience is the real story.`;
  }

  return `${teamSentence} ${playerLines.join(' ')}`;
}

export function buildDeterministicBeatConsequence(input: {
  beat: number;
  submissions: Array<{ name: string; text: string }>;
  rolls?: Array<{ name: string; value: number; band: string }>;
  averageRoll: number;
}): { mode: string; text: string } {
  const { beat, submissions, rolls, averageRoll } = input;

  const playerNarratives = submissions.map((sub) => {
    const roll = rolls?.find((r) => r.name === sub.name);
    if (!roll) return `${sub.name} attempts to ${sub.text.toLowerCase().replace(/^i /, '')}.`;

    const v = roll.value;
    const name = sub.name;
    const action = sub.text;

    if (v >= 19) {
      return `${name} chooses to ${action.toLowerCase().replace(/^i /, '')} — and the d20 lands on ${v}. The execution is flawless; the outcome exceeds anything the team could have hoped for.`;
    }
    if (v >= 15) {
      return `${name} moves to ${action.toLowerCase().replace(/^i /, '')} and rolls a strong ${v}. The plan works cleanly, creating momentum the rest of the team can build on.`;
    }
    if (v >= 10) {
      return `${name} goes for ${action.toLowerCase().replace(/^i /, '')} — a ${v} on the die. It works, but not without a cost; a complication emerges that the team will have to factor into what comes next.`;
    }
    if (v >= 4) {
      return `${name} tries to ${action.toLowerCase().replace(/^i /, '')} but the dice aren't kind — a ${v}. The intent is there, but the result falls short, forcing the group to compensate.`;
    }
    return `${name} reaches for ${action.toLowerCase().replace(/^i /, '')} and rolls a devastating ${v}. The attempt backfires — things get harder from here, and the team must regroup quickly.`;
  });

  const joined = playerNarratives.join(' ');

  let closing: string;
  if (averageRoll >= 15) {
    closing = 'The team emerges from this beat with real advantage — the dice rewarded bold action.';
  } else if (averageRoll >= 10) {
    closing = 'Progress is real, but the path ahead carries new weight. Every choice has left its mark.';
  } else {
    closing = 'The dice demanded a price. The team presses forward, shaped by what just happened.';
  }

  const mode = averageRoll >= 15 ? 'high_momentum' : averageRoll >= 10 ? 'mixed_result' : 'hard_choice';

  return {
    mode,
    text: `${joined} ${closing}`,
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
      `You are the Dungeon Master narrating one beat of a collaborative tabletop-style story.`,
      ``,
      `Beat title: ${input.beatTitle}`,
      `Scene / stakes: ${input.beatScene || '(not specified)'}`,
      `Possible narrative paths (for context only — players wrote free-form actions, not votes):\n${pathLines || '(none)'}`,
      ``,
      `Player actions and dice rolls:`,
      ...input.rolls.map((r) => {
        const sub = input.submissions.find((s) => s.name === r.name);
        return `- ${r.name} chose: "${sub?.text || '(none)'}". Rolled d20 = ${r.value} (${titleCaseBand(r.band)}).`;
      }),
      `Team average: ${input.averageRoll.toFixed(1)}.`,
      ``,
      `Write ONE vivid paragraph (80–140 words) narrating this beat like a D&D session recap:`,
      `- Describe each player's action attempt and HOW their individual die roll affected the outcome.`,
      `  A high roller should feel heroic; a low roller should feel the sting of bad luck even if their idea was good.`,
      `- The tone should feel like a skilled DM telling a story, not a sports announcer reading stats.`,
      `- Do not repeat the die values or band labels literally — weave the luck into the narrative.`,
      `- End with a sentence about what this means for the team going forward.`,
      `Plain text only, present tense or immediate past, no bullet points or headers.`,
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
  const fallback = buildDeterministicFinalSynthesis(state, players);
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
    const playerScores = players.map((p) => {
      const total = Number(state.scoreboard.playerTotals?.[p.id] ?? 0);
      return `${p.name}: ${total}/60`;
    }).join(', ');
    const prompt = [
      `You are the Dungeon Master delivering the closing narration for a collaborative tabletop story.`,
      ``,
      `Team average: ${teamAverage}/60. Ending tone: ${teamBand}. Player scores: ${playerScores}.`,
      ...beatSummaries,
      ``,
      `Write the final wrap-up (100–160 words, one or two paragraphs, plain text):`,
      `- Narrate what the team accomplished together across the beats — tell a story, don't list stats.`,
      `- Give each player a personal moment: reference their best or most dramatic action/roll.`,
      `- High scorers should feel heroic; low scorers should be honoured for persistence or a clutch moment.`,
      `- End on a note that feels like the closing scene of a great session — satisfying, memorable, forward-looking.`,
      `- Tone: warm, cinematic, like an excellent DM wrapping the session. Not corporate, not a report card.`,
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
