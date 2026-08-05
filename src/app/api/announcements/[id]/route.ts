import { db, announcements, appSettings, eq } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { adminGuard } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, type, active, adminPassword } = body;

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز اشتباه" }, { status: 403 });

    const updateData: Record<string, string | number> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (active !== undefined) updateData.active = active ? 1 : 0;
    updateData.updatedAt = new Date().toISOString();

    const [item] = await db
      .update(announcements)
      .set(updateData)
      .where(eq(announcements.id, id))
      .returning();

    return NextResponse.json(item);
  } catch (error) {
    console.error("PUT /api/announcements/[id] error:", error);
    return NextResponse.json({ error: "خطا در بروزرسانی" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = adminGuard();
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const body = await req.json();
    const { adminPassword } = body;

    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "adminPassword"))
      .limit(1);

    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز اشتباه" }, { status: 403 });

    await db.delete(announcements).where(eq(announcements.id, id));
    return NextResponse.json({ message: "اعلان حذف شد" });
  } catch (error) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json({ error: "خطا در حذف اعلان" }, { status: 500 });
  }
}