import { db, books, categories, appSettings, eq, desc, asc } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const pw = req.nextUrl.searchParams.get("pw");
    if (!pw) {
      return NextResponse.json({ error: "رمز ادمین الزامی است" }, { status: 401 });
    }

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) {
      return NextResponse.json({ error: "رمز ادمین تنظیم نشده" }, { status: 500 });
    }

    const inputHash = hashPassword(pw);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    const allBooks = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        description: books.description,
        content: books.content,
        coverColor: books.coverColor,
        categoryId: books.categoryId,
        categoryName: categories.name,
      })
      .from(books)
      .leftJoin(categories, eq(books.categoryId, categories.id))
      .orderBy(desc(books.createdAt));

    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name));

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: allCategories,
      books: allBooks.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        description: b.description,
        content: b.content,
        coverColor: b.coverColor,
        categoryName: b.categoryName || null,
      })),
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "خطا در ایجاد بکاپ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const pw = req.nextUrl.searchParams.get("pw");
    if (!pw) {
      return NextResponse.json({ error: "رمز ادمین الزامی است" }, { status: 401 });
    }

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) {
      return NextResponse.json({ error: "رمز ادمین تنظیم نشده" }, { status: 500 });
    }

    const inputHash = hashPassword(pw);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    const body = await req.json();
    const { categories: importedCats, books: importedBooks } = body;

    if (!importedBooks || !Array.isArray(importedBooks)) {
      return NextResponse.json({ error: "فرمت فایل نامعتبر است" }, { status: 400 });
    }

    let importedCount = 0;

    /* Import categories */
    if (importedCats && Array.isArray(importedCats)) {
      for (const cat of importedCats) {
        if (!cat.name) continue;
        try {
          const [existing] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.name, cat.name))
            .limit(1);

          if (!existing) {
            await db.insert(categories).values({
              id: cat.id || crypto.randomUUID(),
              name: cat.name,
              createdAt: cat.createdAt || new Date().toISOString(),
            });
          }
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
        const [cat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.name, book.categoryName))
          .limit(1);
        if (cat) categoryId = cat.id;
      }

      const [existing] = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.title, book.title))
        .limit(1);

      const now = new Date().toISOString();
      if (existing) {
        await db
          .update(books)
          .set({
            author: book.author || "",
            description: book.description || "",
            content: book.content,
            coverColor: book.coverColor || "#6366f1",
            categoryId,
            updatedAt: now,
          })
          .where(eq(books.id, existing.id));
      } else {
        await db.insert(books).values({
          id: crypto.randomUUID(),
          title: book.title,
          author: book.author || "",
          description: book.description || "",
          content: book.content,
          coverColor: book.coverColor || "#6366f1",
          categoryId,
          createdAt: now,
          updatedAt: now,
        });
      }
      importedCount++;
    }

    return NextResponse.json({
      message: `${importedCount} کتاب با موفقیت وارد شد`,
      count: importedCount,
    });
  } catch (error) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: "خطا در وارد کردن بکاپ" }, { status: 500 });
  }
}
