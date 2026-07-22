import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserEventAccess } from '@/lib/event-access';
import { fetchEventRoomsRaw } from '@/lib/ai/generateEventRooms';
import { getMockEventRooms } from '@/lib/ai/mockEventRooms';
import { EventGenerationOutputSchema, type EventGenerationOutput } from '@/lib/ai/schemas';
import { normalizeScenarioSlots } from '@/lib/ai/scenarioSlots';

/** Close truncated JSON by appending brackets in correct order (stack-based). Inlined in route so deploy always has fix. */
function closeTruncatedJson(str: string): string {
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
  return str + stack.reverse().join('');
}

/**
 * Parse and validate raw JSON string (jsonrepair → parse → truncation recovery → Zod).
 * Lives in route so the deployed route bundle always contains this fix.
 */
async function parseGeneratedJson(raw: string): Promise<EventGenerationOutput> {
  let toParse = raw;
  try {
    const { jsonrepair } = await import('jsonrepair');
    toParse = jsonrepair(raw);
  } catch {
    // keep toParse as raw
  }

  let parsed: unknown;
  let parseError: unknown;
  try {
    parsed = JSON.parse(toParse);
  } catch (e) {
    parseError = e;
  }

  if (parsed === undefined && parseError instanceof Error) {
    const posMatch = parseError.message.match(/position (\d+)/);
    const errPos = posMatch ? parseInt(posMatch[1], 10) : 0;
    const isNearEnd = errPos > 0 && errPos >= toParse.length * 0.7;

    if (isNearEnd) {
      const truncated = toParse.substring(0, errPos);
      try {
        const { jsonrepair } = await import('jsonrepair');
        const repaired = jsonrepair(truncated);
        parsed = JSON.parse(repaired);
      } catch {
        const closed = closeTruncatedJson(truncated);
        try {
          parsed = JSON.parse(closed);
        } catch {
          const earlier = toParse.substring(0, Math.max(0, errPos - 200));
          const closedEarlier = closeTruncatedJson(earlier);
          try {
            parsed = JSON.parse(closedEarlier);
          } catch {
            // fall through
          }
        }
      }
    }
  }

  if (parsed === undefined) {
    const msg = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(
      `Generation could not parse the AI response as valid JSON. The response may have been cut off (try again; use a shorter AI brief) or contain unescaped quotes. Parse error: ${msg}`
    );
  }

  const result = EventGenerationOutputSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`AI generation validation failed: ${details}`);
  }
  return result.data;
}

/**
 * POST /api/organiser/events/[id]/generate
 * Generate event rooms (quests, decisions, options) using AI
 * When event.debugMode is true, uses canned mock output (no LLM call).
 * Returns DRAFT status - content must be reviewed and committed via /generate/commit
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const eventId = event.id;

    // In debug mode we skip AI; otherwise brief is required
    if (!event.debugMode && (!event.aiBrief || !event.aiBrief.trim())) {
      return NextResponse.json(
        { error: 'AI brief is required. Please add an AI brief to the event first.' },
        { status: 400 }
      );
    }

    // Check OpenAI API key only when not using debug mock
    if (!event.debugMode && !process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        {
          error: 'OpenAI API key is not configured',
          details: 'Please set OPENAI_API_KEY environment variable',
        },
        { status: 500 }
      );
    }

    // Check if already generating
    if (event.aiGenerationStatus === 'GENERATING') {
      return NextResponse.json(
        { error: 'Generation already in progress' },
        { status: 409 }
      );
    }

    // Update event status to GENERATING
    await prisma.event.update({
      where: { id: eventId },
      data: { aiGenerationStatus: 'GENERATING' },
    });

    // Create EventGeneration record with input snapshot
    let body: { twoPass?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const twoPass = Boolean(body.twoPass);
    const slots = normalizeScenarioSlots(event.aiScenarioSlots);

    const generation = await prisma.eventGeneration.create({
      data: {
        eventId,
        status: 'GENERATING',
        input: {
          brief: event.aiBrief,
          eventName: event.name,
          eventDescription: event.description,
          slots,
          twoPass,
        },
        model: twoPass ? 'gpt-4o-two-pass' : 'gpt-4o',
      },
    });

    try {
      let generated: EventGenerationOutput;
      if (event.debugMode) {
        generated = getMockEventRooms();
      } else {
        const raw = await fetchEventRoomsRaw({
          brief: event.aiBrief!,
          eventName: event.name,
          eventDescription: event.description || undefined,
          slots,
          twoPass,
        });
        generated = await parseGeneratedJson(raw);
      }

      // Store draft in EventGeneration.output and set status to DRAFT (not READY)
      // This allows organiser to review/edit before committing to database
      await prisma.eventGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'DRAFT',
          output: generated as unknown as Prisma.InputJsonValue,
        },
      });

      // Update Event status to DRAFT (awaiting review)
      await prisma.event.update({
        where: { id: eventId },
        data: { aiGenerationStatus: 'DRAFT' },
      });

      // Return the generated content for review
      return NextResponse.json({
        success: true,
        message: 'AI generation completed. Please review and confirm.',
        generationId: generation.id,
        draft: generated, // Return the generated content for review
        status: 'DRAFT',
      });
    } catch (error) {
      // Update generation status to FAILED
      let errorMessage = 'Unknown error';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      console.error('AI generation error:', {
        message: errorMessage,
        details: errorDetails,
        eventId,
        generationId: generation.id,
      });

      // Try to update generation status
      try {
        await prisma.eventGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            error: errorMessage.substring(0, 1000),
          },
        });

        await prisma.event.update({
          where: { id: eventId },
          data: { aiGenerationStatus: 'FAILED' },
        });
      } catch (updateError) {
        console.error('Failed to update generation status:', updateError);
      }

      // Return user-friendly error message (order matters: check specific before generic)
      const userMessage = errorMessage.includes('OPENAI_API_KEY')
        ? 'OpenAI API key is not configured. Please contact the administrator.'
        : errorMessage.includes('validation')
        ? 'AI returned invalid content. Please try again with a different brief.'
        : errorMessage.includes('could not parse') || errorMessage.includes('Parse error')
        ? 'Could not parse AI response. Try again or use a shorter AI brief.'
        : errorMessage.includes('JSON')
        ? 'AI returned invalid JSON. Please try again.'
        : 'Failed to generate event rooms. Please try again.';

      return NextResponse.json(
        {
          error: userMessage,
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const httpStatus =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    if (httpStatus === 404) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    console.error('Generate event rooms outer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'An error occurred during generation',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
