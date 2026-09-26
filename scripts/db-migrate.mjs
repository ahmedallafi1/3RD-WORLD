import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({
  connectionString,
  max:1,
  connectionTimeoutMillis:Number(process.env.DATABASE_CONNECT_TIMEOUT_MS??5000),
  statement_timeout:Number(process.env.DATABASE_MIGRATION_TIMEOUT_MS??120000),
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
});

const root = process.cwd();
const schema = await fs.readFile(path.join(root, "db", "schema.sql"), "utf8");
await pool.query(schema);

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const migrationsDir = path.join(root, "db", "migrations");
const entries = (await fs.readdir(migrationsDir))
  .filter(name => name.endsWith(".sql"))
  .sort();

for (const entry of entries) {
  const sql = await fs.readFile(path.join(migrationsDir, entry), "utf8");
  const checksum=crypto.createHash("sha256").update(sql).digest("hex");
  const existing=await pool.query(
    "SELECT checksum FROM schema_migrations WHERE filename=$1 LIMIT 1",
    [entry],
  );

  if(existing.rows[0]){
    if(existing.rows[0].checksum!==checksum){
      throw new Error(`Migration changed after application: ${entry}`);
    }
    process.stdout.write(`skipped ${entry}\n`);
    continue;
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations(filename,checksum) VALUES($1,$2)",
      [entry,checksum],
    );
    await client.query("COMMIT");
    process.stdout.write(`applied ${entry}\n`);
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }finally{
    client.release();
  }
}

await pool.end();
process.stdout.write("database ready\n");
