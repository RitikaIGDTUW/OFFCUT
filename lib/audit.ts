import "server-only";
import { AuditLog } from "@/models/misc";
import type { SessionUser } from "./guards";

/** Records an admin mutation (who, what, before/after). Never throws — logging must not break the action. */
export async function audit(
  actor: SessionUser,
  action: string,
  entity: string,
  entityId?: string,
  before?: unknown,
  after?: unknown,
) {
  try {
    await AuditLog.create({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entity,
      entityId,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: after ? JSON.parse(JSON.stringify(after)) : undefined,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
