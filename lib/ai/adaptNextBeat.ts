import OpenAI from 'openai';
import type { ScenarioSlots } from '@/lib/ai/scenarioSlots';
import { voiceCardFromSlots } from '@/lib/ai/scenarioSlots';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Rewrite the *next* beat's live scene after a consequence resolves (gpt-4o-mini).
 * Fail-open: returns null so static authored beat text remains.
 */
export async function adaptNextBeatScene(input: {
  scenarioName: string;
  scenarioDescription: string;
  slots?: ScenarioSlots | null;
  completedBeat: number;
  completedBeatTitle: string;
  consequenceText: string;
  submissions: Array<{ name: string; text: string }>;
  averageRoll: number;
  nextBeatNumber: number;
  nextBeatTitle: string;
  nextBeatScene: string;
}): Promise<{ title?: string; context: string } | null> {
  if (!openai) return null;

  const voice = voiceCardFromSlots(input.slots);
  const actionLines = input.submissions
    .map((s) => `- ${s.name}: "${s.text}"`)
    .join('\n');

  const prompt = [
    `You adapt the next story beat for a live collaborative scenario so it reacts to what just happened.`,
    `Scenario: "${input.scenarioName}" — ${input.scenarioDescription || '(no description)'}`,
    voice ? `Voice:\n${voice}` : '',
    ``,
    `Just resolved — Beat ${input.completedBeat}: "${input.completedBeatTitle}"`,
    `Consequence: ${input.consequenceText}`,
    `Player actions:\n${actionLines || '(none)'}`,
    `Team pressure (avg roll /20): ${input.averageRoll.toFixed(1)}`,
    ``,
    `Next beat draft (Beat ${input.nextBeatNumber}: "${input.nextBeatTitle}"):`,
    input.nextBeatScene || '(empty)',
    ``,
    `Rewrite the NEXT beat scene only (2–4 sentences, 40–80 words):`,
    `- Keep the authored dramatic question, but update the situation from the consequence.`,
    `- Address the team in second person ("You…").`,
    `- Include one concrete detail from what just happened (a person, system, risk, or outcome).`,
    `- Do not resolve Beat ${input.nextBeatNumber}; leave tension open for player actions.`,
    `- No fantasy/RPG filler. No roll numbers. Plain text only.`,
    `Optional: if a sharper title helps, start with TITLE: … then a blank line, then the scene.`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a live narrative adapter for a workshop story game. Be specific, reactive, and concise.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.65,
      max_tokens: 220,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return null;

    const titleMatch = text.match(/^TITLE:\s*(.+)$/im);
    if (titleMatch) {
      const withoutTitle = text.replace(/^TITLE:\s*.+$/im, '').trim();
      if (withoutTitle.length >= 40) {
        return { title: titleMatch[1].trim().slice(0, 80), context: withoutTitle };
      }
    }
    if (text.length < 40) return null;
    return { context: text };
  } catch (e) {
    console.error('adaptNextBeatScene failed:', e);
    return null;
  }
}
