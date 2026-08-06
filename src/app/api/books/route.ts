import { db, books, categories, eq, desc, count as count, sql } from "@/lib/db";
import { encrypt, decrypt, hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════
   Snippet extraction utility
   ═══════════════════════════════════════════════════════════════ */
const CONTEXT_LINES = 1;    /* lines before/after the match */
const MAX_SNIPPETS = 5;     /* per book */
const MAX_TOTAL = 40;       /* across all books */
const SNIPPET_MAX_CHARS = 200;

interface Snippet {
  text: string;
  lineIndex: number;
  matchStart: number;
  matchEnd: number;
}

interface SearchResult {
  book: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverColor: string;
    categoryId: string | null;
    category: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
  };
  snippets: Snippet[];
}

function extractSnippets(text: string, query: string): Snippet[] {
  const lines = text.split("\n");
  const lowerLines = lines.map((l) => l.toLowerCase());
  const snippets: Snippet[] = [];
  const matchedLines = new Set<number>();

  for (let i = 0; i < lowerLines.length; i++) {
    if (matchedLines.size >= MAX_SNIPPETS) break;
    const idx = lowerLines[i].indexOf(query);
    if (idx === -1) continue;

    /* Avoid duplicate context for adjacent matches */
    if (matchedLines.has(i)) continue;
    matchedLines.add(i);

    /* Build context window */
    const start = Math.max(0, i - CONTEXT_LINES);
    const end = Math.min(lines.length, i + CONTEXT_LINES + 1);
    const contextLines = lines.slice(start, end);
    let fullText = contextLines.join(" ");

    /* Trim to max chars */
    if (fullText.length > SNIPPET_MAX_CHARS) {
      /* Find the match position within the full text */
      let matchOffset = 0;
      for (let j = start; j < i; j++) {
        matchOffset += lines[j].length + 1; /* +1 for the space we joined with */
      }
      matchOffset += idx;

      /* Center the window around the match */
      const half = Math.floor(SNIPPET_MAX_CHARS / 2);
      let trimStart = Math.max(0, matchOffset - half);
      let trimEnd = Math.min(fullText.length, trimStart + SNIPPET_MAX_CHARS);
      if (trimEnd === fullText.length) {
        trimStart = Math.max(0, trimEnd - SNIPPET_MAX_CHARS);
      }

      const matchStart = matchOffset - trimStart;
      const matchEnd = matchStart + query.length;

      /* Adjust for ellipsis */
      const prefix = trimStart > 0 ? "..." : "";
      const suffix = trimEnd < fullText.length ? "..." : "";

      fullText = prefix + fullText.slice(trimStart, trimEnd) + suffix;
      const finalMatchStart = prefix.length + matchStart;
      const finalMatchEnd = prefix.length + matchEnd;

      snippets.push({
        text: fullText,
        lineIndex: i,
        matchStart: finalMatchStart,
        matchEnd: finalMatchEnd,
      });
    } else {
      /* Calculate match position within joined text */
      let matchOffset = 0;
      for (let j = start; j < i; j++) {
        matchOffset += lines[j].length + 1;
      }
      matchOffset += idx;

      snippets.push({
        text: fullText,
        lineIndex: i,
        matchStart: matchOffset,
        matchEnd: matchOffset + query.length,
      });
    }
  }

  return snippets;
}

export async function POST(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const body = await req.json();
    const { title, author, categoryId, description, content, coverColor, adminPassword } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "عنوان و محتوای کتاب الزامی است" },
        { status: 400 }
      );
    }

    if (!adminPassword) {
      return NextResponse.json({ error: "رمز ادمین الزامی است" }, { status: 401 });
    }

    const { createClient } = await import("@libsql/client");
    const client = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN });

    const crypto = await import("crypto");
    
    /* Verify admin password */
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });

    /* Encrypt content */
    const key = crypto.scryptSync("bookshelf-secure-key-32byte!!", "bookshelf-salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(content, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    const encryptedContent = iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;

    const now = new Date().toISOString();
    const bookId = crypto.randomUUID();

    await client.execute({
      sql: `INSERT INTO Book (id, title, author, description, content, coverColor, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [bookId, title, author || "", description || "", encryptedContent, coverColor || "#6366f1", categoryId || null, now, now]
    });

    return NextResponse.json({ id: bookId, message: "کتاب با موفقیت ایجاد شد" });
  } catch (error) {
    console.error("POST /api/books error:", error);
    return NextResponse.json({ error: "خطا در ایجاد کتاب", detail: String(error) }, { status: 500 });
  }
}


