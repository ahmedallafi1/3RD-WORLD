import type { PoolClient } from "pg";

export async function writeAdminAudit(
  client: PoolClient,
  args: {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await client.query(
    `INSERT INTO admin_audit_log
       (actor_id, action, resource_type, resource_id, before, after)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      args.actorId,
      args.action,
      args.resourceType,
      args.resourceId ?? null,
      JSON.stringify(args.before ?? null),
      JSON.stringify(args.after ?? null),
    ],
  );
}
