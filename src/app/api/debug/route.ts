import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.DATABASE_URL;
    const token = process.env.DATABASE_AUTH_TOKEN ? "SET" : "MISSING";
    
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url: url!, authToken: process.env.DATABASE_AUTH_TOKEN });
    
    let results: Record<string, string> = {};
    
    /* Ensure tables exist */
    await client.execute(`CREATE TABLE IF NOT EXISTS AppSetting (
      id TEXT NOT NULL DEFAULT 'singleton',
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    )`);
    await client.execute(`CREATE TABLE IF NOT EXISTS Announcement (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'general',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);
    
    /* Reset admin password */
    const crypto = await import("crypto");
    const hash = crypto.scryptSync("admin", "admin-salt", 64).toString("hex");
    await client.execute(`INSERT OR REPLACE INTO AppSetting (id, key, value) VALUES ('singleton', 'adminPassword', '${hash}')`);
    results.adminPassword = "RESET OK";

    /* Test encrypt */
    try {
      const key = crypto.scryptSync("bookshelf-secure-key-32byte!!", "bookshelf-salt", 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      let enc = cipher.update("test", "utf8", "hex");
      enc += cipher.final("hex");
      const tag = cipher.getAuthTag();
      results.encryptTest = "OK (len:" + (iv.toString("hex").length + tag.toString("hex").length + enc.length) + ")";
    } catch (e: unknown) {
      results.encryptTest = "ERR: " + (e instanceof Error ? e.message : String(e));
    }

    /* Test book insert */
    try {
      const testId = crypto.randomUUID();
      const testKey = crypto.scryptSync("bookshelf-secure-key-32byte!!", "bookshelf-salt", 32);
      const testIv = crypto.randomBytes(16);
      const testCipher = crypto.createCipheriv("aes-256-gcm", testKey, testIv);
      let testEnc = testCipher.update("محتوا تست", "utf8", "hex");
      testEnc += testCipher.final("hex");
      const testTag = testCipher.getAuthTag();
      const encrypted = testIv.toString("hex") + ":" + testTag.toString("hex") + ":" + testEnc;
      
      await client.execute({
        sql: `INSERT INTO Book (id, title, author, description, content, coverColor, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [testId, "کتاب تست", "نویسنده تست", "توضیحات تست", encrypted, "#6366f1", null, new Date().toISOString(), new Date().toISOString()]
      });
      
      /* Delete test book */
      await client.execute({ sql: `DELETE FROM Book WHERE id = ?`, args: [testId] });
      results.bookInsertTest = "OK";
    } catch (e: unknown) {
      results.bookInsertTest = "ERR: " + (e instanceof Error ? e.message : String(e));
    }

    /* Count */
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