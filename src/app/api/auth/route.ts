import { db } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "رمز عبور الزامی است" }, { status: 400 });
    }

    let setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });

    if (!setting) {
      const hashed = hashPassword(password);
      setting = await db.appSetting.create({
        data: { key: "adminPassword", value: hashed },
      });
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
