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

  const systemPrompt = `You are an expert game designer and facilitator for collaborative decision-making workshops. Your task is to generate structured decision scenarios (quests) based on an event brief.

CRITICAL REQUIREMENTS:
- Generate exactly 3 regions (districts/areas)
- Each region must have at least 1 quest (aim for 2-3 quests per region for variety)
- Each quest must have exactly 3 decisions
- Each decision must have exactly 3 options (A, B, C)
- All content must be realistic, engaging, and suitable for team collaboration
- Decisions should present meaningful tradeoffs
- Options should have clear impacts and tradeoffs

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
          "description": "Detailed quest description",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Decision Title",
              "context": "Background context for this decision",
              "options": [
                {
                  "optionKey": "A",
                  "title": "Option A Title",
                  "description": "What this option entails",
                  "impact": "Expected outcomes and consequences",
                  "tradeoff": "What is sacrificed or gained"
                },
                {
                  "optionKey": "B",
                  "title": "Option B Title",
                  "description": "What this option entails",
                  "impact": "Expected outcomes and consequences",
                  "tradeoff": "What is sacrificed or gained"
                },
                {
                  "optionKey": "C",
                  "title": "Option C Title",
                  "description": "What this option entails",
                  "impact": "Expected outcomes and consequences",
                  "tradeoff": "What is sacrificed or gained"
                }
              ]
            },
            {
              "decisionNumber": 2,
              "title": "Decision 2 Title",
              "context": "Background context",
              "options": [/* 3 options A, B, C */]
            },
            {
              "decisionNumber": 3,
              "title": "Decision 3 Title",
              "context": "Background context",
              "options": [/* 3 options A, B, C */]
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Ensure all required fields are present
- Each quest must have exactly 3 decisions (numbered 1, 2, 3)
- Each decision must have exactly 3 options (A, B, C)
- Make decisions challenging and thought-provoking
- Ensure options have meaningful differences and tradeoffs`;

  const userPrompt = `Generate decision-making quests for this event:

Event Name: ${eventName || 'Unnamed Event'}
Event Description: ${eventDescription || 'No description provided'}

AI Brief:
${brief}

Generate 3 regions with 2-3 quests each. Each quest should have 3 sequential decisions with 3 options each. Make the content relevant to the brief and suitable for team collaboration.`;

  try {
    console.log('Calling OpenAI API with model: gpt-4o-mini');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4 if needed
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // Force JSON output
      temperature: 0.7, // Balance creativity and consistency
      max_tokens: 4000, // Should be enough for multiple quests
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    console.log('OpenAI response received, length:', content.length);

    // Parse JSON (remove any markdown code blocks if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content preview:', jsonContent.substring(0, 500));
      throw new Error(`AI returned invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
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
