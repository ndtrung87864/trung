import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WrittenExerciseResultPage } from "@/components/exercise/written-exercise-result-page";
import { toNumber } from "@/lib/utils";

interface WrittenResultPageProps {
  params: {
    exerciseId: string;
    resultId: string;
  };
}

const WrittenResultPageRoute = async ({ params }: WrittenResultPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Get the exercise result 
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
    duration: result.duration,
    answers: parsedAnswers,
    createdAt: result.createdAt.toISOString(),
    modelId: result.exercise.model?.id || "gemini-2.0-flash",
    modelName: result.exercise.model?.name || "Gemini 2.0 Flash",
    exerciseType: "written"
  };

  return (
    <WrittenExerciseResultPage
      result={serializedResult}
      serverId={serverId}
    />
  );
};

export default WrittenResultPageRoute;
