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
            description: 'First test quest in debug mode. Use this to verify the full flow without calling the AI.',
            durationMinutes: 30,
            teamSize: 3,
            decisions: [
              {
                decisionNumber: 1,
                title: 'Test Decision 1',
                context: 'Context for decision 1.',
                options: [
                  { optionKey: 'A', title: 'Option A', description: 'Desc A', impact: 'Impact A', tradeoff: 'Tradeoff A' },
                  { optionKey: 'B', title: 'Option B', description: 'Desc B', impact: 'Impact B', tradeoff: 'Tradeoff B' },
                  { optionKey: 'C', title: 'Option C', description: 'Desc C', impact: 'Impact C', tradeoff: 'Tradeoff C' },
                ],
              },
              {
                decisionNumber: 2,
                title: 'Test Decision 2',
                context: 'Context for decision 2.',
                options: [
                  { optionKey: 'A', title: 'Option A', description: 'Desc A', impact: 'Impact A', tradeoff: 'Tradeoff A' },
                  { optionKey: 'B', title: 'Option B', description: 'Desc B', impact: 'Impact B', tradeoff: 'Tradeoff B' },
                  { optionKey: 'C', title: 'Option C', description: 'Desc C', impact: 'Impact C', tradeoff: 'Tradeoff C' },
                ],
              },
              {
                decisionNumber: 3,
                title: 'Test Decision 3',
                context: 'Context for decision 3.',
                options: [
                  { optionKey: 'A', title: 'Option A', description: 'Desc A', impact: 'Impact A', tradeoff: 'Tradeoff A' },
                  { optionKey: 'B', title: 'Option B', description: 'Desc B', impact: 'Impact B', tradeoff: 'Tradeoff B' },
                  { optionKey: 'C', title: 'Option C', description: 'Desc C', impact: 'Impact C', tradeoff: 'Tradeoff C' },
                ],
              },
            ],
          },
          {
            name: 'Debug Quest A2',
            description: 'Second test quest in debug region A.',
            durationMinutes: 30,
            teamSize: 3,
            decisions: [
              { decisionNumber: 1, title: 'D1', context: 'C1', options: [{ optionKey: 'A', title: 'A', description: 'D', impact: 'I', tradeoff: 'T' }, { optionKey: 'B', title: 'B', description: 'D', impact: 'I', tradeoff: 'T' }, { optionKey: 'C', title: 'C', description: 'D', impact: 'I', tradeoff: 'T' }] },
              { decisionNumber: 2, title: 'D2', context: 'C2', options: [{ optionKey: 'A', title: 'A', description: 'D', impact: 'I', tradeoff: 'T' }, { optionKey: 'B', title: 'B', description: 'D', impact: 'I', tradeoff: 'T' }, { optionKey: 'C', title: 'C', description: 'D', impact: 'I', tradeoff: 'T' }] },
              { decisionNumber: 3, title: 'D3', context: 'C3', options: [{ optionKey: 'A', title: 'A', description: 'D', impact: 'I', tradeoff: 'T' }, { optionKey: 'B', title: 'B', description: 'D', impact: 'I', tradeoff: 'T' }, { optionKey: 'C', title: 'C', description: 'D', impact: 'I', tradeoff: 'T' }] },
            ],
          },
        ],
      },
      {
        name: 'debug-region-b',
        displayName: 'Debug Region B',
        description: 'Second test region.',
        quests: [
          { name: 'Debug Quest B1', description: 'Quest B1.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(1) },
          { name: 'Debug Quest B2', description: 'Quest B2.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(2) },
        ],
      },
      {
        name: 'debug-region-c',
        displayName: 'Debug Region C',
        description: 'Third test region.',
        quests: [
          { name: 'Debug Quest C1', description: 'Quest C1.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(1) },
          { name: 'Debug Quest C2', description: 'Quest C2.', durationMinutes: 30, teamSize: 3, decisions: makeDecisions(2) },
        ],
      },
    ],
  };
}

function makeDecisions(seed: number): EventGenerationOutput['regions'][0]['quests'][0]['decisions'] {
  const opt = (key: 'A' | 'B' | 'C') => ({ optionKey: key, title: `Option ${key}`, description: 'Desc', impact: 'Impact', tradeoff: 'Tradeoff' });
  return [
    { decisionNumber: 1, title: `Decision 1 (${seed})`, context: 'Context', options: [opt('A'), opt('B'), opt('C')] },
    { decisionNumber: 2, title: `Decision 2 (${seed})`, context: 'Context', options: [opt('A'), opt('B'), opt('C')] },
    { decisionNumber: 3, title: `Decision 3 (${seed})`, context: 'Context', options: [opt('A'), opt('B'), opt('C')] },
  ];
}
