import { db, appSettings, eq } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "رمز عبور الزامی است" }, { status: 400 });
    }

    let [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) {
      const hashed = hashPassword(password);
      const [created] = await db
        .insert(appSettings)
        .values({ id: "singleton", key: "adminPassword", value: hashed })
        .returning();
      setting = created;
      return NextResponse.json({ success: true, message: "رمز ادمین تنظیم شد" });
    }

    const inputHash = hashPassword(password);
    if (inputHash === setting.value) {
      return NextResponse.json({ success: true, message: "ورود موفق" });
    }

    return NextResponse.json({ error: "رمز عبور اشتباه است" }, { status: 403 });
  } catch (error) {
    console.error("POST /api/auth error:", error);
    return NextResponse.json({ error: "خطا در احراز هویت" }, { status: 500 });
  }
}
