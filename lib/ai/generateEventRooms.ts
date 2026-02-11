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

/** Try to close truncated JSON by appending missing ] and } (only when error position is near end). */
function closeTruncatedJson(str: string): string | null {
  let openBraces = 0;
  let openBrackets = 0;
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
    if (c === '{') openBraces++;
    else if (c === '}') openBraces--;
    else if (c === '[') openBrackets++;
    else if (c === ']') openBrackets--;
  }
  if (openBraces < 0 || openBrackets < 0) return null;
  return str + ']'.repeat(openBrackets) + '}'.repeat(openBraces);
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
 * Generate event rooms (regions, quests, decisions) from an AI brief
 * Returns validated JSON structure ready for database persistence
 */
const GENERATE_PIPELINE_VERSION = 'v2-jsonrepair-first-truncation-recovery';

export async function generateEventRooms(
  input: GenerateEventRoomsInput
): Promise<EventGenerationOutput> {
  console.log('[generateEventRooms] pipeline', GENERATE_PIPELINE_VERSION);
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

  const systemPrompt = `CRITICAL: Your reply is strictly limited to 5000 tokens. If you exceed it, the response will be cut off and JSON will be invalid. Use 1-2 short sentences per text field only.

You are a facilitator designing immersive, team-based decision experiences for people attending an event.
Your job is to turn an event brief into concrete, emotionally resonant quests that feel relevant to participants’ real lives.

WRITING STYLE (CRITICAL)
- Write for smart, curious professionals who are at the event right now – not as a distant consultant report.
- Use clear, vivid, conversational language (no buzzword soup, no long essays).
- Make scenarios feel grounded in everyday reality: what people see, feel, and worry about in their roles and communities.
- Highlight tensions and trade-offs in a way that sparks discussion, not in dense paragraphs.

PARTICIPANT PERSPECTIVE (CRITICAL)
For every quest and decision, implicitly answer:
- "If I’m a person at this event, why should I care about this?"
- "If I lived or worked in this context, how would this actually change my day-to-day experience?"
- When helpful, bring in concrete characters (e.g. "a nurse on the night shift", "a commuter with two kids", "a small café owner").

TOKEN BUDGET (CRITICAL – response is cut off if you exceed it)
- Your reply has a strict token limit. If you write too much, the JSON will be truncated and the generation will fail. Stay well under the limit.
- Quest description: at most 2 sentences (about 30–45 words).
- Decision context: at most 2 sentences (about 35–50 words).
- Option description: exactly 1 sentence (about 15–25 words).
- Impact: at most 2 sentences (about 30–45 words). One outcome and one risk is enough.
- Tradeoff: at most 2 sentences (about 25–40 words).
- Be specific and discussion-worthy, but brief. No lists, no repetition, no filler. Prefer one strong sentence over two weak ones.

CONTENT & STRUCTURE
- Generate exactly 3 regions (districts/areas).
- Each region: exactly 2 quests (fixed for stable data flow). Fit the event theme and audience.
- Each quest: exactly 3 sequential decisions.
- Each decision: exactly 3 options (A, B, C) that are all plausible, with no obvious "correct" answer.

CRITICAL JSON FORMATTING REQUIREMENTS:
- You MUST return ONLY valid JSON, no markdown, no code blocks, no explanations
- All string values MUST be properly escaped for JSON (use \\" for quotes, \\n for newlines)
- NO unescaped quotes or special characters in strings
- NO trailing commas
- NO comments in JSON
- Ensure all strings are properly terminated
- Use \\n to indicate paragraph breaks in longer text fields

CONTENT REQUIREMENTS
- Output exactly 3 regions and exactly 2 quests per region (no more, no less). Structure is fixed.
- Each quest: exactly 3 decisions. Each decision: exactly 3 options (A, B, C).
- Content must be realistic, engaging, and suitable for team collaboration.
- Decisions: genuine dilemmas with no obvious "right" answer; options with clear trade-offs and nuance.
- Be specific and grounded; avoid generic or simplistic language. Trade-offs should reflect real complexity, not simple cost vs benefit.

OUTPUT FORMAT (STRICT JSON):
- "regions" must be an array of exactly 3 region objects. Each region must have a "quests" array of exactly 2 quests.
{
  "regions": [
    {
      "name": "slug-like-identifier",
      "displayName": "Human Readable Name",
      "description": "Brief description of this region",
      "quests": [
        { "name": "Quest 1 Name",
          "description": "At most 2 sentences.",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Decision Title",
              "context": "At most 2 sentences.",
              "options": [
                {
                  "optionKey": "A",
                  "title": "Option A Title",
                  "description": "One sentence.",
                  "impact": "At most 2 sentences.",
                  "tradeoff": "At most 2 sentences."
                },
                { "optionKey": "B", "title": "Option B Title", "description": "...", "impact": "...", "tradeoff": "..." },
                { "optionKey": "C", "title": "Option C Title", "description": "...", "impact": "...", "tradeoff": "..." }
              ]
            },
            { "decisionNumber": 2, "title": "...", "context": "...", "options": [/* 3 options */] },
            { "decisionNumber": 3, "title": "...", "context": "...", "options": [/* 3 options */] }
          ]
        },
                { "name": "Quest 2 Name", "description": "...", "durationMinutes": 30, "teamSize": 3, "decisions": [ /* 3 decisions, same structure as Quest 1 */ ] }
      ]
    }
  ]
}

CRITICAL JSON RULES:
- Return ONLY raw JSON object, NO markdown code blocks
- NO backticks, NO code fences, NO explanations before or after
- Escape all quotes in strings: use \\" not "
- Escape all backslashes: use \\\\
- No newlines in string values (use \\n if needed)
- No trailing commas anywhere
- All strings must be properly terminated
- Do NOT include hashtags (#) or social media tags in any string value - they break JSON parsing. Paraphrase themes in plain text only.
- Validate your JSON before returning

CONTENT RULES
- Ensure all required fields are present. Respect the TOKEN BUDGET above or the response will be cut off and fail.
- Each quest: exactly 3 decisions (1, 2, 3). Each decision: exactly 3 options (A, B, C).
- Decisions: genuine dilemmas; options with clear trade-offs. Be specific and concise.`;

  const userPrompt = `Generate immersive, team-based decision quests that feel relevant to people attending this event:

Event Name: ${safeEventName || 'Unnamed Event'}
Event Description: ${safeEventDescription ?? 'No description provided'}

AI Brief:
${safeBrief}

Audience: People attending this event (for example, the kinds of participants and stakeholders described in the brief).

CENTRAL QUESTION TO HOLD IN EVERY QUEST AND DECISION:
"If you were one of these participants, what would you want this experience or solution to do to improve your daily work or quality of life?"

Use this central question to:
- Anchor every quest in concrete participant experiences (before, during, and after the event).
- Show how each option changes what participants see, feel, and can do.
- Make it obvious how the scenario connects to why they came to this event.

Generate exactly 3 regions with exactly 2 quests each (6 quests total). Fixed structure: 3 areas × 2 quests. Each quest has 3 sequential decisions with 3 options each. Make content relevant to the brief and to participants.

Respect the TOKEN BUDGET: at most 2 sentences per narrative field, 1 sentence for option description and tradeoff. If you exceed the limit the JSON will be cut off and fail. Escape quotes as \\", no hashtags. Return ONLY valid JSON.`;

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
      max_tokens: 5000, // Hard cap so response fits; prompt enforces short fields
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    console.log('OpenAI response received, length:', content.length);

    // Parse JSON: strip markdown, extract object, fix trailing commas, then parse (with optional repair)
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

    // Try jsonrepair first (fixes unescaped quotes, trailing commas, and can help with truncation)
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
      // Truncation recovery: error near end of content → close open brackets and re-parse
      const posMatch = parseError instanceof Error && parseError.message.match(/position (\d+)/);
      const errPos = posMatch ? parseInt(posMatch[1], 10) : 0;
      if (errPos > 0 && errPos >= jsonContent.length * 0.75) {
        const closed = closeTruncatedJson(jsonContent.substring(0, errPos));
        if (closed) {
          try {
            parsed = JSON.parse(closed);
            console.log('Parsed successfully after truncation recovery');
          } catch {
            // fall through
          }
        }
      }

      if (parsed === undefined) {
        console.error('JSON parse error:', parseError);
        console.error('Content preview (first 1200 chars):', jsonContent.substring(0, 1200));
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(
          `Generation could not parse the AI response as valid JSON. The response may have been cut off (try again; use a shorter AI brief) or contain unescaped quotes. Parse error: ${msg}`
        );
      }
    }

    // Validate with Zod schema
    try {
      const validated = EventGenerationOutputSchema.parse(parsed);
      console.log('Validation passed, regions:', validated.regions.length);
      return validated;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorDetails = validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('Validation error:', errorDetails);
        console.error('Parsed data preview:', JSON.stringify(parsed).substring(0, 1000));
        throw new Error(`AI generation validation failed: ${errorDetails}`);
      }
      throw validationError;
    }
  } catch (error) {
    // Handle OpenAI API errors specifically
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as any;
      if (apiError.status === 401) {
        throw new Error('OpenAI API key is invalid or expired');
      }
      if (apiError.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
      if (apiError.status === 500 || apiError.status === 503) {
        throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
      }
      throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`);
    }

    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`AI generation validation failed: ${errorDetails}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`AI returned invalid JSON: ${error.message}`);
    }
    if (error instanceof Error) {
      // Don't wrap if it's already a formatted error
      if (error.message.includes('OpenAI') || error.message.includes('validation') || error.message.includes('JSON')) {
        throw error;
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw new Error('Unknown error during AI generation');
  }
}
