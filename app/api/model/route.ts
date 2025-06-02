import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

export async function GET() {
  try {
    // Get user profile for permission checking (optional)
    const profile = await currentProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Fetch models from database
    const models = await db.model.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Return models as an array, even if empty
    return NextResponse.json(models || []);
  } catch (error) {
    console.error("[MODEL_GET]", error);
    // Return empty array instead of error to prevent client-side crash
    return NextResponse.json([], { status: 500 });
  }
}

// Sửa model
export async function PUT(req: Request) {
    const { id, name, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const model = await db.model.update({
        where: { id },
        data: { name, isActive }
    });
    return NextResponse.json(model);
}

// Xóa model
export async function DELETE(req: Request) {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.model.delete({ where: { id } });
    return NextResponse.json({ success: true });
}