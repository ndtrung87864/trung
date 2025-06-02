import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { EssayExerciseResultPage } from "@/components/exercise/essay-exercise-result-page";
import { toNumber } from "@/lib/utils";

interface EssayResultPageProps {
  params: {
    exerciseId: string;
    resultId: string;
  };
}

const EssayResultPageRoute = async ({ params }: EssayResultPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Get the exercise result with necessary details
  const result = await db.exerciseResult.findUnique({
    where: {
      id: params.resultId,
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
          files: true,
        },
      },
    },
  });

  // If not found or doesn't belong to this user, redirect
  if (!result || result.userId !== profile.id || result.exerciseId !== params.exerciseId) {
    return redirect(`/exercises`);
  }

  // Get server ID if available
  const serverId = result.exercise.channel?.server?.id || "";

  // Parse the feedback if it exists
  let feedback = result.feedback;

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

  // Ensure parsedAnswers is always an array
  if (!Array.isArray(parsedAnswers)) {
    parsedAnswers = [];
  }

  // Serialize the result object
  const serializedResult = {
    id: result.id,
    exerciseId: result.exerciseId,
    exerciseName: result.exerciseName || result.exercise.name,
    userId: result.userId,
    userName: result.userName,
    score: toNumber(result.score),
    submittedFileUrl: result.submittedFileUrl || (parsedAnswers[0]?.fileUrl || null),
    submittedFileName: result.submittedFileName || (parsedAnswers[0]?.fileName || null),
    createdAt: result.createdAt.toISOString(),
    modelId: result.exercise.model?.id || "gemini-2.0-flash",
    modelName: result.exercise.model?.name || "Gemini 2.0 Flash",
    feedback: feedback,
    criteriaScores: result.criteriaScores as any,
    exerciseType: "essay",
    gradedAt: result.gradedAt?.toISOString(),
    gradedBy: result.gradedBy,
    answers: parsedAnswers,
    exercise: {
      files: result.exercise.files,
      channel: {
        server: result.exercise.channel?.server 
          ? { id: result.exercise.channel.server.id } 
          : undefined
      }
    }
  };

  return (
    <EssayExerciseResultPage
      result={serializedResult}
      serverId={serverId}
    />
  );
};

export default EssayResultPageRoute;
