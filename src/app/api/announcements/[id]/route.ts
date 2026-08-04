import { db } from "@/lib/db";
import { hashPassword } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, type, active, adminPassword } = body;

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز اشتباه" }, { status: 403 });

    const updateData: Record<string, string | boolean> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (active !== undefined) updateData.active = active;

    const item = await db.announcement.update({
      where: { id },
      data: updateData,
    });
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
  try {
    const { id } = await params;
    const body = await req.json();
    const { adminPassword } = body;

    const setting = await db.appSetting.findUnique({ where: { key: "adminPassword" } });
    if (!setting) return NextResponse.json({ error: "ابتدا وارد شوید" }, { status: 401 });
    const inputHash = hashPassword(adminPassword);
    if (inputHash !== setting.value) return NextResponse.json({ error: "رمز اشتباه" }, { status: 403 });

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ message: "اعلان حذف شد" });
  } catch (error) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json({ error: "خطا در حذف اعلان" }, { status: 500 });
  }
}
