# AI Event Room Generation

This document explains how to use the AI-powered event room generation feature in Echo Room.

## Overview

The AI generation feature allows organisers to automatically generate quests, decisions, and options for events based on a brief description. Instead of manually creating each quest and decision, organisers can write an AI brief and let the system generate structured content.

## Setup

### 1. Install OpenAI Dependency

The OpenAI package is already included in `package.json`. If you need to install it:

```bash
npm install openai
```

### 2. Set Environment Variable

Add your OpenAI API key to your `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**For Vercel deployment:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `OPENAI_API_KEY` with your API key value

## How to Use

### Step 1: Create an Event

1. Log in as an organiser at `/organiser`
2. Create a new event or open an existing event
3. Fill in the event details (name, description, etc.)

### Step 2: Add AI Brief

1. In the event detail page, find the "AI Room Generation" section
2. Enter an AI brief describing:
   - Your event theme
   - Goals and objectives
   - Types of decisions you want participants to make
   - Context about the event domain

**Example AI Brief:**
```
A smart city hackathon focused on urban sustainability. Teams will make decisions about:
- Renewable energy infrastructure (solar vs wind vs hybrid)
- Public transportation systems (buses vs trains vs bike-sharing)
- Waste management strategies (recycling vs composting vs incineration)

Each decision should present meaningful tradeoffs between cost, environmental impact, and implementation complexity.
```

### Step 3: Generate Rooms

1. Click "Save Brief" to save your AI brief
2. Click "Generate Rooms" to trigger AI generation
3. Wait for generation to complete (typically 10-30 seconds)
4. The system will:
   - Generate 3 regions (districts/areas)
   - Create 2-3 quests per region
   - Each quest has 3 sequential decisions
   - Each decision has 3 options (A, B, C) with tradeoffs

### Step 4: Review Generated Content

1. Once generation is complete, the status will show "READY"
2. Navigate to the quest management section to review generated quests
3. You can edit quests, decisions, and options if needed
4. Generate event codes and share with participants

## How It Works

### AI Model

- **Model**: `gpt-4o-mini` (cost-effective, can be upgraded to `gpt-4` if needed)
- **Temperature**: 0.7 (balances creativity and consistency)
- **Output Format**: Strict JSON (validated with Zod schemas)

### Generation Process

1. **Input**: Event brief, event name, event description
2. **AI Processing**: OpenAI generates structured JSON with regions, quests, decisions, and options
3. **Validation**: Output is validated against Zod schemas to ensure:
   - Exactly 3 regions
   - At least 1 quest per region
   - Exactly 3 decisions per quest
   - Exactly 3 options per decision (A, B, C)
4. **Persistence**: Validated content is written to database:
   - `Region` records
   - `Quest` records (linked to `EventGeneration`)
   - `QuestDecision` records
   - `QuestOption` records
5. **Transaction Safety**: All writes happen in a Prisma transaction to ensure atomicity

### Data Structure

Generated content follows this structure:

```json
{
  "regions": [
    {
      "name": "slug-like-identifier",
      "displayName": "Human Readable Name",
      "description": "Brief description",
      "quests": [
        {
          "name": "Quest Name",
          "description": "Detailed description",
          "durationMinutes": 30,
          "teamSize": 3,
          "decisions": [
            {
              "decisionNumber": 1,
              "title": "Decision Title",
              "context": "Background context",
              "options": [
                {
                  "optionKey": "A",
                  "title": "Option A",
                  "description": "What this option entails",
                  "impact": "Expected outcomes",
                  "tradeoff": "What is sacrificed/gained"
                }
                // ... B and C options
              ]
            }
            // ... decisions 2 and 3
          ]
        }
      ]
    }
  ]
}
```

## Error Handling

### Common Errors

1. **"AI brief is required"**
   - Solution: Add an AI brief before generating

2. **"Generation already in progress"**
   - Solution: Wait for current generation to complete

3. **"AI generation validation failed"**
   - Solution: The AI returned invalid structure. Try regenerating with a clearer brief

4. **"OPENAI_API_KEY environment variable is not set"**
   - Solution: Add `OPENAI_API_KEY` to your `.env` file or Vercel environment variables

### Status States

- **IDLE**: No generation has been attempted
- **GENERATING**: Generation is in progress (polled every 2 seconds)
- **READY**: Generation completed successfully
- **FAILED**: Generation failed (check error message)

## Regeneration

If you want to regenerate rooms:

1. Update the AI brief if needed
2. Click "Generate Rooms" again
3. **Warning**: This will delete all previously AI-generated quests for this event
4. New quests will be created based on the updated brief

## Cost Considerations

- **Model**: `gpt-4o-mini` is cost-effective (~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens)
- **Typical Cost**: ~$0.01-0.05 per generation (depending on brief length and output size)
- **Upgrade Option**: Change model in `lib/ai/generateEventRooms.ts` to `gpt-4` for higher quality (more expensive)

## Troubleshooting

### Generation Takes Too Long

- Check OpenAI API status
- Verify `OPENAI_API_KEY` is correct
- Check Vercel function logs for errors

### Invalid Output

- Try a more specific AI brief
- Ensure brief describes the types of decisions you want
- Check that brief is clear and well-structured

### Database Errors

- Ensure Prisma migrations are up to date: `npx prisma migrate deploy`
- Check database connection in `.env`
- Verify database schema matches Prisma schema

## Technical Details

### Files

- `lib/ai/schemas.ts` - Zod validation schemas
- `lib/ai/generateEventRooms.ts` - OpenAI integration and generation logic
- `app/api/organiser/events/[id]/generate/route.ts` - Generation API endpoint
- `app/api/organiser/events/[id]/generation/route.ts` - Status polling endpoint
- `app/organiser/events/[id]/page.tsx` - UI with AI brief and generate button

### Database Models

- `Event.aiBrief` - Stores the AI brief
- `Event.aiGenerationStatus` - Current generation status
- `EventGeneration` - Tracks each generation attempt (input, output, errors)
- `Quest.eventGenerationId` - Links quests to their generation

### Participant Experience

Generated content is automatically available to participants:
- Quests appear in the district/quest list
- Decisions and options are loaded from `QuestDecision` and `QuestOption` tables
- No changes needed to participant-side code
