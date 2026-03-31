import OpenAI from 'openai';
import { z } from 'zod';
import { EventGenerationOutputSchema, type EventGenerationOutput } from './schemas';

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
}

/** Remove hashtags and other characters that often cause the model to output invalid JSON */
function sanitizeForJsonSafePrompt(text: string): string {
  return (
    text
      // Remove hashtag tokens (#Something) - model may echo these and break JSON
      .replace(/#\w+/g, '')
      // Collapse multiple spaces/newlines introduced by removal
      .replace(/\n\s*\n/g, '\n')
      .replace(/  +/g, ' ')
      .trim()
  );
}

/**
 * Fetch raw preprocessed JSON string from OpenAI (for use in route with inline parse pipeline).
 * Exported so the route can call this and run its own parse/repair/truncation to guarantee deployed fix.
 */
export async function fetchEventRoomsRaw(
  input: GenerateEventRoomsInput
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  const { brief, eventName, eventDescription } = input;
  const safeBrief = sanitizeForJsonSafePrompt(brief);
  const safeEventDescription =
    eventDescription != null && eventDescription.trim() !== ''
      ? sanitizeForJsonSafePrompt(eventDescription)
      : undefined;
  const safeEventName = eventName?.trim() ?? undefined;

  const systemPrompt = `CRITICAL: Your reply is strictly limited to 8000 tokens. If you exceed it, the response will be cut off and JSON will be invalid. Keep text fields concise but substantive.

You are a facilitator designing immersive, team-based narrative experiences for people attending an event. Each quest is a STORYLINE that unfolds across 5 sequential story beats, resolved live by a small team through written actions and dice rolls.

STORYLINE DESIGN (CRITICAL)
- Each quest must tell a cohesive story with a clear narrative arc across its 5 beats:
  Beat 1 (Setup): Introduce the scenario, the team's identity, and the immediate challenge. Start with "You are..." to establish player ownership.
  Beat 2 (Escalation): Raise the stakes. The initial approach encounters a complication or new information.
  Beat 3 (Pivot): A turning point — an unexpected development forces the team to adapt or choose between conflicting priorities.
  Beat 4 (Climax): The highest-stakes moment. The team's earlier choices converge into a critical decision.
  Beat 5 (Resolution): The team addresses the final challenge. Actions here determine the closing outcome of the story.
- Each beat's "context" must reference or build on what happened in the previous beat, creating cause-and-effect. Beat 2 should reference the setup; Beat 3 should reference the complication from Beat 2, etc.
- The quest "description" sets the full scenario: who the players are, what situation they are in, and what is at stake. Write in second person: "You are a team of [role] at [context]..."

PLAYER OWNERSHIP
- Players must know WHO they are. The quest description must establish their identity (role, team, organization context).
- Beat contexts should address the players directly: "Your team...", "You discover...", "The decision you made earlier..."
- Make players feel their actions and rolls will shape what happens next.

EVENT-PROXIMITY TONE MATCHING (CRITICAL)
- Infer the event type from the name, description, and brief. Adapt the quest tone:
  * Professional/corporate → scenarios read like business simulations or strategic exercises. Language is analytical, grounded.
  * Tech/innovation → scenarios feel like product launches, incident response, or scaling challenges. Direct, action-oriented.
  * Gaming/entertainment → scenarios can be more dramatic, adventurous, with higher narrative flair. But still avoid pure fantasy tropes unless the event is explicitly fantasy-themed.
  * Social impact/sustainability → scenarios involve community, policy, resource allocation. Thoughtful, human-centered.
- Never default to generic fantasy/RPG language ("heroes", "quest", "tavern", "dungeon") unless the event is explicitly about that.

TOKEN BUDGET PER FIELD
- Quest description: 2–3 sentences (40–60 words). Establish identity, situation, stakes.
- Decision context: 2–3 sentences (40–60 words). Build on previous beat, set this beat's tension.
- Option title: 2–5 words, punchy and distinct.
- Option description: 1 sentence (15–25 words). What this choice means concretely.
- Impact: 2 sentences (30–50 words). First = main positive outcome. Second = main risk.
- Tradeoff: 1 sentence (15–25 words). What you give up.

CONTENT & STRUCTURE
- Exactly 3 regions, each with exactly 2 quests.
- Each quest: exactly 5 sequential decisions (story beats). Each decision: exactly 3 options (A, B, C), all plausible, no obvious winner.

JSON FORMAT (STRICT)
- Return ONLY valid JSON. No markdown, no code blocks, no explanations.
- Escape quotes as \\". No trailing commas. No hashtags.
{
  "regions": [
    {
      "name": "slug-like-id",
      "displayName": "Human Readable Name",
      "description": "Brief region description.",
      "quests": [
        {
          "name": "Quest Name",
          "description": "You are a team of [identity] at [context]. [Situation]. [Stakes]. (40-60 words)",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Beat 1 Title",
              "context": "Setup: establish the situation (40-60 words, cause-effect from description).",
              "options": [
                { "optionKey": "A", "title": "Short title", "description": "One sentence.", "impact": "Outcome. Risk.", "tradeoff": "One sentence." },
                { "optionKey": "B", "title": "...", "description": "...", "impact": "...", "tradeoff": "..." },
                { "optionKey": "C", "title": "...", "description": "...", "impact": "...", "tradeoff": "..." }
              ]
            },
            { "decisionNumber": 2, "title": "...", "context": "Escalation: builds on beat 1...", "options": [...] },
            { "decisionNumber": 3, "title": "...", "context": "Pivot: unexpected development...", "options": [...] },
            { "decisionNumber": 4, "title": "...", "context": "Climax: highest stakes...", "options": [...] },
            { "decisionNumber": 5, "title": "...", "context": "Resolution: final challenge...", "options": [...] }
          ]
        }
      ]
    }
  ]
}

RULES
- All required fields present. impact = two sentences. tradeoff = one sentence. Escape \\", no trailing commas, no hashtags.
- 5 decisions per quest. Cause-and-effect between beats. Player identity established in quest description.`;

  const userPrompt = `Generate immersive storyline quests for people attending this event. Each quest is a 5-beat narrative that players navigate through written actions and dice rolls.

Event Name: ${safeEventName || 'Unnamed Event'}
Event Description: ${safeEventDescription ?? 'No description provided'}

AI Brief (use this to infer audience, sector, and tone):
${safeBrief}

INSTRUCTIONS:
- Infer the event type and match tone accordingly. Professional events get business simulations. Tech events get product/engineering scenarios. Gaming events can be more dramatic. Social impact events get community-centered stories.
- Each quest description MUST start with "You are..." to establish the team's identity, role, and context. Players need to know who they are.
- The 5 story beats must form a coherent narrative arc: Setup → Escalation → Pivot → Climax → Resolution. Each beat's context must reference or build on the previous beat.
- Generate exactly 3 regions with exactly 2 quests each. Each quest has 5 decisions (story beats) with 3 options (A, B, C). No obvious right answer.
- For each option: "impact" = two sentences (outcome then risk). "tradeoff" = one sentence (what you give up).

Stay under the token limit. Escape quotes as \\", no hashtags. Return ONLY valid JSON.`;

  try {
    console.log('Calling OpenAI API with model: gpt-4o (high-quality content generation)');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using gpt-4o for higher quality, sophisticated content generation
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // Force JSON output
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    console.log('OpenAI response received, length:', content.length);

    // Preprocess: strip markdown, extract object, fix trailing commas
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
    // Multi-pass trailing comma removal (nested structures)
    for (let i = 0; i < 5; i++) {
      const next = jsonContent.replace(/,(\s*[}\]])/g, '$1');
      if (next === jsonContent) break;
      jsonContent = next;
    }

    return jsonContent;
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; message?: string };
      if (apiError.status === 401) throw new Error('OpenAI API key is invalid or expired');
      if (apiError.status === 429) throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      if (apiError.status === 500 || apiError.status === 503) throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
      throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Generate event rooms (regions, quests, decisions) from an AI brief.
 * Uses fetchEventRoomsRaw + parse/repair/truncation recovery + Zod validation.
 */
const GENERATE_PIPELINE_VERSION = 'v2-jsonrepair-first-truncation-recovery';

export async function generateEventRooms(
  input: GenerateEventRoomsInput
): Promise<EventGenerationOutput> {
  console.log('[generateEventRooms] pipeline', GENERATE_PIPELINE_VERSION);
  const jsonContent = await fetchEventRoomsRaw(input);

  // Parse: jsonrepair → parse → truncation recovery if needed → Zod
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
    if (toParse !== jsonContent) console.log('Parsed successfully after jsonrepair');
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
        console.log('Parsed successfully after jsonrepair of truncated response');
      } catch {
        const closed = closeTruncatedJson(truncated);
        if (closed) {
          try {
            parsed = JSON.parse(closed);
            console.log('Parsed successfully after truncation recovery (bracket close)');
          } catch {
            const earlier = toParse.substring(0, Math.max(0, errPos - 200));
            const closedEarlier = closeTruncatedJson(earlier);
            if (closedEarlier) {
              try {
                parsed = JSON.parse(closedEarlier);
                console.log('Parsed successfully after truncation recovery (earlier cut)');
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
    console.log('Validation passed, regions:', validated.regions.length);
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
