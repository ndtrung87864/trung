import { Metadata } from "next";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MultipleChoiceExerciseResultPage } from "@/components/exercise/multiple-choice-exercise-result-page";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kết quả bài tập - Hệ thống học tập",
  description: "Xem kết quả chi tiết bài tập",
};

interface ResultPageProps {
  params: Promise<{
    serverId: string;
    exerciseId: string;
    resultId: string;
  }>;
}

const ExerciseResultPage = async ({ params }: ResultPageProps) => {
  const resolvedParams = await params;
  
  if (!resolvedParams || !resolvedParams.serverId || !resolvedParams.exerciseId || !resolvedParams.resultId) {
    console.error("Missing required parameters:", resolvedParams);
    return redirect("/");
  }

  const { serverId, exerciseId, resultId } = resolvedParams;
  
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/sign-in");
  }

  // Get the exercise result 
  const result = await db.exerciseResult.findUnique({
    where: {
      id: resultId,
    },
    include: {
      exercise: {
        select: {
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

  // If not found or doesn't belong to this user, redirect
  if (!result || result.userId !== profile.id || result.exerciseId !== exerciseId) {
    const channelId = result?.exercise?.channel?.id;
    return redirect(`/servers/${serverId}/exercises?serverId=${serverId}&channelId=${channelId || ''}`);
  }

  // Safely parse answers and ensure it's an array
  let parsedAnswers: unknown[] = [];
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

  // Parse details if available
  let parsedDetails: unknown[] = [];
  try {
    if (result.details) {
      if (Array.isArray(result.details)) {
        parsedDetails = result.details;
      } else if (typeof result.details === 'string') {
        parsedDetails = JSON.parse(result.details);
      } else if (typeof result.details === 'object') {
        parsedDetails = [result.details];
      }
    }
  } catch (error) {
    console.error("Error parsing details:", error);
    parsedDetails = [];
  }

  // Serialize the result object
  const serializedResult = {
    id: result.id,
    exerciseId: result.exerciseId,
    examName: result.exerciseName,
    userId: result.userId,
    userName: result.userName,
    score: toNumber(result.score),
    duration: result.duration,
    isEssayType: result.isEssayType,
    answers: parsedAnswers,
    details: parsedDetails,
    createdAt: result.createdAt.toISOString(),
    modelId: result.exercise.model?.id || "gemini-2.0-flash",
    modelName: result.exercise.model?.name || "Gemini 2.0 Flash",
  };

  return (
    <MultipleChoiceExerciseResultPage
      result={serializedResult}
      serverId={serverId}
    />
  );
};

export default ExerciseResultPage;
