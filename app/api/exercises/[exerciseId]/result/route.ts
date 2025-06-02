import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exerciseId } = await params;

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Missing exerciseId" },
        { status: 400 }
      );
    }

    // Check if exercise exists
    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Get user's exercise result
    const result = await db.exerciseResult.findFirst({
      where: {
        exerciseId: exerciseId,
        userId: profile.id,
      },
      include: {
        exercise: {
          include: {
            files: true,
            model: true,
            channel: {
              include: {
                server: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Exercise result not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[EXERCISE_RESULT_GET]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
