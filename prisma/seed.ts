import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getBadgeDefinition } from '../lib/badges';
import { generateArtifact } from '../lib/artifact';
import type { BadgeType } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ORGANISER_PASSWORD = 'organiser2026';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

const questDecisions = {
  decisions: [
    {
      number: 1,
      title: "Data Sources Allowed",
      description: "Choose what data your system can collect to analyze traffic patterns.",
      options: {
        A: {
          label: "Public sensors only",
          tradeoffs: "Limited data granularity but maximum privacy protection. May miss important patterns in individual vehicle behavior.",
          risks: ["Insufficient data for accurate predictions", "Competitor cities may gain advantage with richer datasets", "Public frustration if system doesn't improve traffic meaningfully"],
          outcomes: ["Public trust remains high", "System needs longer calibration period", "Conservative but defensible approach"]
        },
        B: {
          label: "Public sensors plus anonymised mobile network data",
          tradeoffs: "Better coverage and accuracy with managed privacy concerns. Requires strong anonymization protocols and public communication.",
          risks: ["Potential privacy concerns despite anonymization", "Technical complexity in data integration", "Need for robust security measures"],
          outcomes: ["Improved traffic prediction accuracy", "Balanced approach gains moderate public support", "Faster system optimization possible"]
        },
        C: {
          label: "Public sensors plus private partnerships for richer data",
          tradeoffs: "Maximum insights and system performance, but highest privacy scrutiny. Requires exceptional transparency and data governance.",
          risks: ["Significant public backlash potential", "Complex legal and ethical review needed", "Data breach could be catastrophic for trust"],
          outcomes: ["Best technical performance possible", "Innovation leadership position", "Requires intensive stakeholder management"]
        }
      }
    },
    {
      number: 2,
      title: "Deployment Zone First",
      description: "Decide where to pilot the system initially.",
      options: {
        A: {
          label: "City centre first",
          tradeoffs: "High visibility and impact, but most complex traffic patterns. Success here demonstrates capability.",
          risks: ["Failure highly visible and damaging", "Most difficult technical challenge as starting point", "High stakeholder pressure and scrutiny"],
          outcomes: ["Maximum political and media attention", "Clear demonstration of system value if successful", "Sets ambitious precedent"]
        },
        B: {
          label: "Suburbs first",
          tradeoffs: "Lower risk environment for learning, but less visible impact. Easier to iterate and improve.",
          risks: ["Lower public awareness of initiative", "City centre problems remain unaddressed longer", "May be seen as avoiding hard problems"],
          outcomes: ["Smoother implementation process", "Time to refine system before high-stakes deployment", "Builds confidence through early wins"]
        },
        C: {
          label: "Mixed pilot zones",
          tradeoffs: "Comprehensive data from diverse contexts, but dilutes resources and attention across multiple areas.",
          risks: ["Spread resources too thin", "Harder to attribute success or failure", "Complex coordination across zones"],
          outcomes: ["Holistic understanding of system performance", "Broader stakeholder engagement", "More generalizable findings"]
        }
      }
    },
    {
      number: 3,
      title: "Transparency Level",
      description: "Determine how much information to share publicly about the system.",
      options: {
        A: {
          label: "Full public dashboard and reporting",
          tradeoffs: "Maximum transparency builds trust but exposes all issues immediately. Requires robust data visualization and public communication.",
          risks: ["Every system hiccup becomes public news", "Misinterpretation of data by media or public", "Pressure to respond to every criticism"],
          outcomes: ["Strong foundation of public trust", "Citizen engagement and feedback", "Sets gold standard for open government"]
        },
        B: {
          label: "Limited public reporting with internal dashboards",
          tradeoffs: "Balanced approach allows learning while maintaining some transparency. Selective disclosure of successes and challenges.",
          risks: ["Accusations of lack of transparency", "Trust deficit compared to full openness", "Unclear criteria for what gets shared"],
          outcomes: ["Manageable public relations", "Room for internal iteration", "Moderate public confidence"]
        },
        C: {
          label: "Internal only reporting for first phase",
          tradeoffs: "Maximum flexibility to iterate and improve before public scrutiny. Risk of appearing secretive or evasive.",
          risks: ["Serious trust issues if discovered", "Missed opportunity for public engagement", "Harder to build support later"],
          outcomes: ["Unconstrained system optimization", "Possible public backlash", "Need for strong justification of approach"]
        }
      }
    }
  ]
};

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in reverse order of dependencies)
  await prisma.analyticsEvent.deleteMany();
  await prisma.questResponse.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.decisionCommit.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.questOption.deleteMany();
  await prisma.questDecision.deleteMany();
  await prisma.questField.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.region.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.user.deleteMany();
  await prisma.eventCode.deleteMany();
  await prisma.event.deleteMany();

  console.log('✅ Cleared existing data');

  // Organiser who will own the event (so they can view it in the dashboard)
  const testOrganiserEmail = 'organiser@test.com';
  let organiser = await prisma.organiser.findUnique({ where: { email: testOrganiserEmail } });
  if (!organiser) {
    organiser = await prisma.organiser.create({
      data: {
        email: testOrganiserEmail,
        name: 'Test Organiser',
        passwordHash: await bcrypt.hash(DEFAULT_ORGANISER_PASSWORD, 10),
        role: 'ORGANISER',
      },
    });
    console.log('✅ Created organiser:', testOrganiserEmail);
  }

  // Create event (associated to organiser@test.com)
  const event = await prisma.event.create({
    data: {
      name: 'Smart City Hackathon March 2026',
      description: 'Applied AI and Smart City Solutions Hackathon',
      startDate: new Date('2026-03-15T09:00:00Z'),
      timezone: 'UTC',
      brandColor: '#0ea5e9',
      organiserId: organiser.id,
    },
  });

  console.log(`✅ Created event: ${event.name}`);

  // Create event code
  const eventCode = await prisma.eventCode.create({
    data: {
      code: 'SMARTCITY26',
      eventId: event.id,
      active: true,
      maxUses: 1000,
    },
  });

  console.log(`✅ Created event code: ${eventCode.code}`);

  // Create regions (districts)
  const regions = await Promise.all([
    prisma.region.create({
      data: {
        eventId: event.id,
        name: 'city-district',
        displayName: 'City District',
        description: 'Smart City Pilot Zone',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.region.create({
      data: {
        eventId: event.id,
        name: 'factory-hub',
        displayName: 'Factory Hub',
        description: 'Unlocks later in 2026',
        isActive: false,
        sortOrder: 2,
      },
    }),
    prisma.region.create({
      data: {
        eventId: event.id,
        name: 'campus-zone',
        displayName: 'Campus Zone',
        description: 'Unlocks later in 2026',
        isActive: false,
        sortOrder: 3,
      },
    }),
    prisma.region.create({
      data: {
        eventId: event.id,
        name: 'policy-hall',
        displayName: 'Policy Hall',
        description: 'Unlocks later in 2026',
        isActive: false,
        sortOrder: 4,
      },
    }),
    prisma.region.create({
      data: {
        eventId: event.id,
        name: 'border-port',
        displayName: 'Border Port',
        description: 'Unlocks later in 2026',
        isActive: false,
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${regions.length} regions`);

  const cityDistrict = regions.find((r) => r.name === 'city-district')!;

  // Quest 1: Arrival and Intent (FORM type)
  const quest1 = await prisma.quest.create({
    data: {
      regionId: cityDistrict.id,
      name: 'Arrival and Intent',
      description: 'Help us understand what brings you here and what you hope to achieve',
      questType: 'FORM',
      durationMinutes: 5,
      teamSize: 1,
      sortOrder: 1,
      isActive: true,
    },
  });

  // Quest 1 Fields
  await prisma.questField.createMany({
    data: [
      {
        questId: quest1.id,
        fieldKey: 'problem_focus',
        label: 'What are you here to solve?',
        fieldType: 'SELECT',
        required: true,
        options: JSON.stringify([
          'Traffic congestion and mobility',
          'Energy efficiency and sustainability',
          'Public safety and emergency response',
          'Waste management and recycling',
          'Air quality monitoring',
          'Water resource management',
          'Urban planning and development',
          'Citizen engagement and services'
        ]),
        sortOrder: 1,
      },
      {
        questId: quest1.id,
        fieldKey: 'want_to_meet',
        label: 'Who do you want to meet?',
        fieldType: 'SELECT',
        required: true,
        options: JSON.stringify([
          'City officials and policymakers',
          'Technology providers and vendors',
          'Other innovators and entrepreneurs',
          'Academic researchers',
          'Community organizers',
          'Investors and funders',
          'Data scientists and engineers',
          'Urban planners and architects'
        ]),
        sortOrder: 2,
      },
      {
        questId: quest1.id,
        fieldKey: 'one_sentence_goal',
        label: 'What is your one-sentence goal for this event?',
        fieldType: 'TEXTAREA',
        placeholder: 'In one sentence, what do you want to accomplish here?',
        required: true,
        sortOrder: 3,
      },
    ],
  });

  console.log(`✅ Created quest: ${quest1.name} with ${3} fields`);

  // Quest 2: The City Traffic Dilemma (DECISION_ROOM type)
  const quest2 = await prisma.quest.create({
    data: {
      regionId: cityDistrict.id,
      name: 'The City Traffic Dilemma',
      description: 'Your team is tasked with implementing a smart traffic management system. Navigate the technical, ethical, and political challenges.',
      questType: 'DECISION_ROOM',
      durationMinutes: 25,
      teamSize: 3,
      sortOrder: 2,
      isActive: true,
      decisionsData: JSON.stringify(questDecisions), // Keep for backward compatibility
    },
  });

  // Quest 2 Decisions
  const decision1 = await prisma.questDecision.create({
    data: {
      questId: quest2.id,
      decisionNumber: 1,
      title: 'Data Sources Allowed',
      context: 'Choose what data your system can collect to analyze traffic patterns.',
      sortOrder: 1,
    },
  });

  await prisma.questOption.createMany({
    data: [
      {
        decisionId: decision1.id,
        optionKey: 'A',
        title: 'Public sensors only',
        description: 'Limited data granularity but maximum privacy protection',
        tradeoff: 'Limited data granularity but maximum privacy protection. May miss important patterns in individual vehicle behavior.',
        impact: 'Public trust remains high. System needs longer calibration period. Conservative but defensible approach.',
      },
      {
        decisionId: decision1.id,
        optionKey: 'B',
        title: 'Public sensors plus anonymised mobile network data',
        description: 'Better coverage and accuracy with managed privacy concerns',
        tradeoff: 'Better coverage and accuracy with managed privacy concerns. Requires strong anonymization protocols and public communication.',
        impact: 'Improved traffic prediction accuracy. Balanced approach gains moderate public support. Faster system optimization possible.',
      },
      {
        decisionId: decision1.id,
        optionKey: 'C',
        title: 'Public sensors plus private partnerships for richer data',
        description: 'Maximum insights but highest privacy scrutiny',
        tradeoff: 'Maximum insights and system performance, but highest privacy scrutiny. Requires exceptional transparency and data governance.',
        impact: 'Best technical performance possible. Innovation leadership position. Requires intensive stakeholder management.',
      },
    ],
  });

  const decision2 = await prisma.questDecision.create({
    data: {
      questId: quest2.id,
      decisionNumber: 2,
      title: 'Deployment Zone First',
      context: 'Decide where to pilot the system initially.',
      sortOrder: 2,
    },
  });

  await prisma.questOption.createMany({
    data: [
      {
        decisionId: decision2.id,
        optionKey: 'A',
        title: 'City centre first',
        description: 'High visibility and impact, most complex patterns',
        tradeoff: 'High visibility and impact, but most complex traffic patterns. Success here demonstrates capability.',
        impact: 'Maximum political and media attention. Clear demonstration of system value if successful. Sets ambitious precedent.',
      },
      {
        decisionId: decision2.id,
        optionKey: 'B',
        title: 'Suburbs first',
        description: 'Lower risk environment for learning',
        tradeoff: 'Lower risk environment for learning, but less visible impact. Easier to iterate and improve.',
        impact: 'Smoother implementation process. Time to refine system before high-stakes deployment. Builds confidence through early wins.',
      },
      {
        decisionId: decision2.id,
        optionKey: 'C',
        title: 'Mixed pilot zones',
        description: 'Comprehensive data from diverse contexts',
        tradeoff: 'Comprehensive data from diverse contexts, but dilutes resources and attention across multiple areas.',
        impact: 'Holistic understanding of system performance. Broader stakeholder engagement. More generalizable findings.',
      },
    ],
  });

  const decision3 = await prisma.questDecision.create({
    data: {
      questId: quest2.id,
      decisionNumber: 3,
      title: 'Transparency Level',
      context: 'Determine how much information to share publicly about the system.',
      sortOrder: 3,
    },
  });

  await prisma.questOption.createMany({
    data: [
      {
        decisionId: decision3.id,
        optionKey: 'A',
        title: 'Full public dashboard and reporting',
        description: 'Maximum transparency builds trust',
        tradeoff: 'Maximum transparency builds trust but exposes all issues immediately. Requires robust data visualization and public communication.',
        impact: 'Strong foundation of public trust. Citizen engagement and feedback. Sets gold standard for open government.',
      },
      {
        decisionId: decision3.id,
        optionKey: 'B',
        title: 'Limited public reporting with internal dashboards',
        description: 'Balanced approach allows learning while maintaining transparency',
        tradeoff: 'Balanced approach allows learning while maintaining some transparency. Selective disclosure of successes and challenges.',
        impact: 'Manageable public relations. Room for internal iteration. Moderate public confidence.',
      },
      {
        decisionId: decision3.id,
        optionKey: 'C',
        title: 'Internal only reporting for first phase',
        description: 'Maximum flexibility to iterate before public scrutiny',
        tradeoff: 'Maximum flexibility to iterate and improve before public scrutiny. Risk of appearing secretive or evasive.',
        impact: 'Unconstrained system optimization. Possible public backlash. Need for strong justification of approach.',
      },
    ],
  });

  console.log(`✅ Created quest: ${quest2.name} with 3 decisions`);

  // Quest 3: Follow-up Plan (FORM type)
  const quest3 = await prisma.quest.create({
    data: {
      regionId: cityDistrict.id,
      name: 'Follow-up Plan',
      description: 'What actions will you take after the event?',
      questType: 'FORM',
      durationMinutes: 5,
      teamSize: 1,
      sortOrder: 3,
      isActive: true,
    },
  });

  // Quest 3 Fields
  await prisma.questField.createMany({
    data: [
      {
        questId: quest3.id,
        fieldKey: 'action_1',
        label: 'First action you will take',
        fieldType: 'SELECT',
        required: true,
        options: JSON.stringify([
          'Schedule follow-up meeting with team',
          'Create detailed project proposal',
          'Research potential technology partners',
          'Develop proof of concept',
          'Apply for funding or grants',
          'Conduct user research',
          'Build MVP or prototype',
          'Present to stakeholders'
        ]),
        sortOrder: 1,
      },
      {
        questId: quest3.id,
        fieldKey: 'action_2',
        label: 'Second action you will take',
        fieldType: 'SELECT',
        required: true,
        options: JSON.stringify([
          'Schedule follow-up meeting with team',
          'Create detailed project proposal',
          'Research potential technology partners',
          'Develop proof of concept',
          'Apply for funding or grants',
          'Conduct user research',
          'Build MVP or prototype',
          'Present to stakeholders'
        ]),
        sortOrder: 2,
      },
      {
        questId: quest3.id,
        fieldKey: 'contact_person',
        label: 'One person you will contact',
        fieldType: 'TEXT',
        placeholder: 'Name or role of person you will reach out to',
        required: true,
        sortOrder: 3,
      },
      {
        questId: quest3.id,
        fieldKey: 'contact_reason',
        label: 'Why are you contacting them?',
        fieldType: 'TEXTAREA',
        placeholder: 'What do you hope to achieve by contacting this person?',
        required: true,
        sortOrder: 4,
      },
    ],
  });

  console.log(`✅ Created quest: ${quest3.name} with ${4} fields`);

  // Seed badge definitions (required for UserBadges and organiser insights)
  const badgeTypes: BadgeType[] = [
    'FIRST_CHAPTER', 'NATURAL_TWENTY', 'FUMBLE', 'HOT_STREAK', 'RISING_PHOENIX',
    'UNITED_FRONT', 'SEASONED_ADVENTURER', 'SOCIAL_BUTTERFLY', 'ARTIFACT_COLLECTOR',
    'LEGENDARY_CAMPAIGN',
  ];
  for (const badgeType of badgeTypes) {
    const def = getBadgeDefinition(badgeType);
    await prisma.badge.upsert({
      where: { badgeType },
      update: { name: def.name, description: def.description, icon: def.icon, rarity: def.rarity },
      create: { badgeType, name: def.name, description: def.description, icon: def.icon, rarity: def.rarity },
    });
  }
  console.log(`✅ Seeded ${badgeTypes.length} badge definitions`);

  // Create default organiser and admin accounts so login works without env vars
  const organiserEmail = 'organiser@echo-room.local';
  const adminEmail = 'admin@echo-room.local';

  if (!(await prisma.organiser.findUnique({ where: { email: organiserEmail } }))) {
    await prisma.organiser.create({
      data: {
        email: organiserEmail,
        name: 'Default Organiser',
        passwordHash: await bcrypt.hash(DEFAULT_ORGANISER_PASSWORD, 10),
        role: 'ORGANISER',
      },
    });
    console.log('✅ Created default organiser:', organiserEmail);
  }

  if (!(await prisma.organiser.findUnique({ where: { email: adminEmail } }))) {
    await prisma.organiser.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Created default admin:', adminEmail);
  }

  // --- Mock usage data for UI: users, finished rooms, artifacts, badges ---
  const mockUsers = [
    { name: 'Alex Chen', organisation: 'City Labs', role: 'Product Manager', country: 'Singapore', skill: 'Strategy', curiosity: 'Mobility' },
    { name: 'Samira Khan', organisation: 'DataFlow', role: 'Data Scientist', country: 'India', skill: 'Analytics', curiosity: 'Sustainability' },
    { name: 'Jordan Lee', organisation: 'UrbanTech', role: 'Engineer', country: 'South Korea', skill: 'Backend', curiosity: 'Smart grids' },
    { name: 'Morgan Taylor', organisation: 'Civic Hub', role: 'Designer', country: 'UK', skill: 'UX', curiosity: 'Citizen engagement' },
    { name: 'Riley O\'Brien', organisation: 'Green City', role: 'Policy Analyst', country: 'Ireland', skill: 'Research', curiosity: 'Energy' },
    { name: 'Yuki Tanaka', organisation: 'Tokyo Mobility', role: 'Developer', country: 'Japan', skill: 'Frontend', curiosity: 'Traffic' },
    { name: 'Elena Vasquez', organisation: 'Madrid Innovation', role: 'Project Lead', country: 'Spain', skill: 'Leadership', curiosity: 'Safety' },
    { name: 'Omar Hassan', organisation: 'Cairo Digital', role: 'Architect', country: 'Egypt', skill: 'Systems', curiosity: 'Water' },
    { name: 'Zara Williams', organisation: 'Melbourne Gov', role: 'Consultant', country: 'Australia', skill: 'Strategy', curiosity: 'Waste' },
    { name: 'Lucas Berg', organisation: 'Stockholm Smart', role: 'Engineer', country: 'Sweden', skill: 'IoT', curiosity: 'Air quality' },
    { name: 'Priya Patel', organisation: 'Mumbai Tech', role: 'Data Analyst', country: 'India', skill: 'Data', curiosity: 'Transport' },
    { name: 'Felix Mueller', organisation: 'Berlin Labs', role: 'Developer', country: 'Germany', skill: 'Full-stack', curiosity: 'Mobility' },
    { name: 'Nadia Kowalski', organisation: 'Warsaw City', role: 'Designer', country: 'Poland', skill: 'Service design', curiosity: 'Housing' },
    { name: 'James Okonkwo', organisation: 'Lagos Smart', role: 'Engineer', country: 'Nigeria', skill: 'Backend', curiosity: 'Energy' },
    { name: 'Sofia Rossi', organisation: 'Milan Innovation', role: 'PM', country: 'Italy', skill: 'Product', curiosity: 'Tourism' },
  ];

  const createdUsers = await Promise.all(
    mockUsers.map((u) =>
      prisma.user.create({
        data: {
          eventId: event.id,
          name: u.name,
          organisation: u.organisation,
          role: u.role,
          country: u.country,
          skill: u.skill,
          curiosity: u.curiosity,
          isDiscoverable: Math.random() > 0.3,
        },
      })
    )
  );
  console.log(`✅ Created ${createdUsers.length} mock participants`);

  // Completed rooms (quest2 = The City Traffic Dilemma) with 3 members each, votes, commits, artifacts
  const roomCodes = ['MOCK-A1', 'MOCK-A2', 'MOCK-A3', 'MOCK-A4', 'MOCK-A5'];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  for (let i = 0; i < roomCodes.length; i++) {
    const roomCode = roomCodes[i];
    const memberStart = i * 3;
    const roomUsers = createdUsers.slice(memberStart, memberStart + 3);
    if (roomUsers.length < 3) break;

    const startedAt = new Date(oneHourAgo.getTime() + i * 10 * 60 * 1000);
    const completedAt = new Date(startedAt.getTime() + 20 * 60 * 1000);

    const room = await prisma.room.create({
      data: {
        eventId: event.id,
        questId: quest2.id,
        roomCode,
        status: 'COMPLETED',
        currentDecision: 4,
        startedAt,
        completedAt,
        lastActivityAt: completedAt,
        closedAt: completedAt,
      },
    });

    for (const u of roomUsers) {
      await prisma.roomMember.create({
        data: { roomId: room.id, userId: u.id, completedAt },
      });
    }

    const optionsByDecision: Record<number, string> = { 1: 'B', 2: 'A', 3: 'B' };
    for (let d = 1; d <= 3; d++) {
      const committed = optionsByDecision[d];
      await prisma.decisionCommit.create({
        data: { roomId: room.id, decisionNumber: d, committedOption: committed },
      });
      for (const u of roomUsers) {
        await prisma.vote.create({
          data: {
            roomId: room.id,
            userId: u.id,
            decisionNumber: d,
            optionKey: committed,
            justification: `Mock justification from ${u.name} for decision ${d}. We chose this for balance and impact.`,
          },
        });
      }
    }

    // Use real artifact generator so mock artifacts match the City Decision Map layout (PDF/HTML)
    await generateArtifact(room.id);
  }
  console.log(`✅ Created ${roomCodes.length} completed rooms with artifacts`);

  // Two open/in-progress rooms for UI variety
  const openRoom = await prisma.room.create({
    data: {
      eventId: event.id,
      questId: quest2.id,
      roomCode: 'MOCK-OPEN',
      status: 'OPEN',
      lastActivityAt: now,
    },
  });
  await prisma.roomMember.create({
    data: { roomId: openRoom.id, userId: createdUsers[14].id },
  });

  const inProgressRoom = await prisma.room.create({
    data: {
      eventId: event.id,
      questId: quest2.id,
      roomCode: 'MOCK-LIVE',
      status: 'IN_PROGRESS',
      currentDecision: 2,
      startedAt: new Date(now.getTime() - 15 * 60 * 1000),
      lastActivityAt: now,
    },
  });
  for (const u of createdUsers.slice(12, 15)) {
    await prisma.roomMember.create({ data: { roomId: inProgressRoom.id, userId: u.id } });
  }
  await prisma.decisionCommit.create({
    data: { roomId: inProgressRoom.id, decisionNumber: 1, committedOption: 'A' },
  });
  for (const u of createdUsers.slice(12, 15)) {
    await prisma.vote.create({
      data: { roomId: inProgressRoom.id, userId: u.id, decisionNumber: 1, optionKey: 'A', justification: 'Mock vote for decision 1.' },
    });
  }
  console.log('✅ Created 1 OPEN and 1 IN_PROGRESS room');

  // User badges for a subset of participants (so badge stats and profile show something)
  const badgeRecords = await prisma.badge.findMany({ where: {} });
  const firstChapterBadge = badgeRecords.find((b) => b.badgeType === 'FIRST_CHAPTER');
  const natTwentyBadge = badgeRecords.find((b) => b.badgeType === 'NATURAL_TWENTY');
  const fumbleBadge = badgeRecords.find((b) => b.badgeType === 'FUMBLE');
  const completedRooms = await prisma.room.findMany({ where: { eventId: event.id, status: 'COMPLETED' }, select: { id: true } });
  if (firstChapterBadge && natTwentyBadge && fumbleBadge && completedRooms.length > 0) {
    for (let i = 0; i < Math.min(createdUsers.length, 12); i++) {
      const user = createdUsers[i];
      const room = completedRooms[i % completedRooms.length];
      const data: { userId: string; badgeId: string; roomId: string }[] = [
        { userId: user.id, badgeId: firstChapterBadge.id, roomId: room.id },
      ];
      if (i % 3 === 0) data.push({ userId: user.id, badgeId: natTwentyBadge.id, roomId: room.id });
      if (i % 5 === 0) data.push({ userId: user.id, badgeId: fumbleBadge.id, roomId: room.id });
      await prisma.userBadge.createMany({ data, skipDuplicates: true });
    }
    console.log('✅ Awarded mock badges to participants');
  }

  // Optional: archived artifacts (organiser insights)
  await prisma.eventArtifactArchive.createMany({
    data: [
      { eventId: event.id, roomCode: 'LEGACY-1', questName: 'The City Traffic Dilemma', htmlContent: '<!DOCTYPE html><html><body><h1>Archived room LEGACY-1</h1><p>Historical decision map.</p></body></html>' },
      { eventId: event.id, roomCode: 'LEGACY-2', questName: 'The City Traffic Dilemma', htmlContent: '<!DOCTYPE html><html><body><h1>Archived room LEGACY-2</h1><p>Historical decision map.</p></body></html>' },
    ],
  });
  console.log('✅ Created 2 archived artifact records');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📝 Credentials:');
  console.log(`   Event Code: ${eventCode.code}`);
  console.log(`   Event owner (view in dashboard): ${testOrganiserEmail} / ${DEFAULT_ORGANISER_PASSWORD}`);
  console.log(`   Admin: ${adminEmail} / ${DEFAULT_ADMIN_PASSWORD}`);
  console.log(`   Organiser: ${organiserEmail} / ${DEFAULT_ORGANISER_PASSWORD}\n`);
  console.log('📊 Created:');
  console.log(`   1 Event: ${event.name}`);
  console.log(`   5 Districts (1 active, 4 locked)`);
  console.log(`   3 Quests (Arrival, Traffic Dilemma, Follow-up)`);
  console.log(`   ${createdUsers.length} mock participants, ${roomCodes.length + 2} rooms (${roomCodes.length} completed with artifacts), badges & archives\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
