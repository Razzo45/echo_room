import OpenAI from 'openai';
import { z } from 'zod';
import { EventGenerationOutputSchema, type EventGenerationOutput } from './schemas';

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

/**
 * Generate event rooms (regions, quests, decisions) from an AI brief
 * Returns validated JSON structure ready for database persistence
 */
export async function generateEventRooms(
  input: GenerateEventRoomsInput
): Promise<EventGenerationOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const { brief, eventName, eventDescription } = input;

  const systemPrompt = `You are a facilitator designing immersive, team-based decision experiences for people attending an event.
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

CONTENT & LENGTH GUIDELINES
- Generate exactly 3 regions (districts/areas).
- Each region: exactly 2 quests (fixed for stable data flow). Fit the event’s theme and audience.
- Each quest: exactly 3 sequential decisions.
- Each decision: exactly 3 options (A, B, C) that are all plausible, with no obvious "correct" answer.
- Quest descriptions: 80–150 words, focused on setting the scene and why it matters to participants.
- Decision context: 100–180 words, describing the crossroads and the pressures around it.
- Option description: 40–80 words, explaining what the team would actually do.
- Impact: 120–200 words, mixing concrete outcomes and 2–3 key risks (1–2 sentences each).
- Tradeoff: 80–150 words, explaining what you gain, what you lose, and who feels it.

CRITICAL JSON FORMATTING REQUIREMENTS:
- You MUST return ONLY valid JSON, no markdown, no code blocks, no explanations
- All string values MUST be properly escaped for JSON (use \\" for quotes, \\n for newlines)
- NO unescaped quotes or special characters in strings
- NO trailing commas
- NO comments in JSON
- Ensure all strings are properly terminated
- Use \\n to indicate paragraph breaks in longer text fields

CRITICAL CONTENT REQUIREMENTS:
- Generate exactly 3 regions (districts/areas)
- You MUST output exactly 3 regions and exactly 2 quests per region (no more, no less). Output structure is fixed.
- Each quest must have exactly 3 decisions
- Each decision must have exactly 3 options (A, B, C)
- All content must be realistic, engaging, and suitable for team collaboration
- Decisions should present sophisticated, challenging dilemmas with no obvious "right" answer
- Options should have well-articulated, multi-dimensional impacts and tradeoffs
- Avoid generic or simplistic language - be specific and nuanced
- Trade-offs should NOT be simple "cost vs benefit" - explore complexity and nuance

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
          "description": "Concise, contextual narrative describing the quest scenario (80-150 words) written for people attending the event",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Decision Title",
              "context": "Focused background context (100-180 words) including key constraints, stakeholder perspectives, and why this decision matters to people at the event",
              "options": [
                {
                  "optionKey": "A",
                  "title": "Option A Title",
                  "description": "Clear description of what this option entails for participants (40-80 words)",
                  "impact": "Concise analysis of outcomes and consequences (120-200 words). MUST include 2-3 specific risks with brief explanations, plus key expected outcomes and any important follow-on effects for people and communities.",
                  "tradeoff": "Multi-faceted trade-off analysis (80-150 words). MUST cover economic, strategic, operational, stakeholder, temporal, and risk-reward dimensions in a concise way. Not a simple cost-benefit."
                },
                {
                  "optionKey": "B",
                  "title": "Option B Title",
                  "description": "What this option entails (keep it focused and concrete)",
                  "impact": "Expected outcomes and consequences in 3-5 sentences.",
                  "tradeoff": "What is sacrificed or gained, in a concise way."
                },
                {
                  "optionKey": "C",
                  "title": "Option C Title",
                  "description": "What this option entails (keep it focused and concrete)",
                  "impact": "Expected outcomes and consequences in 3-5 sentences.",
                  "tradeoff": "What is sacrificed or gained, in a concise way."
                }
              ]
            },
            {
              "decisionNumber": 2,
              "title": "Decision 2 Title",
              "context": "Focused background context for this decision",
              "options": [/* 3 options A, B, C */]
            },
            {
              "decisionNumber": 3,
              "title": "Decision 3 Title",
              "context": "Focused background context for this decision",
              "options": [/* 3 options A, B, C */]
            }
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
- Validate your JSON before returning

CONTENT RULES:
- Ensure all required fields are present with substantial, high-quality content
- Each quest must have exactly 3 decisions (numbered 1, 2, 3)
- Each decision must have exactly 3 options (A, B, C)
- Make decisions challenging, sophisticated dilemmas with no obvious answer
- Ensure options have meaningful, well-articulated differences with comprehensive trade-offs
- Trade-offs MUST be detailed multi-faceted analyses, NOT simple cost-benefit summaries
- Impact fields MUST include specific, detailed risks (3-5 minimum) with explanations
- Write for an executive/professional audience - sophisticated language and concepts
- Avoid generic, vague, or high-school level language - be specific and nuanced`;

  const userPrompt = `Generate immersive, team-based decision quests that feel relevant to people attending this event:

Event Name: ${eventName || 'Unnamed Event'}
Event Description: ${eventDescription || 'No description provided'}

AI Brief:
${brief}

Audience: People attending this event (for example, the kinds of participants and stakeholders described in the brief).

CENTRAL QUESTION TO HOLD IN EVERY QUEST AND DECISION:
"If you were one of these participants, what would you want this experience or solution to do to improve your daily work or quality of life?"

Use this central question to:
- Anchor every quest in concrete participant experiences (before, during, and after the event).
- Show how each option changes what participants see, feel, and can do.
- Make it obvious how the scenario connects to why they came to this event.

Generate exactly 3 regions with exactly 2 quests each (6 quests total). Fixed structure: 3 areas × 2 quests. Each quest has 3 sequential decisions with 3 options each. Make the content highly relevant to the brief AND to the lived experience of people who chose to attend this event.

CRITICAL QUALITY REQUIREMENTS:
- Be concise: aim for roughly 60–120 words per narrative section (no long essays).
- Trade-offs: Provide multi-faceted analyses (80-150 words) covering economic, strategic, operational, stakeholder, temporal, and risk-reward dimensions. NOT simple cost-benefit.
- Impact/Risks: Provide focused outcome analysis (120-200 words) with 2-3 specific, detailed risks (1-2 sentences each) plus key outcomes. Avoid repetition.
- Context: Focused background narratives (100-180 words) with only the most relevant constraints, tensions, and decision drivers.
- Language: Professional and sophisticated, but direct, human, and easy to relate to for participants.

REMEMBER: Use plain text in strings, escape quotes as \\", use \\n for paragraph breaks, and ensure all strings are properly escaped for JSON.`;

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
      max_tokens: 6000, // Lower to encourage more focused, concise content
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    console.log('OpenAI response received, length:', content.length);

    // Parse JSON (remove any markdown code blocks if present)
    let jsonContent = content.trim();
    
    // Remove markdown code blocks
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*\n?/i, '').replace(/\n?\s*```\s*$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    }
    
    // Try to find JSON object if wrapped in text
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    // Fix common JSON issues before parsing
    jsonContent = jsonContent
      .trim()
      // Remove trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, '$1')
      // Ensure proper string termination (basic fix)
      .replace(/([^\\])"([^":,}\]]*?)([^\\])"/g, (match, p1, p2, p3) => {
        // This is a basic fix - if we detect potential unterminated strings, try to fix them
        return match;
      });

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      const errorPos = parseError instanceof SyntaxError && 'position' in parseError 
        ? (parseError as any).position 
        : null;
      
      if (errorPos) {
        const start = Math.max(0, errorPos - 200);
        const end = Math.min(jsonContent.length, errorPos + 200);
        console.error('Content around error position:', jsonContent.substring(start, end));
      } else {
        console.error('Content preview (first 1000 chars):', jsonContent.substring(0, 1000));
      }
      
      // Try to recover by fixing common issues (conservative approach)
      try {
        let fixedJson = jsonContent;
        
        // Remove trailing commas (common issue)
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // Try parsing the fixed version
        parsed = JSON.parse(fixedJson);
        console.log('Successfully parsed after auto-fix (trailing comma removal)');
      } catch (recoveryError) {
        // If auto-fix didn't work, the JSON is too malformed
        // Log more details for debugging
        console.error('JSON auto-fix failed. Original error:', parseError);
        console.error('Recovery attempt error:', recoveryError);
        
        throw new Error(
          `AI returned invalid JSON with syntax error. This usually happens when the AI includes unescaped quotes in text. ` +
          `Error: ${parseError instanceof Error ? parseError.message : 'Parse error'}. ` +
          `Please try generating again, or simplify your AI brief.`
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
