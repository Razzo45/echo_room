import OpenAI from 'openai';
import type { ScenarioSlots } from '@/lib/ai/scenarioSlots';
import { voiceCardFromSlots } from '@/lib/ai/scenarioSlots';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Optional polish pass for the HTML artifact body (gpt-4o-mini).
 * Returns polished plain-text closing block; caller embeds into HTML.
 */
export async function polishArtifactNarrative(input: {
  questName: string;
  questDescription: string;
  slots?: ScenarioSlots | null;
  synthesisText: string;
  highlightActions: Array<{ name: string; action: string }>;
}): Promise<string | null> {
  if (!openai) return null;
  const voice = voiceCardFromSlots(input.slots);
  const style = input.slots?.outputStyle?.trim() || 'professional facilitator souvenir brief';
  const ending = input.slots?.endingFeel?.trim() || 'earned, specific closure';

  const highlights = input.highlightActions
    .map((h) => `- ${h.name}: "${h.action}"`)
    .join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You polish a collaborative-story souvenir for event participants. Keep facts; raise craft. No markdown fences.',
        },
        {
          role: 'user',
          content: [
            `Quest: "${input.questName}"`,
            input.questDescription ? `Setup: ${input.questDescription}` : '',
            voice ? `Voice card:\n${voice}` : '',
            `Desired output style: ${style}`,
            `Desired ending feel: ${ending}`,
            ``,
            `Draft synthesis:\n${input.synthesisText}`,
            highlights ? `Player highlights:\n${highlights}` : '',
            ``,
            `Rewrite as 120–200 words plain text for the artifact closing:`,
            `- Match the output style.`,
            `- Name concrete stakes and at least one vivid action per player when provided.`,
            `- No generic workshop clichés ("key takeaway", "strong position", "navigate challenges").`,
            `- No fantasy/RPG language unless the scenario is explicitly fantasy.`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      temperature: 0.55,
      max_tokens: 400,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 60 ? text : null;
  } catch (e) {
    console.error('polishArtifactNarrative failed:', e);
    return null;
  }
}
