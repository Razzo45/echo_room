import OpenAI from 'openai';
import { z } from 'zod';
import { EventGenerationOutputSchema, type EventGenerationOutput } from './schemas';
import type { ScenarioSlots } from './scenarioSlots';
import { buildScenarioBriefFromSlots, hasAnyScenarioSlot, voiceCardFromSlots } from './scenarioSlots';

// Optional: use jsonrepair when parse fails. Load lazily to avoid breaking if the package has ESM/CJS issues.
async function tryJsonRepair(text: string): Promise<string> {
  try {
    const { jsonrepair } = await import('jsonrepair');
    return jsonrepair(text);
  } catch {
    return text;
  }
}

/**
 * Close truncated JSON by appending missing brackets in correct order (innermost first).
 * Uses a stack so we close } ] } ] ... in the right order for nested { } [ ].
 */
function closeTruncatedJson(str: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }
  const closers = stack.reverse().join('');
  return str + closers;
}

/**
 * AI Event Room Generator
 * Generates quests, decisions, and options from an event brief using OpenAI
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateEventRoomsInput {
  brief: string;
  eventName?: string;
  eventDescription?: string;
  slots?: ScenarioSlots | null;
  /** Outline then expand — higher quality, ~1.5–2× gen cost */
  twoPass?: boolean;
}

/** Remove hashtags and other characters that often cause the model to output invalid JSON */
function sanitizeForJsonSafePrompt(text: string): string {
  return (
    text
      .replace(/#\w+/g, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/  +/g, ' ')
      .trim()
  );
}

function preprocessJsonContent(content: string): string {
  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*\n?/i, '').replace(/\n?\s*```\s*$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }
  const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0].trim();
  }
  for (let i = 0; i < 5; i++) {
    const next = jsonContent.replace(/,(\s*[}\]])/g, '$1');
    if (next === jsonContent) break;
    jsonContent = next;
  }
  return jsonContent;
}

function buildIntentBlock(input: {
  brief: string;
  eventName?: string;
  eventDescription?: string;
  slots?: ScenarioSlots | null;
}): string {
  const safeBrief = sanitizeForJsonSafePrompt(input.brief);
  const safeEventDescription =
    input.eventDescription != null && input.eventDescription.trim() !== ''
      ? sanitizeForJsonSafePrompt(input.eventDescription)
      : undefined;
  const safeEventName = input.eventName?.trim() ?? undefined;
  const slots = input.slots;
  const filledBrief =
    slots && hasAnyScenarioSlot(slots)
      ? sanitizeForJsonSafePrompt(buildScenarioBriefFromSlots(slots))
      : safeBrief;
  const voice = slots ? voiceCardFromSlots(slots) : '';

  return [
    `Event Name: ${safeEventName || 'Unnamed Event'}`,
    `Event Description: ${safeEventDescription ?? 'No description provided'}`,
    voice ? `Voice card:\n${voice}` : '',
    ``,
    `AI Brief / intent:\n${filledBrief}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const CRAFT_RULES = `CRAFT (anti-generic)
- Each quest needs a DISTINCT dramatic question (different stake than sibling quests).
- Use concrete texture: named stakeholders, systems, constraints, clocks — not abstract "challenges".
- Beat 3 (Pivot) must invalidate an earlier assumption from Beat 1 or 2.
- Ban stock phrases: "navigate challenges", "leverage synergies", "critical decision", "key stakeholders", "moving forward".
- Never default to fantasy/RPG tropes ("heroes", "tavern", "dungeon") unless the event is explicitly fantasy.

LIVE PLAY REALITY
- Players write free-text actions + roll dice. A/B/C are SHORT inspiration chips only.
- Option fields: title (2–5 words) + description (one concrete sentence). Leave impact/tradeoff as "" (empty string).
- Cause-and-effect across beats. Quest description MUST start with "You are...".`;

const FULL_JSON_SHAPE = `JSON FORMAT (STRICT) — return ONLY valid JSON:
{
  "regions": [
    {
      "name": "slug-like-id",
      "displayName": "Human Readable Name",
      "description": "Brief region description.",
      "quests": [
        {
          "name": "Quest Name",
          "description": "You are a team of [identity] at [context]. [Situation]. [Stakes].",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Beat 1 Title",
              "context": "Setup scene (40-60 words).",
              "options": [
                { "optionKey": "A", "title": "Short title", "description": "One concrete sentence.", "impact": "", "tradeoff": "" },
                { "optionKey": "B", "title": "...", "description": "...", "impact": "", "tradeoff": "" },
                { "optionKey": "C", "title": "...", "description": "...", "impact": "", "tradeoff": "" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
Exactly 3 regions × 2 quests × 5 decisions × 3 options. Escape \\" . No markdown.`;

async function callGpt4oJson(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.75,
    max_tokens: maxTokens,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');
  return preprocessJsonContent(content);
}

/**
 * Fetch raw preprocessed JSON string from OpenAI.
 */
export async function fetchEventRoomsRaw(
  input: GenerateEventRoomsInput
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const intent = buildIntentBlock(input);

  try {
    if (input.twoPass) {
      const outlineSystem = `You outline collaborative storyline quests for an event. Reply is JSON only. Keep text tight.
${CRAFT_RULES}
Return:
{
  "regions": [
    {
      "name": "slug",
      "displayName": "Name",
      "description": "One sentence.",
      "quests": [
        { "name": "Quest name", "dramaticQuestion": "One sentence stake", "identityHook": "You are… one sentence" }
      ]
    }
  ]
}
Exactly 3 regions, 2 quests each. Each quest's dramaticQuestion must be unique.`;

      const outlineUser = `${intent}

Produce the outline JSON now.`;

      const outlineRaw = await callGpt4oJson(outlineSystem, outlineUser, 2000);

      const expandSystem = `CRITICAL: Reply limited to 8000 tokens. Valid JSON only.
You expand an approved outline into full 5-beat storyline quests for live multiplayer play.
${CRAFT_RULES}

Arc: Beat1 Setup → Beat2 Escalation → Beat3 Pivot → Beat4 Climax → Beat5 Resolution.
Each beat context builds on the previous. Options are short inspiration chips (title + one sentence; impact/tradeoff empty).

${FULL_JSON_SHAPE}`;

      const expandUser = `${intent}

Approved outline (expand faithfully; deepen texture; do not collapse quests into similar stakes):
${outlineRaw}

Return the full regions JSON now.`;

      return await callGpt4oJson(expandSystem, expandUser, 8000);
    }

    const systemPrompt = `CRITICAL: Your reply is strictly limited to 8000 tokens. Keep fields concise but substantive. Valid JSON only.

You design immersive, team-based narrative experiences. Each quest is a STORYLINE across 5 beats resolved live by written actions and dice.

STORYLINE
- Beat 1 Setup: identity + immediate challenge. Quest description starts with "You are..."
- Beat 2 Escalation: complication / new information
- Beat 3 Pivot: invalidate an earlier assumption
- Beat 4 Climax: highest stakes
- Beat 5 Resolution: closing challenge (not a lecture)

EVENT TONE
- Infer from name/description/brief. Corporate → grounded simulation. Tech → incident/product pressure. Gaming → more dramatic but not default fantasy. Social impact → human/policy texture.

${CRAFT_RULES}

${FULL_JSON_SHAPE}`;

    const userPrompt = `Generate immersive storyline quests for this event.

${intent}

INSTRUCTIONS:
- Infer event type and match tone.
- Exactly 3 regions × 2 quests × 5 beats × 3 short path chips (A/B/C).
- Each quest description starts with "You are..."
- Cause-and-effect between beats; unique dramatic question per quest.

Return ONLY valid JSON.`;

    return await callGpt4oJson(systemPrompt, userPrompt, 8000);
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; message?: string };
      if (apiError.status === 401) throw new Error('OpenAI API key is invalid or expired');
      if (apiError.status === 429) throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      if (apiError.status === 500 || apiError.status === 503) {
        throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
      }
      throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Generate event rooms (regions, quests, decisions) from an AI brief.
 * Uses fetchEventRoomsRaw + parse/repair/truncation recovery + Zod validation.
 */
export async function generateEventRooms(
  input: GenerateEventRoomsInput
): Promise<EventGenerationOutput> {
  const jsonContent = await fetchEventRoomsRaw(input);

  let toParse = jsonContent;
  try {
    toParse = await tryJsonRepair(jsonContent);
  } catch {
    // keep toParse as jsonContent
  }

  let parsed: unknown;
  let parseError: unknown;
  try {
    parsed = JSON.parse(toParse);
  } catch (e) {
    parseError = e;
  }

  if (parsed === undefined) {
    const posMatch = parseError instanceof Error && parseError.message.match(/position (\d+)/);
    const errPos = posMatch ? parseInt(posMatch[1], 10) : 0;
    const isNearEnd = errPos > 0 && errPos >= toParse.length * 0.7;

    if (isNearEnd) {
      const truncated = toParse.substring(0, errPos);
      try {
        const repaired = await tryJsonRepair(truncated);
        parsed = JSON.parse(repaired);
      } catch {
        const closed = closeTruncatedJson(truncated);
        if (closed) {
          try {
            parsed = JSON.parse(closed);
          } catch {
            const earlier = toParse.substring(0, Math.max(0, errPos - 200));
            const closedEarlier = closeTruncatedJson(earlier);
            if (closedEarlier) {
              try {
                parsed = JSON.parse(closedEarlier);
              } catch {
                // fall through
              }
            }
          }
        }
      }
    }

    if (parsed === undefined) {
      console.error('JSON parse error:', parseError);
      console.error('Content preview (first 1200 chars):', toParse.substring(0, 1200));
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(
        `Generation could not parse the AI response as valid JSON. The response may have been cut off (try again; use a shorter AI brief) or contain unescaped quotes. Parse error: ${msg}`
      );
    }
  }

  try {
    const validated = EventGenerationOutputSchema.parse(parsed);
    return validated;
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      const errorDetails = validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('Validation error:', errorDetails);
      throw new Error(`AI generation validation failed: ${errorDetails}`);
    }
    throw validationError;
  }
}
