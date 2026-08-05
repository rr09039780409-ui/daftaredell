import { db } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "هر دو فیلد الزامی است" }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "رمز جدید باید حداقل ۴ کاراکتر باشد" }, { status: 400 });
    }

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) {
      return NextResponse.json({ error: "تنظیمات یافت نشد" }, { status: 500 });
    }

    const currentHash = hashPassword(currentPassword);
    if (currentHash !== setting.value) {
      return NextResponse.json({ error: "رمز فعلی اشتباه است" }, { status: 403 });
    }

    const newHash = hashPassword(newPassword);
    await db.appSetting.update({
      where: { key: "adminPassword" },
      data: { value: newHash },
    });

    return NextResponse.json({ message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (error) {
    console.error("POST /api/change-password error:", error);
    return NextResponse.json({ error: "خطا در تغییر رمز" }, { status: 500 });
  }
}
