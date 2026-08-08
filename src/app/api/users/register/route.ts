import { db, users, eq } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName } = await req.json();

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: "نام کاربری باید حداقل ۳ کاراکتر باشد" },
        { status: 400 }
      );
    }

    if (password.trim().length < 4) {
      return NextResponse.json(
        { error: "رمز عبور باید حداقل ۴ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "این نام کاربری قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.insert(users).values({
      id,
      username: username.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      displayName: displayName?.trim() || username.trim(),
      role: "user",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "ثبت‌نام با موفقیت انجام شد. منتظر تأیید مدیر باشید.",
    });
  } catch (error) {
    console.error("POST /api/users/register error:", error);
    return NextResponse.json(
      { error: "خطا در ثبت‌نام" },
      { status: 500 }
    );
  }
}
