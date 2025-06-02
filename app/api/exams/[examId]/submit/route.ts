import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await params;

    if (!examId) {
      return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
    }

    // Check if a result already exists to avoid duplicates
    const existingResult = await db.examResult.findFirst({
      where: {
        examId: examId,
        userId: profile.id
      }
    });

    if (existingResult) {
      return NextResponse.json({ 
        message: "Exam result already exists",
        existingId: existingResult.id,
        success: true 
      });
    }

    const exam = await db.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        model: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Get answers and extra info from request
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    const { answers, score, details } = body;

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "No answers provided" },
        { status: 400 }
      );
    }

    // Lưu vào bảng ExamResult
    try {
      const examResult = await db.examResult.create({
        data: {
          examId: exam.id,
          examName: exam.name,
          userId: profile.id,
          userName: profile.name || "Unknown User",
          answers: details || answers,
          score: Number(score) || 0,
          duration: exam.prompt || "",
        },
      });

      return NextResponse.json({
        success: true,
        submissionId: examResult.id,
      });
    } catch (dbError) {
      console.error("Database error creating exam result:", dbError);
      return NextResponse.json(
        { error: "Failed to save exam results to database" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[EXAM_SUBMIT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
