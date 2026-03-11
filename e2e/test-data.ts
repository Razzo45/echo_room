/**
 * Test credentials and codes from prisma/seed.ts.
 * Run `npm run prisma:seed` before E2E so these work.
 */
export const TEST = {
  eventCode: 'SMARTCITY26',
  organiser: {
    email: 'organiser@test.com',
    password: 'organiser2026',
  },
  /** Also valid: organiser@echo-room.local / organiser2026 */
  admin: {
    email: 'admin@echo-room.local',
    password: 'admin123',
  },
} as const;
