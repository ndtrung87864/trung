import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { sendMessageToGemini } from "@/lib/gemini_google";
import { readFile } from "fs/promises";
import { join } from "path";

export async function POST(
  req: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params before accessing its properties
    const { exerciseId } = await params;
    const { resultId, fileUrl, scoreScale = 10, enforceScoreScale = true } = await req.json();

    if (!exerciseId || !resultId || !fileUrl) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get exercise and result
    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        model: true,
        files: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    const exerciseResult = await db.exerciseResult.findFirst({
      where: {
        id: resultId,
        exerciseId,
      },
    });

    if (!exerciseResult) {
      return NextResponse.json(
        { error: "Exercise result not found" },
        { status: 404 }
      );
    }

    // Read the submitted file
    let submissionFileData = null;
    try {
      const filePath = join(process.cwd(), "public", fileUrl);
      const fileBuffer = await readFile(filePath);
      
      // Determine file type
      const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      
      switch (fileExtension) {
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'doc':
          mimeType = 'application/msword';
          break;
        case 'txt':
          mimeType = 'text/plain';
          break;
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
      }

      submissionFileData = {
        mimeType,
        data: fileBuffer.buffer instanceof ArrayBuffer 
          ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
          : new ArrayBuffer(0),
        fileName: fileUrl.split('/').pop() || 'submission',
      };
    } catch (fileError) {
      console.error("Error reading submission file:", fileError);
      return NextResponse.json(
        { error: "Could not read submission file" },
        { status: 400 }
      );
    }

    // Create grading prompt
    const gradingPrompt = `
      Đánh giá bài làm tự luận của học sinh theo thang điểm ${scoreScale} và cung cấp phản hồi chi tiết.

      HƯỚNG DẪN CHẤM ĐIỂM:
      
      1. TIÊU CHÍ ĐÁNH GIÁ:
         - Hiểu đúng yêu cầu đề bài (20%)
         - Nội dung chính xác và đầy đủ (40%)
         - Cách trình bày, cấu trúc (20%)
         - Tính sáng tạo và độ sâu (20%)

      2. THANG ĐIỂM ${scoreScale}:
         - ${scoreScale}: Xuất sắc - Hoàn thành tất cả yêu cầu, sáng tạo, độ sâu cao
         - ${Math.round(scoreScale * 0.8)}-${scoreScale - 1}: Tốt - Hoàn thành hầu hết yêu cầu, có độ sâu
         - ${Math.round(scoreScale * 0.6)}-${Math.round(scoreScale * 0.8) - 1}: Khá - Hoàn thành cơ bản, ít thiếu sót
         - ${Math.round(scoreScale * 0.4)}-${Math.round(scoreScale * 0.6) - 1}: Trung bình - Hoàn thành một phần, có thiếu sót
         - ${Math.round(scoreScale * 0.2)}-${Math.round(scoreScale * 0.4) - 1}: Yếu - Chưa đáp ứng yêu cầu cơ bản
         - 0-${Math.round(scoreScale * 0.2) - 1}: Kém - Không hoàn thành hoặc sai hoàn toàn

      3. ĐỊNH DẠNG PHẢN HỒI:
         
      ĐIỂM SỐ: [điểm số]/${scoreScale}

      ĐÁNH GIÁ CHI TIẾT:
      
      ✅ ĐIỂM MẠNH:
      - [Liệt kê các điểm tốt của bài làm]
      
      ⚠️ CẦN CẢI THIỆN:
      - [Liệt kê các điểm cần cải thiện]
      
      💡 GỢI Ý:
      - [Đưa ra lời khuyên cụ thể để học sinh cải thiện]

      Hãy đánh giá bài làm một cách khách quan, công bằng và mang tính xây dựng.
    `;

    const modelId = exercise.model?.id || "gemini-2.0-flash";
    
    // Send for AI grading
    const gradingResult = await sendMessageToGemini(
      gradingPrompt,
      modelId,
      submissionFileData,
      submissionFileData.fileName
    );

    // Extract score from result
    let extractedScore = 0;
    const scoreMatch = gradingResult.match(new RegExp(`ĐIỂM SỐ:\\s*(\\d+([.,]\\d+)?)\\/${scoreScale}`));
    if (scoreMatch && scoreMatch[1]) {
      extractedScore = parseFloat(scoreMatch[1].replace(",", "."));
      
      // Ensure score is within valid range
      if (enforceScoreScale) {
        extractedScore = Math.max(0, Math.min(extractedScore, scoreScale));
      }
    }

    // Update exercise result with grade and answers
    const updatedResult = await db.exerciseResult.update({
      where: { id: resultId },
      data: {
        score: extractedScore,
        answers: [
          {
            type: "essay",
            score: extractedScore,
            fileUrl,
            feedback: gradingResult,
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      score: extractedScore,
      maxScore: scoreScale,
      feedback: gradingResult,
      resultId: updatedResult.id,
    });
  } catch (error) {
    console.error("[ESSAY_GRADE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}