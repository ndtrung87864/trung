import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { shuffleQuestions } = await req.json();

    // Validate exercise ID
    if (!id) {
      return NextResponse.json(
        { error: "Exercise ID is required" },
        { status: 400 }
      );
    }

    // Check if exercise exists
    const exercise = await db.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Update the exercise
    const updatedExercise = await db.exercise.update({
      where: { id },
      data: {
        shuffleQuestions,
      },
      include: {
        model: true,
        files: true,
        channel: {
          include: {
            server: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updatedExercise,
      message: shuffleQuestions 
        ? "Đã bật xáo trộn câu hỏi"
        : "Đã tắt xáo trộn câu hỏi",
    });
  } catch (error) {
    console.error("[EXERCISE_TOGGLE_SHUFFLE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
