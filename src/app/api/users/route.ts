import { db, users, eq } from "@/lib/db";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "خطا در دریافت کاربران" }, { status: 500 });
  }
}
