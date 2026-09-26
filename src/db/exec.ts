import sql from "mssql";
import { env } from "@/lib/env";

export type ProcParams = Record<string, string | number | boolean | Date | null | undefined>;

export class DomainError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

const DOMAIN_ERROR_MIN = 50000;

let pool: Promise<sql.ConnectionPool> | undefined;

function getPool() {
  pool ??= new sql.ConnectionPool({
    server: env().DB_HOST,
    port: env().DB_PORT,
    database: env().DB_NAME,
    user: env().DB_APP_USER,
    password: env().DB_APP_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 10, idleTimeoutMillis: 30000 },
  })
    .connect()
    .catch((e) => {
      pool = undefined;
      throw e;
    });
  return pool;
}

export async function execProc<T = Record<string, unknown>>(
  name: string,
  params: ProcParams = {},
): Promise<{ rows: T[]; sets: T[][]; output: Record<string, unknown> }> {
  const request = (await getPool()).request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value === undefined ? null : value);
  }
  try {
    const result = await request.execute<T>(`app.${name}`);
    return {
      rows: (result.recordset ?? []) as T[],
      sets: result.recordsets as unknown as T[][],
      output: result.output,
    };
  } catch (e) {
    const err = e as sql.RequestError;
    if (err.number && err.number >= DOMAIN_ERROR_MIN) {
      throw new DomainError(err.number, err.message);
    }
    throw e;
  }
}
