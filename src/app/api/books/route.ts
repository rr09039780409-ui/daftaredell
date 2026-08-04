import { db } from "@/lib/db";
import { encrypt, hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const books = await db.book.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverColor: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(books);
  } catch (error) {
    console.error("GET /api/books error:", error);
    return NextResponse.json({ error: "خطا در دریافت کتاب‌ها" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) {
      return NextResponse.json({ error: "رمز ادمین تنظیم نشده" }, { status: 500 });
    }

    const inputHash = hashPassword(adminPassword);
    const storedHash = setting.value;
    try {
      const isValid = inputHash === storedHash;
      if (!isValid) {
        return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    const encryptedContent = encrypt(content);

    const book = await db.book.create({
      data: {
        title,
        author: author || "",
        categoryId: categoryId || null,
        description: description || "",
        content: encryptedContent,
        coverColor: coverColor || "#6366f1",
      },
    });

    return NextResponse.json({ id: book.id, message: "کتاب با موفقیت ایجاد شد" });
  } catch (error) {
    console.error("POST /api/books error:", error);
    return NextResponse.json({ error: "خطا در ایجاد کتاب" }, { status: 500 });
  }
}
