import { NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { Prisma } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { resultId, score, originalScore, latePenalty } = await req.json();
    
    if (!resultId || score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Fetch the exercise result to update
    const exerciseResult = await db.exerciseResult.findUnique({
      where: {
        id: resultId,
      }
    });

    if (!exerciseResult) {
      return NextResponse.json({ error: "Exercise result not found" }, { status: 404 });
    }

    // Check permissions - allow update if the user is the owner or an admin
    if (exerciseResult.userId !== profile.id && profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Check if a penalty was already applied to this result
    let hasExistingPenalty = false;
    let existingPenalty = null;
    
    // Check in answers array first
    let answers = exerciseResult.answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        console.error("Error parsing answers:", e);
        answers = [];
      }
    }
    
    // Check for existing penalty in answers
    if (Array.isArray(answers) && answers.length > 0) {
      for (const answer of answers) {
        if (typeof answer === 'object' && answer !== null && 'latePenalty' in answer) {
          hasExistingPenalty = true;
          existingPenalty = (answer as { latePenalty: any }).latePenalty;
          break;
        }
      }
    }
    
    // Skip penalty calculation if there's already a penalty applied
    let finalScore = score;
    let penaltyInfo = null;
    
    // Only apply penalty if no existing penalty was found and a new penalty is provided
    if (!hasExistingPenalty && latePenalty) {
      const originalScoreValue = originalScore || score;
      
      if (latePenalty.type === "fixed") {
        penaltyInfo = {
          originalScore: originalScoreValue,
          penalizedScore: finalScore,
          type: "fixed",
          amount: latePenalty.amount,
          minutes: latePenalty.minutes,
          note: `Nộp muộn ${latePenalty.minutes} phút, trừ ${latePenalty.amount} điểm.`
        };
      } else if (latePenalty.type === "percentage") {
        
        penaltyInfo = {
          originalScore: originalScoreValue,
          penalizedScore: finalScore,
          type: "percentage",
          amount: latePenalty.amount,
          minutes: latePenalty.minutes,
          note: `Nộp muộn ${latePenalty.minutes} phút, trừ ${latePenalty.amount}% tổng điểm.`
        };
      }
    } else if (hasExistingPenalty) {
      console.log("[EXERCISE_UPDATE_SCORE] Skipping penalty calculation, penalty already applied", existingPenalty);
      penaltyInfo = existingPenalty;
    }
    
    // If answers is now an array, update with penalty info if not already present
    if (Array.isArray(answers) && answers.length > 0 && penaltyInfo && !hasExistingPenalty) {
      // Add penalty info to answers
      answers = answers.map(answer => {
        if (typeof answer === 'object' && answer !== null) {
          return {
            ...answer,
            latePenalty: penaltyInfo
          };
        }
        return { value: answer, latePenalty: penaltyInfo };
      });
    }

    // Update the exercise result in the database
    const updatedResult = await db.exerciseResult.update({
      where: {
        id: resultId,
      },
      data: {
        score: hasExistingPenalty ? score : finalScore, // Only change score if applying a new penalty
        answers: Array.isArray(answers) ? answers : undefined,
      },
    });
    
    return NextResponse.json({ 
      success: true,
      updatedResult: {
        id: updatedResult.id,
        score: updatedResult.score,
        hasLatePenalty: !!penaltyInfo,
        penaltyInfo,
        penaltyAlreadyApplied: hasExistingPenalty
      },
      message: hasExistingPenalty 
        ? "Score updated (penalty was already applied)"
        : "Score updated with penalty applied"
    });
  } catch (error) {
    console.error("[EXERCISE_UPDATE_SCORE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
