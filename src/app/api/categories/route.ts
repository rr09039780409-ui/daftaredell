import { db } from "@/lib/db";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { books: true } } },
    });
    return NextResponse.json(categories);
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

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) {
      return NextResponse.json({ error: "ابتدا وارد حساب ادمین شوید" }, { status: 401 });
    }

    const { hashPassword } = await import("@/lib/encryption");
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) {
      return NextResponse.json({ error: "رمز ادمین اشتباه است" }, { status: 403 });
    }

    const category = await db.category.create({ data: { name } });
    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("POST /api/categories error:", error);
    const msg = error instanceof Error && error.message?.includes("Unique")
      ? "این دسته‌بندی قبلا وجود دارد"
      : "خطا در ایجاد دسته‌بندی";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
