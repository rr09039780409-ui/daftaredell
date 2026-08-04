import { db } from "@/lib/db";
import { decrypt, encrypt, hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const book = await db.book.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!book) {
      return NextResponse.json({ error: "کتاب یافت نشد" }, { status: 404 });
    }

    const decryptedContent = decrypt(book.content);

    return NextResponse.json({
      ...book,
      content: decryptedContent,
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

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
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

    const book = await db.book.update({
      where: { id },
      data: updateData,
    });

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

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) {
      return NextResponse.json({ error: "رمز ادمین تنظیم نشده" }, { status: 500 });
    }

    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    await db.book.delete({ where: { id } });

    return NextResponse.json({ message: "کتاب با موفقیت حذف شد" });
  } catch (error) {
    console.error("DELETE /api/books/[id] error:", error);
    return NextResponse.json({ error: "خطا در حذف کتاب" }, { status: 500 });
  }
}
