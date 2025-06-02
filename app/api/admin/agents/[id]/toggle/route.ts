import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await db.field.findUnique({
      where: { id: id },
      select: { isActive: true },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Toggle the status
    const updatedAgent = await db.field.update({
      where: { id: id },
      data: {
        isActive: !agent.isActive,
      },
      select: { id: true, isActive: true },
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error("Failed to toggle agent status:", error);
    return NextResponse.json(
      { error: "Failed to toggle agent status" },
      { status: 500 }
    );
  }
}