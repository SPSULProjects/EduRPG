// src/lib/services/log.service.ts
import { prisma } from "@/src/lib/db";
import { safePayload } from "@/src/lib/security/redact";

export type LogType =
  | "auth_success" | "auth_fail"
  | "sync_ok" | "sync_fail"
  | "policy_ack"
  | "job_create" | "job_assign" | "job_review" | "job_close"
  | "xp_grant"
  | "money_tx"
  | "rbac_deny";

export async function logEvent(
  type: LogType,
  actorId?: string | null,
  targetId?: string | null,
  payload?: unknown,
  requestId?: string,
) {
  const redacted = safePayload(payload);
  return prisma.systemLog.create({
    data: {
      type,
      actorId: actorId ?? undefined,
      targetId: targetId ?? undefined,
      payload: redacted as any,
      requestId,
    } as any,
  });
}

