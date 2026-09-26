import {query} from "@/lib/db";

export async function listAdminAudit(limit=150){
  const result=await query<{
    id:string;actor_id:string;action:string;resource_type:string;
    resource_id:string|null;created_at:Date;
  }>(
    `SELECT id,actor_id,action,resource_type,resource_id,created_at
     FROM admin_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [Math.max(1,Math.min(limit,500))],
  );
  return result.rows.map(row=>({
    id:row.id,actorId:row.actor_id,action:row.action,resourceType:row.resource_type,
    resourceId:row.resource_id,createdAt:row.created_at.toISOString(),
  }));
}

export async function listSecurityEvents(limit=150){
  const result=await query<{
    id:string;event_type:string;actor_type:string|null;actor_id:string|null;
    route:string|null;payload:Record<string,unknown>;created_at:Date;
  }>(
    `SELECT id,event_type,actor_type,actor_id,route,payload,created_at
     FROM security_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [Math.max(1,Math.min(limit,500))],
  );
  return result.rows.map(row=>({
    id:row.id,eventType:row.event_type,actorType:row.actor_type,actorId:row.actor_id,
    route:row.route,payload:row.payload,createdAt:row.created_at.toISOString(),
  }));
}
