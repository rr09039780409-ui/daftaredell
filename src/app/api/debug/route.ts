import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    const token = process.env.DATABASE_AUTH_TOKEN ? "SET" : "MISSING";
    
    let dbTest = "not tried";
    try {
      const { createClient } = await import("@libsql/client");
      const { drizzle } = await import("drizzle-orm/libsql");
      const client = createClient({ url: url!, authToken: process.env.DATABASE_AUTH_TOKEN });
      const db = drizzle(client);
      const result = await db.run({ sql: "SELECT count(*) as c FROM Category" });
      dbTest = "OK: " + JSON.stringify(result);
    } catch (e: unknown) {
      dbTest = "ERR: " + (e instanceof Error ? e.message : String(e));
    }
    
    return NextResponse.json({ url, token, dbTest });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
