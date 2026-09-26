import { withTransaction, query } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type {PassportTier} from "@/lib/world-engine/types";

export async function createCustomerAccount(args: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const email = args.email.trim().toLowerCase();
  const passwordHash = await hashPassword(args.password);

  return withTransaction(async (client) => {
    const existing = await client.query("SELECT id FROM customers WHERE email = $1", [email]);
    if (existing.rows[0]) throw new Error("An account already exists for this email.");

    const customer = await client.query<{ id: string }>(
      `INSERT INTO customers
       (email, first_name, last_name, passport_number)
       VALUES ($1,$2,$3,'TW-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)))
       RETURNING id`,
      [email, args.firstName?.trim() || null, args.lastName?.trim() || null],
    );

    await client.query(
      "INSERT INTO customer_credentials (customer_id, password_hash) VALUES ($1,$2)",
      [customer.rows[0].id, passwordHash],
    );
    await client.query(
      `INSERT INTO passport_profiles(customer_id,tier)
       VALUES($1,'MEMBER')
       ON CONFLICT(customer_id) DO NOTHING`,
      [customer.rows[0].id],
    );

    return customer.rows[0].id;
  });
}

export async function authenticateCustomer(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const result = await query<{ id: string; password_hash: string }>(
    `SELECT c.id, cr.password_hash
     FROM customers c
     JOIN customer_credentials cr ON cr.customer_id = c.id
     WHERE c.email = $1 AND c.status = 'ACTIVE'
     LIMIT 1`,
    [email],
  );
  const row = result.rows[0];
  if (!row) return null;
  return (await verifyPassword(password, row.password_hash)) ? row.id : null;
}

export async function getCustomerDashboard(customerId: string) {
  const [orders, credit, passport, worlds] = await Promise.all([
    query<{ count: string; total: string }>(
      `SELECT count(*)::text AS count,
              COALESCE(sum(grand_total_amount),0)::text AS total
       FROM orders
       WHERE customer_id = $1 AND status <> 'CANCELLED'`,
      [customerId],
    ),
    query<{ total: string }>(
      `SELECT COALESCE(sum(amount),0)::text AS total
       FROM store_credit_entries
       WHERE customer_id = $1 AND currency = 'USD'`,
      [customerId],
    ),
    query<{tier:PassportTier;joined_at:Date}>(
      `SELECT tier,joined_at
       FROM passport_profiles
       WHERE customer_id=$1
       LIMIT 1`,
      [customerId],
    ),
    query<{count:string}>(
      `SELECT count(*)::text AS count
       FROM passport_world_stamps
       WHERE customer_id=$1`,
      [customerId],
    ),
  ]);

  return {
    orderCount: Number(orders.rows[0]?.count ?? 0),
    lifetimeSpendAmount: Number(orders.rows[0]?.total ?? 0),
    storeCreditAmount: Number(credit.rows[0]?.total ?? 0),
    passportTier: passport.rows[0]?.tier??"MEMBER",
    passportJoinedAt: passport.rows[0]?.joined_at?.toISOString()??null,
    worldStampCount: Number(worlds.rows[0]?.count??0),
  };
}

export async function listCustomerWorldStamps(customerId:string){
  const result=await query<{
    code:string;
    slug:string;
    title:string;
    year:number|null;
    stamped_at:Date;
    source:string;
  }>(
    `SELECT w.code,w.slug,w.title,w.year,s.stamped_at,s.source
     FROM passport_world_stamps s
     JOIN worlds w ON w.id=s.world_id
     WHERE s.customer_id=$1
     ORDER BY s.stamped_at DESC`,
    [customerId],
  );
  return result.rows.map(row=>({
    code:row.code,
    slug:row.slug,
    title:row.title,
    year:row.year,
    stampedAt:row.stamped_at.toISOString(),
    source:row.source,
  }));
}
