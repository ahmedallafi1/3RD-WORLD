import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __thirdWorldPool: Pool | undefined;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function positiveInt(value:string|undefined,fallback:number){
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>0?parsed:fallback;
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!global.__thirdWorldPool) {
    global.__thirdWorldPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: positiveInt(process.env.DATABASE_POOL_MAX,10),
      connectionTimeoutMillis:positiveInt(process.env.DATABASE_CONNECT_TIMEOUT_MS,5000),
      idleTimeoutMillis:positiveInt(process.env.DATABASE_IDLE_TIMEOUT_MS,30000),
      statement_timeout:positiveInt(process.env.DATABASE_STATEMENT_TIMEOUT_MS,15000),
      query_timeout:positiveInt(process.env.DATABASE_QUERY_TIMEOUT_MS,20000),
      application_name:"3rd-world",
      ssl:
        process.env.DATABASE_SSL === "true"
          ? {
              rejectUnauthorized:
                process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
            }
          : undefined,
    });
  }

  return global.__thirdWorldPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
