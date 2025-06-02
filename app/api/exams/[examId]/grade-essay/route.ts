import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { sendMessageToGemini } from "@/lib/gemini_google";
import fs from "fs";
import path from "path";

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

    const { resultId, fileUrl } = await req.json();

    if (!examId || !resultId || !fileUrl) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Fetch the exam result
    const examResult = await db.examResult.findUnique({
      where: { id: resultId },
      include: {
        exam: {
          include: {
            model: true,
            files: true
          }
        }
      }
    });

    if (!examResult) {
      return NextResponse.json({ error: "Exam result not found" }, { status: 404 });
    }

    // Check if it's already graded - convert Decimal to number for comparison
    const currentScore = Number(examResult.score);
    if (currentScore > 0) {
      return NextResponse.json({
        message: "This submission is already graded",
        score: currentScore,
        feedback: examResult.answers && Array.isArray(examResult.answers) && examResult.answers.length > 0
          ? (examResult.answers[0] as { feedback?: string; score?: number }).feedback || ""
          : ""
      });
    }

    // Get the file content
    const domain = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const relativePath = fileUrl.replace(domain, "");
    const filePath = path.join(process.cwd(), "public", relativePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const fileData = {
      mimeType: path.extname(filePath).toLowerCase() === '.pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      data: fileBuffer.toString('base64'),
      fileName: path.basename(filePath)
    };

    // Note: Exam files are available but not currently used in grading

    // Create the prompt for AI grading
    const gradingPrompt = `
Bạn là giáo viên đang chấm bài tự luận. Hãy chấm bài này theo thang điểm 10, trong đó:
- 9 điểm cho nội dung (mức độ đáp ứng yêu cầu của đề bài, tính chính xác, độ chi tiết và tư duy phản biện)
- 1 điểm cho cách trình bày (cấu trúc, sự mạch lạc, trình bày, và hình thức)

Đề bài: ${examResult.exam.description || examResult.exam.name || "Không có thông tin"}

Bài làm của học sinh được lưu tại: ${filePath}

Hãy phân tích kỹ tệp bài làm của sinh viên và cung cấp:
1. Điểm số (trong thang điểm 10, chính xác đến một chữ số thập phân)
2. Đánh giá chi tiết về các điểm mạnh và điểm yếu
3. Lời nhận xét chung và đề xuất cải thiện

Trả lời theo định dạng sau:
ĐIỂM SỐ: [số điểm]/10

ĐÁNH GIÁ:
[Liệt kê các điểm mạnh và điểm yếu của bài làm]

NHẬN XÉT CHUNG:
[Nhận xét tổng quát và đề xuất cải thiện]
`;

    // Send to Gemini for grading
    const modelId = examResult.exam.model?.id || "gemini-2.0-flash";
    const gradingResult = await sendMessageToGemini(
      gradingPrompt,
      modelId,
      fileData,
      fileData.fileName,
      undefined
    );

    // Parse the score from the result
    let score = 0;
    const scoreMatch = gradingResult.match(/ĐIỂM SỐ:\s*(\d+([.,]\d+)?)\/10/);
    if (scoreMatch && scoreMatch[1]) {
      score = parseFloat(scoreMatch[1].replace(',', '.'));
    }

    // Update the score and feedback in the database
    const answers = Array.isArray(examResult.answers) ? [...examResult.answers] : [];
    if (answers.length > 0 && typeof answers[0] === 'object' && answers[0] !== null) {
      answers[0] = {
        ...answers[0],
        feedback: gradingResult,
        score: score , // Store as score out of 100 in the database
      };
    } else {
      answers.push({
        feedback: gradingResult,
        score: score ,
      });
    }

    const updatedResult = await db.examResult.update({
      where: { id: resultId },
      data: {
        score: score, // Store on 10-point scale
        answers: answers,
      }
    });

    return NextResponse.json({
      success: true,
      score: score,
      feedback: gradingResult,
      resultId: updatedResult.id,
    });
  } catch (error) {
    console.error("[ESSAY_GRADING]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
