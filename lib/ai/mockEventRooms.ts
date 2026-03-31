import type { EventGenerationOutput } from './schemas';

/**
 * Canned output for debug-mode event generation. No LLM call – lets admins
 * verify the full platform (customer journey, organiser flow, commit) without cost.
 */
export function getMockEventRooms(): EventGenerationOutput {
  return {
    regions: [
      {
        name: 'debug-region-a',
        displayName: 'Debug Region A',
        description: 'Test region for platform verification.',
        quests: [
          {
            name: 'Debug Quest A1',
            description: 'You are a team of product managers at a fast-growing startup. A critical product launch is days away, and a major competitor just announced a similar feature. Your decisions over the next five beats will determine whether you ship on time and capture the market.',
            durationMinutes: 30,
            teamSize: 3,
            decisions: makeDecisions(1),
          },
          {
            name: 'Debug Quest A2',
            description: 'You are a team of city planners evaluating proposals for a new transit corridor. Budgets are tight, community opinions are split, and the deadline is next week.',
            durationMinutes: 30,
            teamSize: 3,
            decisions: makeDecisions(2),
          },
        ],
      },
      {
        name: 'debug-region-b',
        displayName: 'Debug Region B',
        description: 'Second test region.',
        quests: [
          { name: 'Debug Quest B1', description: 'You are a crisis response team at a hospital during a sudden surge in patients.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(3) },
          { name: 'Debug Quest B2', description: 'You are sustainability leads at a conference deciding how to reduce the event carbon footprint.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(4) },
        ],
      },
      {
        name: 'debug-region-c',
        displayName: 'Debug Region C',
        description: 'Third test region.',
        quests: [
          { name: 'Debug Quest C1', description: 'You are a team of educators redesigning a curriculum under new guidelines.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(5) },
          { name: 'Debug Quest C2', description: 'You are event organisers managing a live venue when the keynote speaker cancels last minute.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(6) },
        ],
      },
    ],
  };
}

function makeDecisions(seed: number): EventGenerationOutput['regions'][0]['quests'][0]['decisions'] {
  const opt = (key: 'A' | 'B' | 'C') => ({ optionKey: key as 'A' | 'B' | 'C', title: `Option ${key}`, description: 'A concrete choice.', impact: 'Positive outcome. Possible risk.', tradeoff: 'What you give up.' });
  const arcLabels = ['Setup', 'Escalation', 'Pivot', 'Climax', 'Resolution'];
  return arcLabels.map((label, i) => ({
    decisionNumber: (i + 1) as 1 | 2 | 3 | 4 | 5,
    title: `${label} (seed ${seed})`,
    context: `Beat ${i + 1} context: ${label.toLowerCase()} phase of the story.`,
    options: [opt('A'), opt('B'), opt('C')],
  }));
}
