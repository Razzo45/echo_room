import { prisma } from './db';

type DecisionData = {
  decisions: Array<{
    number: number;
    title: string;
    description: string;
    options: {
      [key: string]: {
        label: string;
        tradeoffs: string;
        risks: string[];
        outcomes: string[];
      };
    };
  }>;
};

export async function generateArtifact(roomId: string) {
  // Fetch room data with all related information
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      quest: {
        include: {
          decisions: {
            include: {
              options: {
                orderBy: { optionKey: 'asc' },
              },
            },
            orderBy: { decisionNumber: 'asc' },
          },
        },
      },
      members: {
        include: {
          user: true,
        },
      },
      votes: {
        include: {
          user: true,
        },
      },
      commits: {
        orderBy: {
          decisionNumber: 'asc',
        },
      },
    },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const storyState = room.storyState as any;

  // Story-runtime artifact path (new storytelling flow)
  if (storyState?.beats) {
    const teamMembers = room.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      organisation: m.user.organisation,
      role: m.user.role,
    }));
    const beatKeys = ['1', '2', '3'] as const;
    const beats = beatKeys
      .map((key) => {
        const beat = storyState.beats?.[key];
        if (!beat) return null;
        return {
          number: Number(key),
          submissions: beat.submissions || {},
          rolls: beat.rolls || {},
          consequence: beat.consequence || null,
        };
      })
      .filter(Boolean) as Array<{
      number: number;
      submissions: Record<string, string>;
      rolls: Record<string, { value: number; band: string }>;
      consequence: { text: string; mode: string } | null;
    }>;

    const teamAverage = Number(storyState?.scoreboard?.teamAverage ?? 0);
    const teamBand = String(storyState?.scoreboard?.teamBand ?? 'mixed');
    const finalText = String(storyState?.finalSynthesis?.text || '').trim();
    const finalSummary =
      finalText ||
      `The team closes with a ${teamBand.replace('_', ' ')} ending and a team score of ${teamAverage}/60.`;

    const narrativeHtml = generateStoryHTML(
      room.quest.name,
      teamMembers,
      beats,
      teamAverage,
      teamBand,
      finalSummary,
      room.completedAt || new Date()
    );

    return prisma.artifact.create({
      data: {
        roomId,
        htmlContent: narrativeHtml,
      },
    });
  }

  // Try to parse from deprecated decisionsData field first (for backward compatibility)
  let decisionsData: DecisionData | null = null;
  
  if (room.quest.decisionsData) {
    try {
      const parsed = JSON.parse(room.quest.decisionsData as string) as DecisionData;
      
      // Validate that we have all required decision data
      if (parsed.decisions && parsed.decisions.length > 0) {
        decisionsData = parsed;
      }
    } catch (e) {
      console.error('Failed to parse decisionsData for quest', room.quest.id, e);
      // Will rebuild from tables below
    }
  }
  
  // If decisionsData is missing or incomplete, build it from QuestDecision/QuestOption tables
  if (!decisionsData) {
    const decisions = room.quest.decisions || [];
    
    if (decisions.length === 0) {
      throw new Error('Quest has no decision data (neither JSON nor database records)');
    }
    
    decisionsData = {
      decisions: decisions.map((d) => ({
        number: d.decisionNumber,
        title: d.title,
        description: d.context || d.title,
        options: d.options.reduce((acc, opt) => {
          // Impact is structured as "Outcome sentence. Risk sentence." (LLM prompt).
          // Split on period/semicolon; first part = outcome, second = risk.
          const impactText = (opt.impact || '').trim();
          const impactParts = impactText.split(/[.;]\s+/).map((s) => s.trim()).filter(Boolean);
          const hasTwo = impactParts.length >= 2;
          const outcomes = hasTwo ? [impactParts[0]] : impactParts.length > 0 ? impactParts.slice(0, Math.ceil(impactParts.length / 2)) : [];
          const risks = hasTwo ? [impactParts[1]] : impactParts.length > 0 ? impactParts.slice(Math.ceil(impactParts.length / 2)) : [];
          acc[opt.optionKey as 'A' | 'B' | 'C'] = {
            label: opt.title,
            tradeoffs: opt.tradeoff || opt.description || '',
            risks,
            outcomes,
          };
          return acc;
        }, {} as Record<'A' | 'B' | 'C', any>),
      })),
    };
  }

  // At this point, decisionsData should never be null (we throw if we can't build it)
  if (!decisionsData) {
    throw new Error('Failed to build decision data');
  }

  // Legacy decision-map artifact path
  const teamMembers = room.members.map((m) => ({
    name: m.user.name,
    organisation: m.user.organisation,
    role: m.user.role,
  }));

  const decisions = decisionsData.decisions.map((decision) => {
    const commit = room.commits.find((c) => c.decisionNumber === decision.number);
    const decisionVotes = room.votes.filter((v) => v.decisionNumber === decision.number);
    
    if (!commit) {
      throw new Error(`Missing commit for decision ${decision.number}`);
    }

    const selectedOption = decision.options[commit.committedOption];
    const voteSummary = calculateVoteSummary(decisionVotes);

    return {
      number: decision.number,
      title: decision.title,
      selectedOption: commit.committedOption,
      selectedLabel: selectedOption.label,
      tradeoffs: selectedOption.tradeoffs,
      risks: selectedOption.risks,
      outcomes: selectedOption.outcomes,
      voteSummary,
      justifications: decisionVotes.map((v) => ({
        userName: v.user.name,
        option: v.optionKey,
        text: v.justification,
      })),
    };
  });

  // Generate HTML
  const htmlContent = generateHTML(
    room.quest.name,
    teamMembers,
    decisions,
    room.completedAt || new Date()
  );

  // Save artifact
  const artifact = await prisma.artifact.create({
    data: {
      roomId,
      htmlContent,
    },
  });

  return artifact;
}

function generateStoryHTML(
  scenarioName: string,
  teamMembers: Array<{ id: string; name: string; organisation: string; role: string }>,
  beats: Array<{
    number: number;
    submissions: Record<string, string>;
    rolls: Record<string, { value: number; band: string }>;
    consequence: { text: string; mode: string } | null;
  }>,
  teamAverage: number,
  teamBand: string,
  finalSummary: string,
  completedAt: Date
) {
  const framingByBand: Record<string, string> = {
    critical_success: 'shaped a breakthrough turning point',
    success: 'built strong momentum for the team',
    mixed: 'kept the team resilient through uncertainty',
    fail: 'helped stabilize the story under pressure',
    critical_fail: 'kept the team grounded and moving forward',
  };
  const baseFraming = framingByBand[teamBand] ?? framingByBand.mixed;

  const playerHighlights = teamMembers
    .map((member) => {
      const rollValues = beats
        .map((b) => b.rolls[member.id]?.value)
        .filter((v): v is number => typeof v === 'number');
      const best = rollValues.length ? Math.max(...rollValues) : 0;
      return `<li><strong>${member.name}</strong> ${baseFraming} with a best roll of <strong>${best}</strong>.</li>`;
    })
    .join('');

  const beatBlocks = beats
    .map((beat) => {
      const submissions = teamMembers
        .map((m) => {
          const action = beat.submissions[m.id] || 'No action recorded.';
          const roll = beat.rolls[m.id];
          return `<li><strong>${m.name}:</strong> ${action}${roll ? ` (Roll ${roll.value}, ${String(roll.band).replace('_', ' ')})` : ''}</li>`;
        })
        .join('');
      return `
        <section class="beat">
          <h3>Beat ${beat.number}</h3>
          <ul>${submissions}</ul>
          <p class="consequence"><strong>Consequence:</strong> ${beat.consequence?.text || 'No consequence text recorded.'}</p>
        </section>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaborative Story Artifact</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1f2937; background: #f8fafc; padding: 2rem; }
    .container { max-width: 980px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 2rem; }
    h1 { margin: 0 0 0.25rem; font-size: 2rem; }
    h2 { margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    .meta { color: #6b7280; margin-bottom: 1.25rem; }
    .score { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1rem; }
    .beat { background: #f9fafb; border-left: 4px solid #2563eb; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .consequence { margin-top: 0.75rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Collaborative Story Artifact</h1>
    <p class="meta">${scenarioName} · Completed ${completedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>
    <div class="score">
      <p><strong>Team average:</strong> ${teamAverage}/60</p>
      <p><strong>Team ending band:</strong> ${teamBand.replace('_', ' ')}</p>
      <p>${finalSummary}</p>
    </div>
    <h2>Player Highlights</h2>
    <ul>${playerHighlights}</ul>
    <h2>Story Beats</h2>
    ${beatBlocks}
  </div>
</body>
</html>
  `.trim();
}

function calculateVoteSummary(votes: Array<{ optionKey: string }>) {
  const counts = { A: 0, B: 0, C: 0 };
  votes.forEach((v) => {
    counts[v.optionKey as 'A' | 'B' | 'C']++;
  });
  
  const parts: string[] = [];
  if (counts.A > 0) parts.push(`${counts.A} chose A`);
  if (counts.B > 0) parts.push(`${counts.B} chose B`);
  if (counts.C > 0) parts.push(`${counts.C} chose C`);
  
  return parts.join(', ');
}

function generateHTML(
  questName: string,
  teamMembers: Array<{ name: string; organisation: string; role: string }>,
  decisions: any[],
  completedAt: Date
) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>City Decision Map</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; padding: 2rem; max-width: 900px; margin: 0 auto; background: #f9fafb; }
    .container { background: white; padding: 3rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header-with-image { display: flex; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 2px solid #e5e7eb; }
    .city-thumbnail { width: 100px; height: 100px; object-fit: cover; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0; }
    .header-content { flex: 1; }
    .location-badge { display: inline-block; margin-top: 0.5rem; font-size: 0.875rem; color: #2563eb; font-weight: 500; }
    h1 { font-size: 2rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; font-weight: 600; color: #374151; margin-top: 2rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; }
    h3 { font-size: 1.25rem; font-weight: 600; color: #4b5563; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    .subtitle { font-size: 1.125rem; color: #6b7280; margin-bottom: 0.5rem; }
    .timestamp { font-size: 0.875rem; color: #9ca3af; }
    .team-list { display: grid; gap: 0.75rem; margin-bottom: 2rem; }
    .team-member { padding: 0.75rem; background: #f3f4f6; border-radius: 0.375rem; }
    .team-member-name { font-weight: 600; color: #111827; }
    .team-member-details { font-size: 0.875rem; color: #6b7280; }
    .decision { margin-bottom: 2.5rem; padding: 1.5rem; background: #fafafa; border-left: 4px solid #3b82f6; border-radius: 0.375rem; }
    .decision-header { margin-bottom: 1rem; }
    .decision-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 0.25rem; }
    .decision-choice { font-size: 1rem; color: #3b82f6; font-weight: 500; }
    .vote-summary { font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem; }
    .section { margin-top: 1rem; }
    .section-title { font-size: 0.875rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .section-content { color: #4b5563; }
    ul { margin-left: 1.5rem; margin-top: 0.5rem; }
    li { margin-bottom: 0.375rem; }
    .justifications { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    .justification { margin-bottom: 0.75rem; padding: 0.5rem; background: white; border-radius: 0.25rem; }
    .justification-author { font-weight: 500; font-size: 0.875rem; color: #374151; }
    .justification-text { font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem; }
    @media print {
      body { background: #fff !important; padding: 0.5in !important; max-width: none !important; }
      .container { box-shadow: none !important; }
      .decision, .team-member, .header-with-image, .justification { page-break-inside: avoid !important; }
      h2 { page-break-after: avoid !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-with-image">
      <img src="/city-district.png" alt="City District" class="city-thumbnail" />
      <div class="header-content">
        <h1>City Decision Map</h1>
        <div class="subtitle">${questName}</div>
        <div class="location-badge">📍 City District - Smart City Pilot Zone</div>
      </div>
    </div>
    <div class="timestamp">Completed: ${completedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
    
    <h2>Team</h2>
    <div class="team-list">
      ${teamMembers.map((member) => `
        <div class="team-member">
          <div class="team-member-name">${member.name}</div>
          <div class="team-member-details">${member.role} at ${member.organisation}</div>
        </div>
      `).join('')}
    </div>
    
    <h2>Decisions & Outcomes</h2>
    ${decisions.map((decision) => `
      <div class="decision">
        <div class="decision-header">
          <div class="decision-title">Decision ${decision.number}: ${decision.title}</div>
          <div class="decision-choice">✓ Option ${decision.selectedOption}: ${decision.selectedLabel}</div>
          <div class="vote-summary">Team votes: ${decision.voteSummary}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Tradeoffs Accepted</div>
          <div class="section-content">${decision.tradeoffs}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Key Risks</div>
          <ul>
            ${decision.risks.map((risk: string) => `<li>${risk}</li>`).join('')}
          </ul>
        </div>
        
        <div class="section">
          <div class="section-title">Predicted Outcomes</div>
          <ul>
            ${decision.outcomes.map((outcome: string) => `<li>${outcome}</li>`).join('')}
          </ul>
        </div>
        
        <div class="justifications">
          <div class="section-title">Team Perspectives</div>
          ${decision.justifications.map((j: any) => `
            <div class="justification">
              <div class="justification-author">${j.userName} voted ${j.option}</div>
              <div class="justification-text">"${j.text}"</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `.trim();
}

