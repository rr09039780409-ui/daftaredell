import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  drizzleDb: ReturnType<typeof createDrizzleClient> | undefined;
};

function createDrizzleClient() {
  const url = process.env.DATABASE_URL!;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}

export const db = globalForDb.drizzleDb ?? createDrizzleClient();

if (process.env.NODE_ENV !== "production") globalForDb.drizzleDb = db;
