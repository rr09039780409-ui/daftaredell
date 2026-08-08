import { db, announcements, appSettings, eq, desc } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

/* GET: all items (admin) or only active (public) */
export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.nextUrl.searchParams.get("admin") === "1";
    const pw = req.nextUrl.searchParams.get("pw");

    if (isAdmin && pw) {
      /* Admin mode: verify + return all */
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "adminPassword"))
        .limit(1);

      if (setting && hashPassword(pw) === setting.value) {
        const items = await db
          .select()
          .from(announcements)
          .orderBy(desc(announcements.createdAt));
        return NextResponse.json(items);
      }
    }

    /* Public: only active — include content & date */
    const items = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        type: announcements.type,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .where(eq(announcements.active, 1))
      .orderBy(desc(announcements.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ error: "خطا در دریافت اعلان‌ها" }, { status: 500 });
  }
}

/* POST: admin only */
export async function POST(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const body = await req.json();
    const { title, content, type, adminPassword } = body;

    if (!title) {
      return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 });
    }

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز اشتباه" }, { status: 403 });

    const now = new Date().toISOString();
    const [announcement] = await db
      .insert(announcements)
      .values({
        id: crypto.randomUUID(),
        title,
        content: content || "",
        type: type || "general",
        active: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ error: "خطا در ایجاد اعلان" }, { status: 500 });
  }
}
