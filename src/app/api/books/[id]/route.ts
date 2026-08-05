import { db, books, categories, appSettings, eq } from "@/lib/db";
import { decrypt, encrypt, hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "کتاب یافت نشد" }, { status: 404 });
    }

    const decryptedContent = decrypt(book.content);

    let category: { id: string; name: string; createdAt: string } | null = null;
    if (book.categoryId) {
      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, book.categoryId))
        .limit(1);
      if (cat) category = { id: cat.id, name: cat.name, createdAt: cat.createdAt };
    }

    return NextResponse.json({
      id: book.id,
      title: book.title,
      author: book.author,
      categoryId: book.categoryId,
      description: book.description,
      content: decryptedContent,
      coverColor: book.coverColor,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      category,
    });
  } catch (error) {
    console.error("GET /api/books/[id] error:", error);
    return NextResponse.json({ error: "خطا در دریافت کتاب" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, author, categoryId, description, content, coverColor, adminPassword } = body;

    if (!adminPassword) {
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

    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    const updateData: Record<string, string | null> = {};
    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (description !== undefined) updateData.description = description;
    if (coverColor !== undefined) updateData.coverColor = coverColor;
    if (content !== undefined) updateData.content = encrypt(content);

    updateData.updatedAt = new Date().toISOString();

    const [book] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning({ id: books.id });

    return NextResponse.json({ id: book.id, message: "کتاب با موفقیت به‌روزرسانی شد" });
  } catch (error) {
    console.error("PUT /api/books/[id] error:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی کتاب" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const body = await req.json();
    const { adminPassword } = body;

    if (!adminPassword) {
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

    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    await db.delete(books).where(eq(books.id, id));

    return NextResponse.json({ message: "کتاب با موفقیت حذف شد" });
  } catch (error) {
    console.error("DELETE /api/books/[id] error:", error);
    return NextResponse.json({ error: "خطا در حذف کتاب" }, { status: 500 });
  }
}
