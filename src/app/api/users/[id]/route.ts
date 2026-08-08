import { db, users, eq } from "@/lib/db";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "وضعیت نامعتبر" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        status: users.status,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "خطا در بروزرسانی" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!deleted) {
      return NextResponse.json(
        { error: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "خطا در حذف کاربر" },
      { status: 500 }
    );
  }
}
