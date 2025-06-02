import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    console.log("[EXERCISE_SUBMIT] API called");
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exerciseId } = await params;

    if (!exerciseId) {
      return NextResponse.json({ error: "Invalid exercise ID" }, { status: 400 });
    }

    // Check if a result already exists to avoid duplicates
    const existingResult = await db.exerciseResult.findFirst({
      where: {
        exerciseId: exerciseId,
        userId: profile.id
      }
    });

    if (existingResult) {
      return NextResponse.json({ 
        message: "Exercise result already exists",
        existingId: existingResult.id,
        success: true 
      });
    }

    const exercise = await db.exercise.findUnique({
      where: {
        id: exerciseId,
      },
      include: {
        model: true,
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }    // Get answers and extra info from request
    let body;
    try {
      body = await req.json();
      console.log("[EXERCISE_SUBMIT] Request body received:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("[EXERCISE_SUBMIT] JSON parse error:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }    const { answers, score, details, isEssayType = false } = body;
    console.log("[EXERCISE_SUBMIT] Extracted from body:", {
      answersType: typeof answers,
      answersKeys: answers ? Object.keys(answers).length : 0,
      detailsType: typeof details,
      detailsLength: Array.isArray(details) ? details.length : 0,
      score,
      isEssayType
    });

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "No answers provided" },
        { status: 400 }
      );
    }

    // Use details first (complete data), fallback to answers
    const answersToSave = details || answers;
    console.log("[EXERCISE_SUBMIT] Saving to database:", {
      dataType: typeof answersToSave,
      isArray: Array.isArray(answersToSave),
      length: Array.isArray(answersToSave) ? answersToSave.length : Object.keys(answersToSave).length,
      firstItem: Array.isArray(answersToSave) ? answersToSave[0] : Object.keys(answersToSave)[0]
    });

    // Save to ExerciseResult table
    try {      const exerciseResult = await db.exerciseResult.create({
        data: {
          exerciseId: exercise.id,
          userId: profile.id,
          answers: answersToSave,
          score: Number(score) || 0,
          isEssayType: isEssayType,
        },
      });

      console.log("[EXERCISE_SUBMIT] Exercise result created successfully:", exerciseResult.id);

      return NextResponse.json({
        success: true,
        submissionId: exerciseResult.id,
        message: "Exercise submitted successfully"
      });
    } catch (dbError) {
      console.error("Database error creating exercise result:", dbError);
      return NextResponse.json(
        { error: "Failed to save exercise results to database" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[EXERCISE_SUBMIT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}