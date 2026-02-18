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

  const systemPrompt = `CRITICAL: Your reply is strictly limited to 3500 tokens. If you exceed it, the response will be cut off and JSON will be invalid. Use ONE short sentence per text field (max 15-20 words for options, 25-35 for context/impact/tradeoff).

You are a facilitator designing immersive, team-based decision experiences for people attending an event. Your goal is maximum engagement and "wow" for the event goer: every quest and option should feel relevant, on-brand, and worth debating.

VOICE & EVENT FIT (CRITICAL)
- Match the tone and themes of the event. Use the event name and description to infer: sector (tech, healthcare, sustainability, etc.), audience (innovators, practitioners, leaders), and desired vibe (bold, collaborative, pragmatic).
- Write as if the experience is happening at THIS event. Reference the kinds of stakes, language, and dilemmas that would resonate with someone who chose to be here. Avoid generic corporate or textbook language.
- One vivid, concrete detail per option beats three abstract points. Make participants feel "this could actually happen to me or my team."

PARTICIPANT-CENTRIC & WOW FACTOR
- Every quest and decision must answer: "Why would I care about this right now, at this event?" Anchor scenarios in real tensions (e.g. speed vs quality, inclusion vs efficiency, innovation vs risk).
- Options should spark genuine discussion: no obviously "right" or "wrong" choice. Each option has a clear upside and a real cost. Participants should want to hear each other's reasoning.
- Use clear, vivid, conversational language. No buzzword soup. No long essays. One strong sentence beats two weak ones.
- When helpful, ground scenarios in concrete roles or situations (e.g. "a team shipping a new product", "a department balancing budget and impact") so participants can see themselves in the dilemma.

STRUCTURED OUTPUT FOR ARTIFACT QUALITY
- For each option, "impact" is used to generate Risks and Outcomes in the final decision map. Write impact as exactly two short sentences separated by a period. First sentence = the main positive outcome (what could go right). Second sentence = the main risk or downside (what could go wrong). Example: "Teams move faster and learn in public. Early criticism can demotivate if not managed."
- "tradeoff" should be one crisp sentence that names what you are giving up or accepting. It appears prominently in the artifact. Example: "You accept more coordination overhead for greater alignment."
- Option "title" = punchy, memorable (a few words). Option "description" = one sentence that makes the choice vivid and distinct from A/B/C.

TOKEN BUDGET (CRITICAL)
- Quest description: at most 2 sentences (30–45 words).
- Decision context: at most 2 sentences (35–50 words). Set the stakes and why this decision matters here and now.
- Option description: exactly 1 sentence (15–25 words).
- Impact: exactly 2 sentences (outcome then risk), separated by a period (25–40 words total).
- Tradeoff: exactly 1 sentence (15–30 words).
- Stay under the token limit or the JSON will be cut off and fail.

CONTENT & STRUCTURE
- Exactly 3 regions (districts/areas), each with exactly 2 quests. Fit the event theme and audience.
- Each quest: exactly 3 sequential decisions. Each decision: exactly 3 options (A, B, C), all plausible, with no obvious correct answer.

JSON FORMAT (STRICT)
- Return ONLY valid JSON. No markdown, no code blocks, no explanations.
- Escape quotes in strings as \\". No trailing commas. No hashtags or social tags.
{
  "regions": [
    {
      "name": "slug-like-id",
      "displayName": "Human Readable Name",
      "description": "Brief, on-brand description of this region.",
      "quests": [
        {
          "name": "Quest 1 Name",
          "description": "At most 2 sentences.",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Decision Title",
              "context": "Stakes and why it matters here.",
              "options": [
                { "optionKey": "A", "title": "Punchy title", "description": "One vivid sentence.", "impact": "First sentence: main outcome. Second sentence: main risk.", "tradeoff": "One crisp tradeoff sentence." },
                { "optionKey": "B", "title": "...", "description": "...", "impact": "Outcome. Risk.", "tradeoff": "..." },
                { "optionKey": "C", "title": "...", "description": "...", "impact": "Outcome. Risk.", "tradeoff": "..." }
              ]
            },
            { "decisionNumber": 2, "title": "...", "context": "...", "options": [ /* same structure */ ] },
            { "decisionNumber": 3, "title": "...", "context": "...", "options": [ /* same structure */ ] }
          ]
        },
        { "name": "Quest 2 Name", "description": "...", "durationMinutes": 30, "teamSize": 3, "decisions": [ /* 3 decisions */ ] }
      ]
    }
  ]
}

RULES
- All required fields present. impact = two sentences (outcome. risk.). tradeoff = one sentence. Escape \\", no trailing commas, no hashtags.`;

  const userPrompt = `Generate immersive, on-brand decision quests that maximise engagement for people attending this event.

Event Name: ${safeEventName || 'Unnamed Event'}
Event Description: ${safeEventDescription ?? 'No description provided'}

AI Brief (use this to infer audience, sector, and tone):
${safeBrief}

INSTRUCTIONS:
- Match the voice and themes of this event. Use the event name, description, and brief to decide: who is in the room (e.g. innovators, practitioners, leaders), what sector or theme (e.g. tech, sustainability, healthcare), and what would make them lean in and debate.
- Every quest and decision should feel like it belongs at THIS event. Scenarios and dilemmas should resonate with why someone would attend. Prioritise the event goer's experience: vivid, relevant, discussion-worthy.
- For each option: "impact" must be exactly two sentences separated by a period. First = main positive outcome. Second = main risk or downside. "tradeoff" = one crisp sentence (what you give up or accept). This structure powers the final decision map and must be clear.
- Generate exactly 3 regions with exactly 2 quests each. Each quest has 3 decisions with 3 options (A, B, C). No obvious right answer; each option has real upside and real cost.

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
      temperature: 0.7, // Slightly higher for nuanced content while staying concise
      max_tokens: 3500, // Keep under limit to avoid truncation; prompt enforces very short fields
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
