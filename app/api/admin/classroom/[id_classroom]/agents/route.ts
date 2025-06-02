import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Get all agents associated with a classroom
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id_classroom: string }> }
) {
  try {
    const { id_classroom } = await params;

    if (!id_classroom) {
      return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 });
    }

    // Get all server-field relationships for this classroom
    const serverFields = await db.serverField.findMany({
      where: { serverId: id_classroom },
      include: {
        field: {
          include: {
            model: true,
          }
        }
      }
    });

    return NextResponse.json(serverFields, { status: 200 });
  } catch (error) {
    console.error("[CLASSROOM_AGENTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Add an agent to a classroom
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id_classroom: string }> }
) {
  try {
    const { id_classroom } = await params;
    const { fieldId } = await request.json();

    if (!id_classroom || !fieldId) {
      return NextResponse.json({ error: "Classroom ID and Field ID are required" }, { status: 400 });
    }

    // Check if the relationship already exists
    const existing = await db.serverField.findFirst({
      where: {
        serverId: id_classroom,
        fieldId: fieldId
      }
    });

    if (existing) {
      return NextResponse.json({ error: "This agent is already added to the classroom" }, { status: 400 });
    }

    // Create the relationship
    const serverField = await db.serverField.create({
      data: {
        serverId: id_classroom,
        fieldId: fieldId
      },
      include: {
        field: {
          include: {
            model: true
          }
        }
      }
    });

    return NextResponse.json(serverField, { status: 201 });
  } catch (error) {
    console.error("[CLASSROOM_AGENTS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Remove an agent from a classroom
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_classroom: string }> }
) {
  try {
    const { id_classroom } = await params;
    const { serverFieldId } = await request.json();

    if (!id_classroom || !serverFieldId) {
      return NextResponse.json({ error: "Classroom ID and ServerField ID are required" }, { status: 400 });
    }

    // Delete the relationship
    await db.serverField.delete({
      where: {
        id: serverFieldId
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[CLASSROOM_AGENTS_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}