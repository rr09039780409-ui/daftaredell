import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    const token = process.env.DATABASE_AUTH_TOKEN ? "SET" : "MISSING";
    
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url: url!, authToken: process.env.DATABASE_AUTH_TOKEN });
    
    let results: Record<string, string> = {};
    
    /* Check and create AppSetting table */
    try {
      await client.execute(`CREATE TABLE IF NOT EXISTS AppSetting (
        id TEXT NOT NULL DEFAULT 'singleton',
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      )`);
      results.appSettingTable = "OK";
    } catch (e: unknown) {
      results.appSettingTable = "ERR: " + (e instanceof Error ? e.message : String(e));
    }
    
    /* Check and create Announcement table */
    try {
      await client.execute(`CREATE TABLE IF NOT EXISTS Announcement (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'general',
        active INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`);
      results.announcementTable = "OK";
    } catch (e: unknown) {
      results.announcementTable = "ERR: " + (e instanceof Error ? e.message : String(e));
    }
    
    /* Check and create Bookmark table */
    try {
      await client.execute(`CREATE TABLE IF NOT EXISTS Bookmark (
        id TEXT PRIMARY KEY,
        bookId TEXT NOT NULL,
        scrollY REAL NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`);
      results.bookmarkTable = "OK";
    } catch (e: unknown) {
      results.bookmarkTable = "ERR: " + (e instanceof Error ? e.message : String(e));
    }
    
    /* Reset admin password */
    try {
      const crypto = await import("crypto");
      const hash = crypto.scryptSync("admin", "admin-salt", 64).toString("hex");
      await client.execute(`INSERT OR REPLACE INTO AppSetting (id, key, value) VALUES ('singleton', 'adminPassword', '${hash}')`);
      results.adminPassword = "RESET to 'admin'";
    } catch (e: unknown) {
      results.adminPassword = "ERR: " + (e instanceof Error ? e.message : String(e));
    }
    
    /* Count tables */
    try {
      const cats = await client.execute("SELECT count(*) as c FROM Category");
      const books = await client.execute("SELECT count(*) as c FROM Book");
      results.categories = cats.rows[0].c + "";
      results.books = books.rows[0].c + "";
    } catch (e: unknown) {
      results.tableCheck = "ERR: " + (e instanceof Error ? e.message : String(e));
    }
    
    return NextResponse.json({ url, token, ...results });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}