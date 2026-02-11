import { prisma } from './db';

export type AdminAuditPayload = {
  organiserId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
};

/** Log an admin/superadmin action for GDPR and audit. */
export async function logAdminAction(payload: AdminAuditPayload): Promise<void> {
  const { organiserId, action, resourceType, resourceId, details } = payload;
  try {
    await prisma.adminAuditLog.create({
      data: {
        organiserId,
        action,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (e) {
    console.error('Admin audit log failed:', e);
    // Don't throw – logging should not break the main action
  }
}
