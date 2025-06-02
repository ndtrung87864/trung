import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ResultPageClient } from "@/components/exam/result-page-client";
import { toNumber } from "@/lib/utils";  // Import the utility function

interface ResultPageProps {
  params: Promise<{
    examId: string;
    resultId: string;
  }>;
}

const ResultPage = async ({ params }: ResultPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const { examId, resultId } = await params;

  // Get the exam result 
  const result = await db.examResult.findUnique({
    where: {
      id: resultId,
    },
    include: {
      exam: {
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
  if (!result || result.userId !== profile.id || result.examId !== examId) {
    return redirect(`/exams/${examId}`);
  }

  // Serialize the result object, using our utility function for the score
  const serializedResult = {
    id: result.id,
    examId: result.examId,
    examName: result.examName,
    userId: result.userId,
    userName: result.userName,
    score: toNumber(result.score), // Using our utility function
    duration: result.duration,
    // Handle isEssayType gracefully - check if it exists or determine from other fields
    isEssayType: (result as any).isEssayType ?? false, // Use type assertion or provide default
    answers: result.answers,
    createdAt: result.createdAt.toISOString(),
    modelId: result.exam.model?.id || "gemini-2.0-flash",
    modelName: result.exam.model?.name || "Gemini 2.0 Flash",
  };

  return <ResultPageClient result={serializedResult} />;
};

export default ResultPage;
