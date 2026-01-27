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

  const systemPrompt = `You are an expert consultant, strategic advisor, and facilitator for executive-level collaborative decision-making workshops. Your task is to generate sophisticated, high-quality decision scenarios (quests) based on an event brief.

WRITING QUALITY REQUIREMENTS (CRITICAL):
- Write at a professional/graduate-level standard, NOT high-school level
- Use clear, confident, executive-friendly language
- Be concise: aim for about 60–120 words per narrative field (avoid long essays)
- Trade-offs must be multi-faceted analyses covering:
  * Economic implications (costs, ROI, budget impacts)
  * Strategic considerations (long-term positioning, competitive advantage)
  * Operational challenges (implementation complexity, resource requirements)
  * Stakeholder impacts (affected parties, resistance, support)
  * Temporal factors (short-term vs long-term consequences)
  * Risk-reward balances (opportunity costs, missed opportunities)
- Impact field must contain focused outcomes including:
  * 2-3 specific, concrete risks with brief explanations of likelihood and severity
  * Key expected outcomes (positive and negative)
  * Any important cascading or second-order consequences
  * Quantifiable implications where relevant (timeframes, rough scales, probabilities)
- Quest descriptions should be vivid but efficient (80-150 words)
- Decision contexts should provide enough background to decide (100-180 words) with:
  * Key constraints and dependencies
  * The core tension or dilemma
  * The main stakeholders and what they care about

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
- Each region must have at least 1 quest (aim for 2-3 quests per region for variety)
- Each quest must have exactly 3 decisions
- Each decision must have exactly 3 options (A, B, C)
- All content must be realistic, engaging, and suitable for team collaboration
- Decisions should present sophisticated, challenging dilemmas with no obvious "right" answer
- Options should have well-articulated, multi-dimensional impacts and tradeoffs
- Avoid generic or simplistic language - be specific and nuanced
- Trade-offs should NOT be simple "cost vs benefit" - explore complexity and nuance

OUTPUT FORMAT (STRICT JSON):
{
  "regions": [
    {
      "name": "slug-like-identifier",
      "displayName": "Human Readable Name",
      "description": "Brief description of this region",
      "quests": [
        {
          "name": "Quest Name",
          "description": "Concise, contextual narrative describing the quest scenario (80-150 words)",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Decision Title",
              "context": "Focused background context (100-180 words) including key constraints, stakeholder perspectives, and urgency considerations",
              "options": [
                {
                  "optionKey": "A",
                  "title": "Option A Title",
                  "description": "Clear description of what this option entails (40-80 words)",
                  "impact": "Concise analysis of outcomes and consequences (120-200 words). MUST include 2-3 specific risks with brief explanations, plus key expected outcomes and any important follow-on effects.",
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
        }
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

  const userPrompt = `Generate sophisticated, high-quality but concise decision-making quests for this event:

Event Name: ${eventName || 'Unnamed Event'}
Event Description: ${eventDescription || 'No description provided'}

AI Brief:
${brief}

Generate 3 regions with 2-3 quests each. Each quest should have 3 sequential decisions with 3 options each. Make the content highly relevant to the brief and suitable for executive-level team collaboration.

CRITICAL QUALITY REQUIREMENTS:
- Be concise: aim for roughly 60–120 words per narrative section (no long essays).
- Trade-offs: Provide multi-faceted analyses (80-150 words) covering economic, strategic, operational, stakeholder, temporal, and risk-reward dimensions. NOT simple cost-benefit.
- Impact/Risks: Provide focused outcome analysis (120-200 words) with 2-3 specific, detailed risks (1-2 sentences each) plus key outcomes. Avoid repetition.
- Context: Focused background narratives (100-180 words) with only the most relevant constraints, tensions, and decision drivers.
- Language: Professional and sophisticated, but direct, punchy, and easy to scan for busy executives.

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
