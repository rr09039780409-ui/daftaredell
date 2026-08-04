import { db } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const pw = req.nextUrl.searchParams.get("pw");
    if (!pw) {
      return NextResponse.json({ error: "\u0631\u0645\u0632 \u0627\u062f\u0645\u06cc\u0646 \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a" }, { status: 401 });
    }

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) {
      return NextResponse.json({ error: "\u0631\u0645\u0632 \u0627\u062f\u0645\u06cc\u0646 \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647" }, { status: 500 });
    }

    const inputHash = hashPassword(pw);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "\u0631\u0645\u0632 \u0627\u062f\u0645\u06cc\u0646 \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0633\u062a" }, { status: 403 });
    }

    const books = await db.book.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    });

    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
    });

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories,
      books: books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        description: b.description,
        content: b.content,
        coverColor: b.coverColor,
        categoryName: b.category?.name || null,
      })),
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "\u062e\u0637\u0627 \u062f\u0631 \u0627\u06cc\u062c\u0627\u062f \u0628\u06a9\u0627\u067e" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const pw = req.nextUrl.searchParams.get("pw");
    if (!pw) {
      return NextResponse.json({ error: "\u0631\u0645\u0632 \u0627\u062f\u0645\u06cc\u0646 \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a" }, { status: 401 });
    }

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) {
      return NextResponse.json({ error: "\u0631\u0645\u0632 \u0627\u062f\u0645\u06cc\u0646 \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647" }, { status: 500 });
    }

    const inputHash = hashPassword(pw);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "\u0631\u0645\u0632 \u0627\u062f\u0645\u06cc\u0646 \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0633\u062a" }, { status: 403 });
    }

    const body = await req.json();
    const { categories: importedCats, books: importedBooks } = body;

    if (!importedBooks || !Array.isArray(importedBooks)) {
      return NextResponse.json({ error: "\u0641\u0631\u0645\u062a \u0641\u0627\u06cc\u0644 \u0646\u0627\u0645\u0639\u062a\u0628\u0631 \u0627\u0633\u062a" }, { status: 400 });
    }

    let importedCount = 0;

    /* Import categories */
    if (importedCats && Array.isArray(importedCats)) {
      for (const cat of importedCats) {
        if (!cat.name) continue;
        try {
          await db.category.upsert({
            where: { name: cat.name },
            update: {},
            create: { name: cat.name },
          });
        } catch {
          /* skip duplicates */
        }
      }
    }

    /* Import books */
    for (const book of importedBooks) {
      if (!book.title || !book.content) continue;

      let categoryId = null;
      if (book.categoryName) {
        const cat = await db.category.findUnique({ where: { name: book.categoryName } });
        if (cat) categoryId = cat.id;
      }

      const existing = await db.book.findFirst({ where: { title: book.title } });
      if (existing) {
        await db.book.update({
          where: { id: existing.id },
          data: {
            author: book.author || "",
            description: book.description || "",
            content: book.content,
            coverColor: book.coverColor || "#6366f1",
            categoryId,
          },
        });
      } else {
        await db.book.create({
          data: {
            title: book.title,
            author: book.author || "",
            description: book.description || "",
            content: book.content,
            coverColor: book.coverColor || "#6366f1",
            categoryId,
          },
        });
      }
      importedCount++;
    }

    return NextResponse.json({
      message: `${importedCount} \u06a9\u062a\u0627\u0628 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0648\u0627\u0631\u062f \u0634\u062f`,
      count: importedCount,
    });
  } catch (error) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: "\u062e\u0637\u0627 \u062f\u0631 \u0648\u0627\u0631\u062f \u06a9\u0631\u062f\u0646 \u0628\u06a9\u0627\u067e" }, { status: 500 });
  }
}
