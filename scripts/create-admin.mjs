import crypto from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(crypto.scrypt);

const [, , emailArg, passwordArg, nameArg = "3RD WORLD Owner", roleArg = "OWNER"] = process.argv;
const email = emailArg?.trim().toLowerCase();
const password = passwordArg;
const role = roleArg.toUpperCase();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!email || !password) {
  throw new Error("Usage: npm run admin:create -- email@example.com 'strong-password' 'Name' OWNER");
}
if (password.length < 10) throw new Error("Password must be at least 10 characters.");
if (!["OWNER","ADMIN","OPERATIONS","CONTENT","SUPPORT"].includes(role)) {
  throw new Error("Invalid role.");
}

const salt = crypto.randomBytes(16);
const derived = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
});

await pool.query(
  `INSERT INTO admin_users (email, name, password_hash, role)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (email)
   DO UPDATE SET name = EXCLUDED.name,
                 password_hash = EXCLUDED.password_hash,
                 role = EXCLUDED.role,
                 active = true,
                 updated_at = now()`,
  [email, nameArg, passwordHash, role],
);

await pool.end();
process.stdout.write(`admin ready: ${email} (${role})\n`);
