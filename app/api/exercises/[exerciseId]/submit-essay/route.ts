import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(
  req: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    console.log("[EXERCISE_ESSAY_SUBMIT] Request received");

    const profile = await currentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exerciseId = params.exerciseId;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!exerciseId) {
      return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 });
    }

    // Check if exercise exists
    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Check if user already submitted
    const existingResult = await db.exerciseResult.findFirst({
      where: {
        exerciseId,
        userId: profile.id,
      },
    });

    if (existingResult) {
      return NextResponse.json({ 
        error: "Exercise already submitted",
        submissionId: existingResult.id
      }, { status: 400 });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "exercise-submissions");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = originalName.split(".").pop();
    const filename = `${exerciseId}_${profile.id}_${timestamp}.${extension}`;
    const filepath = join(uploadsDir, filename);
    const fileUrl = `/uploads/exercise-submissions/${filename}`;

    await writeFile(filepath, buffer);

    // Store essay submission in the same structure as written exercises
    const essayAnswer = [{
      type: "essay",
      question: "Essay submission",
      answer: "File submission",
      questionIndex: 1,
      score: 0, // Will be updated when graded
      maxScore: 10,
      percentage: 0,
      level: "Pending",
      status: "pending",
      standardAnswer: "",
      fileUrl: fileUrl,
      fileName: originalName,
      fileType: file.type,
      fileSize: file.size,
      submittedAt: new Date().toISOString()
    }];

    // Create exercise result
    const exerciseResult = await db.exerciseResult.create({
      data: {
        exerciseId,
        userId: profile.id,
        score: 0, // Will be updated when graded
        answers: essayAnswer,
        isEssayType: true,
      },
    });

    return NextResponse.json({
      success: true,
      submissionId: exerciseResult.id,
      fileUrl,
      message: "Essay submitted successfully",
    });
  } catch (error) {
    console.error("[EXERCISE_ESSAY_SUBMIT] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
