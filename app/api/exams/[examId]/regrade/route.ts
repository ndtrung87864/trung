import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { sendMessageToGemini } from "@/lib/gemini_google";

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

    const { resultId } = await req.json();

    if (!examId || !resultId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Fetch the exam result
    const examResult = await db.examResult.findUnique({
      where: { id: resultId },
      include: {
        exam: {
          include: {
            model: true
          }
        }
      }
    });

    if (!examResult) {
      return NextResponse.json({ error: "Exam result not found" }, { status: 404 });
    }

    // Ensure the result belongs to the authenticated user or the user is an admin
    if (examResult.userId !== profile.id && profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access to this result" }, { status: 403 });
    }

    // Format the answers for evaluation
    const answers = examResult.answers || [];
    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "No answers found to regrade" }, { status: 400 });
    }

    // Determine exam type based on answers structure or use type assertion
    const isEssayType = ('isEssayType' in examResult ? examResult.isEssayType : undefined) ?? 
                       ((answers.length > 0 && typeof answers[0] === 'string') ||
                       (answers.length > 0 && answers[0] && !answers[0].hasOwnProperty('question')));

    // Define interface for the answer structure
    interface ExamAnswer {
      question?: {
        text?: string;
        options?: string[];
      };
      userAnswer?: string;
    }

    // For multiple choice exams
    if (!isEssayType) {
      // Create a summary of all questions and answers
      const summary = answers.map((answer, index: number) => {
        const typedAnswer = answer as unknown as ExamAnswer;
        return `Câu hỏi ${index + 1}: ${typedAnswer.question?.text}\nLựa chọn của học sinh: ${typedAnswer.userAnswer}\nCác lựa chọn: ${typedAnswer.question?.options?.join(', ')}`;
      }).join("\n\n");
      
      // Prepare evaluation prompt
      const evaluationPrompt = `
        Đánh giá bài làm kiểm tra sau và cho điểm theo thang 10 điểm:
        
        ${summary}
        
        Hãy đánh giá điểm số người dùng ở TẤT CẢ các câu hỏi, kể cả những câu người dùng chưa trả lời.
        Với mỗi câu, hãy cung cấp đáp án đúng bên dưới đáp án của người dùng và giải thích ngắn gọn.
        
        Đánh giá CHÍNH XÁC mỗi câu trả lời:
        - Đúng: Khi đáp án của người dùng HOÀN TOÀN GIỐNG với đáp án đúng
        - Sai: Khi đáp án của người dùng KHÁC với đáp án đúng
        - Chưa trả lời: Khi người dùng không chọn đáp án nào
        
        Điểm số sẽ được tính dựa trên số câu trả lời đúng chia cho TỔNG SỐ câu hỏi rồi nhân với thang điểm 10.
        
        Phản hồi của bạn cần bắt đầu với "ĐIỂM SỐ: [số điểm]/10" và sau đó là đánh giá chi tiết cho từng câu hỏi.
        Mỗi câu đánh giá theo format:
        "Câu [số thứ tự]: [Đúng/Sai/Chưa trả lời] - [Đáp án đúng: (chỉ ra đáp án đúng đầy đủ)] - [Giải thích]"
      `;
      
      // Get evaluation from AI
      const modelId = examResult.exam?.model?.id || "gemini-2.0-flash";
      const evaluationResult = await sendMessageToGemini(
        evaluationPrompt,
        modelId,
        undefined,
        undefined,
        examResult.exam?.prompt || undefined
      );
      
      // Extract score from AI response
      let score = 0;
      const scoreMatch = evaluationResult.match(/ĐIỂM SỐ:\s*(\d+([.,]\d+)?)\/10/);
      if (scoreMatch && scoreMatch[1]) {
        score = parseFloat(scoreMatch[1].replace(',', '.'));
      }

      const updatedAnswers = answers.map((answer, index: number) => {
        const questionNumber = index + 1;
        const resultRegex = new RegExp(
          `Câu\\s*${questionNumber}:\\s*(Đúng|Sai|Chưa trả lời)\\s*-\\s*Đáp án đúng:\\s*(.+?)\\s*-\\s*(.+?)(?=Câu\\s*\\d+:|$)`,
          's'
        );
        
        const matchResult = evaluationResult.match(resultRegex);
        
        if (matchResult) {
          const status = matchResult[1]?.trim() === "Đúng" ? "correct" : 
                         matchResult[1]?.trim() === "Sai" ? "incorrect" : "unanswered";
          const correctAnswer = matchResult[2]?.trim() || "";
          const explanation = matchResult[3]?.trim() || "";
          
          return {
            ...(answer as object),
            status,
            correctAnswer,
            explanation
          };
        }
        
        return answer;
      });

      // Update the result in the database
      const updatedResult = await db.examResult.update({
        where: { id: resultId },
        data: {
          score: Math.round(score * 10), // Convert to score out of 100
          answers: updatedAnswers,
        }
      });

      return NextResponse.json({
        success: true,
        score: score,
        resultId: updatedResult.id,
      });
    }
    
    // For essay exams, we should use the existing grade-essay endpoint
    // So just return a message suggesting that
    return NextResponse.json({
      success: false,
      message: "Essay exams should use the grade-essay endpoint",
    }, { status: 400 });
  } catch (error) {
    console.error("[EXAM_REGRADE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
