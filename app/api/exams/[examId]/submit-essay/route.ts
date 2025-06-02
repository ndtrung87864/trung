import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { normalizeNameForStorage } from "@/lib/utils";
import path from "path";
import fs from "fs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Properly await params before accessing examId

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

    // Check if this is a time-expired submission without a file
    const contentType = req.headers.get('content-type') || '';
      // If content-type is application/json, this is a request without a file
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const isTimeExpired = body.isTimeExpired;
      const answers = body.answers || [];
        if (isTimeExpired) {
        // Create exam result entry for time-expired submission
        const examResult = await db.examResult.create({
          data: {
            examId: exam.id,
            examName: exam.name,
            userId: profile.id,
            userName: profile.name || "Unknown User",            
            answers: answers.length > 0 ? answers : [{
              type: "essay",
              score: 0,
              fileUrl: "null",
              feedback: "ĐIỂM SỐ: 0/10\n\nĐÁNH GIÁ:\n\nHết thời gian, chưa nộp bài"
            }],
            score: 0, // Default score for expired submissions
            duration: exam.prompt || "",
          },
        });

        return NextResponse.json({
          success: true,
          submissionId: examResult.id,
        });
      }
    }

    // Process and save the uploaded file (regular submission)
    const formData = await req.formData();
    const file = formData.get("file") as File;

    // For regular submissions, require a file
    if (!file) {
      // If no file is provided and it's not a time-expired submission, return error
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Create directory structure if it doesn't exist
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const uploadDir = path.join(process.cwd(), "public", "uploads", "essays", examId);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate a unique filename
    const fileExtension = path.extname(file.name);
    const normalizedFileName = normalizeNameForStorage(`${profile.name}_${Date.now()}${fileExtension}`);
    const filePath = path.join(uploadDir, normalizedFileName);
    
    // Convert file to buffer and save to filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Create URL for the uploaded file
    const fileUrl = `/uploads/essays/${examId}/${normalizedFileName}`;
    const fullUrl = `${domain}${fileUrl}`;

    // Create exam result entry in database
    const examResult = await db.examResult.create({
      data: {
        examId: exam.id,
        examName: exam.name,
        userId: profile.id,
        userName: profile.name || "Unknown User",
        answers: [
          {
            type: "essay",
            fileUrl: fullUrl,
            fileName: file.name,
          }
        ],
        score: 0, // Score will be added by the teacher later
        duration: exam.prompt || "",
      },
    });

    return NextResponse.json({
      success: true,
      submissionId: examResult.id,
      fileUrl: fullUrl,
    });
  } catch (error) {
    console.error("[ESSAY_SUBMIT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}