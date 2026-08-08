import { db, categories, books, appSettings, eq, asc, sql, count } from "@/lib/db";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        createdAt: categories.createdAt,
        bookCount: count(books.id),
      })
      .from(categories)
      .leftJoin(books, eq(books.categoryId, categories.id))
      .groupBy(categories.id, categories.name, categories.createdAt)
      .orderBy(asc(categories.name));

    const result = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      _count: { books: Number(r.bookCount) },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "خطا در دریافت دسته‌بندی‌ها" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { name, adminPassword } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "نام دسته‌بندی الزامی است" }, { status: 400 });
    }

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) {
      return NextResponse.json({ error: "ابتدا وارد حساب ادمین شوید" }, { status: 401 });
    }

    const { hashPassword } = await import("@/lib/encryption");
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    const [category] = await db
      .insert(categories)
      .values({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() })
      .returning();

    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("POST /api/categories error:", error);
    const msg = error instanceof Error && error.message?.includes("UNIQUE")
      ? "این دسته‌بندی قبلا وجود دارد"
      : "خطا در ایجاد دسته‌بندی";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
