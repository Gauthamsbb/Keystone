'use server';

import { prisma } from '@/lib/prisma';

/** Write a row to admin_audit_logs. Fire-and-forget — never throws. */
export async function writeAuditLog(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any> | null,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        user_id: userId,
        action,
        table_name: tableName,
        record_id: recordId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: details as any ?? undefined,
      },
    });
  } catch (err) {
    console.error('[writeAuditLog] failed:', err);
  }
}
