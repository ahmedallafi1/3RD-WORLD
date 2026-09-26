import { withTransaction, query } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

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
  const [orders, credit] = await Promise.all([
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
  ]);

  return {
    orderCount: Number(orders.rows[0]?.count ?? 0),
    lifetimeSpendAmount: Number(orders.rows[0]?.total ?? 0),
    storeCreditAmount: Number(credit.rows[0]?.total ?? 0),
  };
}
