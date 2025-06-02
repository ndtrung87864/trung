import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Properly await params before use
    const { examId } = await params;

    if (!examId) {
      return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
    }

    const exam = await db.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        files: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Determine if this is a multiple-choice exam based on characteristics
    const isMultipleChoice = true; // This is a placeholder - actual logic would depend on your app

    // For demonstration, we'll create some sample questions
    let questions = [] as any[]; // Initialize as an empty array
    
    if (isMultipleChoice) {
      questions = [
        {
          id: "q1",
          question: "Đâu là thủ đô của Việt Nam?",
          options: ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Huế"],
        },
        {
          id: "q2",
          question: "Địa chỉ IP nào sau đây là địa chỉ IP private?",
          options: ["8.8.8.8", "192.168.1.1", "104.18.22.46", "172.217.174.110"],
        },
        {
          id: "q3",
          question: "Ngôn ngữ lập trình nào được sử dụng để phát triển ứng dụng React?",
          options: ["JavaScript/TypeScript", "Python", "Java", "C#"],
        },
        {
          id: "q4",
          question: "Đâu là giao thức truyền tải web?",
          options: ["HTTP", "FTP", "SMTP", "Tất cả các đáp án trên"],
        },
        {
          id: "q5",
          question: "Thuật ngữ 'DOM' trong web development là viết tắt của?",
          options: ["Document Object Model", "Data Object Model", "Digital Object Memory", "Document Oriented Middleware"],
        }
      ];
    }

    return NextResponse.json({
      isMultipleChoice,
      questions,
    });

  } catch (error) {
    console.error("[EXAM_DETECT_TYPE]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
