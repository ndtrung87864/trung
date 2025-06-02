import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WrittenResultPage } from "@/components/exam/written-result-page";
import { toNumber } from "@/lib/utils";

interface WrittenResultPageProps {
  params: Promise<{
    serverId: string;
    examId: string;
    resultId: string;
  }>;
}

const WrittenResultPageRoute = async ({ params }: WrittenResultPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Properly await params before using
  const { serverId, examId, resultId } = await params;

  // Get the exam result 
  const result = await db.examResult.findUnique({
    where: {
      id: resultId,
    },
    include: {
      exam: {
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
  if (!result || result.userId !== profile.id || result.examId !== examId) {
    const channelId = result?.exam?.channel?.id;
    return redirect(`/servers/${serverId}/exams?serverId=${serverId}&channelId=${channelId || ''}`);
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

  // Ensure parsedAnswers is always an array
  if (!Array.isArray(parsedAnswers)) {
    parsedAnswers = [];
  }

  // Serialize the result object
  const serializedResult = {
    id: result.id,
    examId: result.examId,
    examName: result.examName,
    userId: result.userId,
    userName: result.userName,
    score: toNumber(result.score),
    duration: result.duration,
    isEssayType: Array.isArray(result.answers)
      && result.answers.some(
        (answer) =>
          typeof answer === "object" &&
          answer !== null &&
          "type" in answer &&
          (answer as { type?: string }).type === "essay"
      ),
    answers: Array.isArray(result.answers) ? result.answers.filter(answer => answer !== null) as [] : [],
    createdAt: result.createdAt.toISOString(),
    modelId: result.exam.model?.id || "gemini-2.0-flash",
    modelName: result.exam.model?.name || "Gemini 2.0 Flash",
  };
  return (
    <WrittenResultPage
      examId={examId}
      resultId={resultId}
      channelInfo={{
        channelId: result.exam.channel?.id,
        serverId: serverId
      }}
      result={serializedResult}
    />
  );
};

export default WrittenResultPageRoute;
