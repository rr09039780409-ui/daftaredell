import { db } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

/* GET: all items (admin) or only active (public) */
export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.nextUrl.searchParams.get("admin") === "1";
    const pw = req.nextUrl.searchParams.get("pw");

    if (isAdmin && pw) {
      /* Admin mode: verify + return all */
      const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
      if (setting && hashPassword(pw) === setting.value) {
        const items = await db.announcement.findMany({
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(items);
      }
    }

    /* Public: only active — include content & date */
    const items = await db.announcement.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, type: true, createdAt: true },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ error: "خطا در دریافت اعلان‌ها" }, { status: 500 });
  }
}

/* POST: admin only */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, type, adminPassword } = body;

    if (!title) {
      return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 });
    }

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز اشتباه" }, { status: 403 });

    const announcement = await db.announcement.create({
      data: { title, content: content || "", type: type || "general", active: true },
    });
    return NextResponse.json(announcement);
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ error: "خطا در ایجاد اعلان" }, { status: 500 });
  }
}
