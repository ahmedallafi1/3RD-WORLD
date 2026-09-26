import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
});

const root = process.cwd();
const schema = await fs.readFile(path.join(root, "db", "schema.sql"), "utf8");
await pool.query(schema);

const migrationsDir = path.join(root, "db", "migrations");
const entries = (await fs.readdir(migrationsDir))
  .filter(name => name.endsWith(".sql"))
  .sort();

for (const entry of entries) {
  const sql = await fs.readFile(path.join(migrationsDir, entry), "utf8");
  await pool.query(sql);
  process.stdout.write(`applied ${entry}\n`);
}

await pool.end();
process.stdout.write("database ready\n");
