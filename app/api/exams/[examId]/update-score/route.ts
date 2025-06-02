import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { examId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = params;

    if (!examId) {
      return NextResponse.json({ error: "Invalid exam result ID" }, { status: 400 });
    }

    // Get the request body with score and penalty information
    const { score, originalScore, latePenalty } = await req.json();

    // Validate the data
    if (score === undefined || score === null) {
      return NextResponse.json({ error: "Score is required" }, { status: 400 });
    }

    // Fetch the exam result to update
    const examResult = await db.examResult.findUnique({
      where: {
        id: examId,
      },
      include: {
        exam: true, // Include exam to get deadline
      }
    });

    if (!examResult) {
      return NextResponse.json({ error: "Exam result not found" }, { status: 404 });
    }

    // Check permissions - allow update if the user is the owner or an admin
    if (examResult.userId !== profile.id && profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Calculate late penalty if there's a deadline and score is positive
    let finalScore = score;
    let penaltyInfo = null;
    
    if (examResult.exam?.deadline && finalScore > 0) {
      const submissionTime = examResult.createdAt;
      const deadline = new Date(examResult.exam.deadline);
      
      if (submissionTime > deadline) {
        const minutesLate = Math.floor((submissionTime.getTime() - deadline.getTime()) / (60 * 1000));
        const originalScoreValue = originalScore || score;
        
        if (minutesLate > 0 && minutesLate <= 30) {
          finalScore = Math.max(0, originalScoreValue - 0.5);
          penaltyInfo = {
            originalScore: originalScoreValue,
            latePenalty: 0.5,
            note: `Nộp muộn ${minutesLate} phút, trừ 0.5 điểm.`
          };
        } else if (minutesLate > 30 && minutesLate <= 60) {
          finalScore = Math.max(0, originalScoreValue - 2);
          penaltyInfo = {
            originalScore: originalScoreValue,
            latePenalty: 2,
            note: `Nộp muộn ${minutesLate} phút, trừ 2 điểm.`
          };
        } else if (minutesLate > 60) {
          finalScore = originalScoreValue / 2;
          const hours = Math.floor(minutesLate / 60);
          const mins = minutesLate % 50;
          penaltyInfo = {
            originalScore: originalScoreValue,
            latePenalty: originalScoreValue / 2,
            note: `Nộp muộn ${hours} giờ ${mins} phút, trừ 1/2 số điểm.`
          };
        }
      }
    } else if (latePenalty) {
      // Use provided penalty info if available
      penaltyInfo = latePenalty;
      finalScore = score;
    }

    // Update the answers array with the late penalty information
    const answers = Array.isArray(examResult.answers) ? [...examResult.answers] : [];
    
    if (answers.length > 0 && typeof answers[0] === 'object' && finalScore > 0) {
      answers[0] = {
        ...answers[0],
        penalizedScore: finalScore,
        originalScore: originalScore || score, // Use the score as originalScore if not provided
        latePenalty: penaltyInfo || null
      };
    }

    // Update the exam result in the database
    const updatedResult = await db.examResult.update({
      where: {
        id: examId,
      },
      data: {
        score: finalScore,
        answers: answers
      },
    });

    return NextResponse.json({
      success: true,
      updatedResult: {
        id: updatedResult.id,
        score: updatedResult.score,
        hasLatePenalty: !!penaltyInfo,
        penaltyInfo
      }
    });
  } catch (error) {
    console.error("[UPDATE_SCORE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
