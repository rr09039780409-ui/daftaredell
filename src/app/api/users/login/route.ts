import { db, users, eq } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    if (user.status === "pending") {
      return NextResponse.json(
        { error: "حساب شما هنوز توسط مدیر تأیید نشده است. لطفاً بعداً تلاش کنید." },
        { status: 403 }
      );
    }

    if (user.status === "rejected") {
      return NextResponse.json(
        { error: "حساب شما رد شده است. با مدیریت تماس بگیرید." },
        { status: 403 }
      );
    }

    const inputHash = hashPassword(password);
    if (inputHash !== user.passwordHash) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /api/users/login error:", error);
    return NextResponse.json(
      { error: "خطا در ورود" },
      { status: 500 }
    );
  }
}
