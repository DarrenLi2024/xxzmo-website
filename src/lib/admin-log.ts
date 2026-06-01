import { prisma } from "@/lib/prisma";

interface AdminActionLogInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction(input: AdminActionLogInput): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        summary: input.summary,
        metadata: JSON.stringify(input.metadata || {}),
      },
    });
  } catch (error) {
    console.warn("[admin-log] failed to write action log", error);
  }
}
