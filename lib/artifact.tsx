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
      quest: true,
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

  if (!room.quest.decisionsData) {
    throw new Error('Quest has no decision data');
  }

  const decisionsData: DecisionData = JSON.parse(room.quest.decisionsData as string);
  
  // Build artifact data
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

