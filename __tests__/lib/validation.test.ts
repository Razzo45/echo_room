import {
  eventCodeSchema,
  profileSchema,
  joinRoomSchema,
  voteSchema,
  adminLoginSchema,
} from '@/lib/validation';

describe('validation schemas', () => {
  describe('eventCodeSchema', () => {
    it('accepts valid code and optional rememberMe', () => {
      expect(eventCodeSchema.parse({ code: 'ABC123' })).toEqual({ code: 'ABC123', rememberMe: false });
      expect(eventCodeSchema.parse({ code: 'xyz', rememberMe: true })).toEqual({ code: 'XYZ', rememberMe: true });
    });
    it('rejects empty code', () => {
      expect(() => eventCodeSchema.parse({ code: '' })).toThrow();
    });
    it('uppercases code', () => {
      expect(eventCodeSchema.parse({ code: 'abc' }).code).toBe('ABC');
    });
  });

  describe('profileSchema', () => {
    const valid = {
      name: 'Jane Doe',
      organisation: 'Acme',
      role: 'Lead',
      country: 'UK',
      skill: 'Design',
      curiosity: 'Sustainable cities',
    };
    it('accepts valid required fields', () => {
      expect(profileSchema.parse(valid)).toMatchObject(valid);
    });
    it('accepts optional headline and linkedinUrl', () => {
      expect(profileSchema.parse({ ...valid, headline: 'Designer', linkedinUrl: 'https://linkedin.com/in/jane' }))
        .toMatchObject({ headline: 'Designer', linkedinUrl: 'https://linkedin.com/in/jane' });
    });
    it('rejects short name', () => {
      expect(() => profileSchema.parse({ ...valid, name: 'A' })).toThrow();
    });
    it('rejects invalid URL', () => {
      expect(() => profileSchema.parse({ ...valid, linkedinUrl: 'not-a-url' })).toThrow();
    });
  });

  describe('joinRoomSchema', () => {
    it('accepts valid questId', () => {
      expect(joinRoomSchema.parse({ questId: 'quest-123' })).toEqual({ questId: 'quest-123' });
    });
    it('rejects empty questId', () => {
      expect(() => joinRoomSchema.parse({ questId: '' })).toThrow();
    });
  });

  describe('voteSchema', () => {
    it('accepts valid vote', () => {
      expect(voteSchema.parse({
        roomId: 'room-1',
        decisionNumber: 2,
        optionKey: 'B',
        justification: 'Because B is better',
      })).toEqual({
        roomId: 'room-1',
        decisionNumber: 2,
        optionKey: 'B',
        justification: 'Because B is better',
      });
    });
    it('rejects invalid optionKey', () => {
      expect(() => voteSchema.parse({
        roomId: 'r',
        decisionNumber: 1,
        optionKey: 'D',
        justification: 'x',
      })).toThrow();
    });
    it('rejects decisionNumber out of range', () => {
      expect(() => voteSchema.parse({
        roomId: 'r',
        decisionNumber: 4,
        optionKey: 'A',
        justification: 'x',
      })).toThrow();
    });
  });

  describe('adminLoginSchema', () => {
    it('accepts password only', () => {
      expect(adminLoginSchema.parse({ password: 'secret' })).toEqual({ password: 'secret' });
    });
    it('accepts email and password', () => {
      expect(adminLoginSchema.parse({ email: 'a@b.co', password: 's' })).toEqual({ email: 'a@b.co', password: 's' });
    });
    it('rejects empty password', () => {
      expect(() => adminLoginSchema.parse({ password: '' })).toThrow();
    });
  });
});
