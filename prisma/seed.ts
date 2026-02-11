import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  await prisma.user.deleteMany();
  await prisma.eventCode.deleteMany();
  await prisma.event.deleteMany();

  console.log('✅ Cleared existing data');

  // Create event
  const event = await prisma.event.create({
    data: {
      name: 'Smart City Hackathon March 2026',
      description: 'Applied AI and Smart City Solutions Hackathon',
      startDate: new Date('2026-03-15T09:00:00Z'),
      timezone: 'UTC',
      brandColor: '#0ea5e9',
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

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📝 Credentials:');
  console.log(`   Event Code: ${eventCode.code}`);
  console.log(`   Admin: ${adminEmail} / ${DEFAULT_ADMIN_PASSWORD}`);
  console.log(`   Organiser: ${organiserEmail} / ${DEFAULT_ORGANISER_PASSWORD}\n`);
  console.log('📊 Created:');
  console.log(`   1 Event: ${event.name}`);
  console.log(`   5 Districts (1 active, 4 locked)`);
  console.log(`   3 Quests (Arrival, Traffic Dilemma, Follow-up)\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
