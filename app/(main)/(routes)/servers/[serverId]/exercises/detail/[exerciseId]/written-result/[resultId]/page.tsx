import { Metadata } from "next";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { WrittenExerciseResultPage } from "@/components/exercise/written-exercise-result-page";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kết quả bài tập tự luận - Hệ thống học tập",
  description: "Xem kết quả chi tiết bài tập tự luận",
};

interface ResultPageProps {
  params: {
    serverId: string;
    exerciseId: string;
    resultId: string;
  };
}

// Interface for the expected WrittenAnswer format
interface WrittenAnswer {
  question: string;
  answer: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: string;
  standardAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  detailsBreakdown?: string;
  calculation?: string;
  analysis?: string;
  strengths?: string;
  improvements?: string;
  [key: string]: unknown; // For other properties
}

// Interface for raw answer data coming from the database
interface RawAnswer {
  question?: string;
  answer?: string;
  userAnswer?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  status?: string;
  isCorrect?: boolean;
  correctAnswer?: string;
  explanation?: string;
  [key: string]: unknown; // For other properties
}

const WrittenResultPageRoute = async ({ params }: ResultPageProps) => {
  const profile = await currentProfile();
  const { serverId, resultId } = params;

  if (!profile) {
    return redirect("/sign-in");
  }

  try {
    console.log(`Starting written result page load for resultId: ${resultId}`);
    
    // Get the exercise result with all necessary details
    const result = await db.exerciseResult.findUnique({
      where: {
        id: resultId,
      },
      include: {
        exercise: {
          include: {
            model: true,
            channel: {
              include: {
                server: true,
              },
            },
          },
        },
      },
    });

    console.log(`Result found: ${!!result}, userId match: ${result?.userId === profile.id}`);
    
    // Only check user ID and not exercise ID to fix potential issues
    if (!result || result.userId !== profile.id) {
      console.log(`Redirecting due to invalid result access`);
      return redirect(`/servers/${serverId}/exercises`);
    }

    // Safely parse answers and ensure it's an array
    let parsedAnswers = [];
    try {
      if (result.answers) {
        if (Array.isArray(result.answers)) {
          parsedAnswers = result.answers;
        } else if (typeof result.answers === 'string') {
          parsedAnswers = JSON.parse(result.answers);
        } else if (typeof result.answers === 'object') {
          parsedAnswers = [result.answers];
        }
      }
    } catch (error) {
      console.error("Error parsing answers:", error);
      parsedAnswers = [];
    }

    // Format answers for display with all required properties
    const formattedAnswers: WrittenAnswer[] = parsedAnswers.map((answer: RawAnswer) => {
      // Set default values for all required properties
      const questionText = answer.question || "No question text available";
      const userAnswer = answer.userAnswer || answer.answer || "";
      const correctAnswerText = answer.correctAnswer || "";
      const explanationText = answer.explanation || "";
      const status = answer.status || 
               (answer.isCorrect === true ? "correct" : 
                answer.isCorrect === false ? "incorrect" : "unanswered");
      
      // Calculate or set default scores
      const answerScore = typeof answer.score === 'number' ? answer.score : 0;
      const maxScore = typeof answer.maxScore === 'number' ? answer.maxScore : 10;
      const percentage = typeof answer.percentage === 'number' ? answer.percentage : 
                         maxScore > 0 ? (answerScore / maxScore) * 100 : 0;
      
      // Return a properly formatted WrittenAnswer object
      return {
        // Required properties in WrittenAnswer interface
        question: questionText,
        answer: userAnswer, // This is the required 'answer' property
        score: answerScore,
        maxScore: maxScore,
        percentage: percentage,
        status: status,
        // Optional properties
        standardAnswer: correctAnswerText,
        correctAnswer: correctAnswerText,
        explanation: explanationText,
        // Preserve any other properties from the original answer
        ...answer
      };
    });

    // Serialize the result object with proper duration handling
    const serializedResult = {
      id: result.id,
      exerciseId: result.exerciseId,
      exerciseName: result.exercise.name,
      userId: result.userId,
      userName: profile.name,
      score: toNumber(result.score),
      duration: "0", // Default duration as string when not available in the database
      answers: formattedAnswers,
      createdAt: result.createdAt.toISOString(),
      modelId: result.exercise.model?.id || "gemini-2.0-flash",
      modelName: result.exercise.model?.name || "Gemini 2.0 Flash",
      exerciseType: "written"
    };

    console.log(`Successfully prepared written result data`);

    return (
      <WrittenExerciseResultPage
        result={serializedResult}
        serverId={serverId}
      />
    );
  } catch (error) {
    console.error("Error rendering written result page:", error);
    return redirect(`/servers/${serverId}/exercises`);
  }
};

export default WrittenResultPageRoute;
