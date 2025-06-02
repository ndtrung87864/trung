import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { EssayExerciseResultPage } from "@/components/exercise/essay-exercise-result-page";
import { toNumber } from "@/lib/utils";

// Define explicit types to match the database schema
interface ExerciseResultType {
  id: string;
  exerciseId: string;
  userId: string;
  score: number | null;
  answers: string | Record<string, unknown>[] | Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  feedback?: string | null;
  submittedFileUrl?: string | null;
  submittedFileName?: string | null;
  exerciseName?: string | null;
  userName?: string | null;
  criteriaScores?: Record<string, number> | null;
  gradedAt?: Date | null;
  gradedBy?: string | null;
  exercise: {
    id: string;
    name: string;
    model?: {
      id: string;
      name: string;
    } | null;
    files: Array<{
      id: string;
      name: string;
      url: string;
    }>;
    channel?: {
      server?: {
        id: string;
      } | null;
    } | null;
  };
}

interface EssayResultPageProps {
  params: Promise<{
    serverId: string;
    exerciseId: string;
    resultId: string;
  }>;
}

const EssayResultPageRoute = async ({ params }: EssayResultPageProps) => {
  const profile = await currentProfile();
  // Await params before destructuring
  const resolvedParams = await params;
  const { serverId, resultId } = resolvedParams;

  if (!profile) {
    return redirect("/sign-in");
  }

  try {
    console.log(`Starting essay result page load for resultId: ${resultId}`);

    // Get the exercise result with necessary details
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
            files: true,
          },
        },
      },
    }) as unknown as ExerciseResultType;

    // Only check user ID to fix potential issues
    if (!result || result.userId !== profile.id) {
      console.log(`Redirecting due to invalid result access`);
      return redirect(`/servers/${serverId}/exercises`);
    }

    // Parse the feedback if it exists
    const feedback = result.feedback;

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
  
    // Extract file URL from answers if available
    const fileAnswer = parsedAnswers.find((answer: Record<string, unknown>) => answer.fileUrl);
    const submittedFileUrl = result.submittedFileUrl || (fileAnswer?.fileUrl as string | undefined) || null;
    const submittedFileName = result.submittedFileName || (fileAnswer?.fileName as string | undefined) || null;

    // Serialize the result object
    const serializedResult = {
      id: result.id,
      exerciseId: result.exerciseId,
      exerciseName: result.exerciseName || result.exercise.name,
      userId: result.userId,
      userName: result.userName || profile.name || "Anonymous",
      score: toNumber(result.score),
      submittedFileUrl, // Now properly typed
      submittedFileName, // Now properly typed
      createdAt: result.createdAt.toISOString(),
      modelId: result.exercise.model?.id || "gemini-2.0-flash",
      modelName: result.exercise.model?.name || "Gemini 2.0 Flash",
      feedback, // feedback is now properly typed
      criteriaScores: result.criteriaScores,
      exerciseType: "essay" as const,
      gradedAt: result.gradedAt?.toISOString() || null,
      gradedBy: result.gradedBy,
      answers: parsedAnswers,
      exercise: {
        files: result.exercise.files,
        channel: {
          server: result.exercise.channel?.server 
            ? { id: result.exercise.channel.server.id } 
            : null
        }
      }
    };

    console.log(`Successfully prepared essay result data`);

    return (
      <EssayExerciseResultPage
        result={serializedResult}
        serverId={serverId}
      />
    );
  } catch (error) {
    console.error("Error rendering essay result page:", error);
    return redirect(`/servers/${serverId}/exercises`);
  }
};

export default EssayResultPageRoute;
