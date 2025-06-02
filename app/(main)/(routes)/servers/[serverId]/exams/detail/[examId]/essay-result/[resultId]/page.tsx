import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ResultWithSupportClient } from "@/components/exam/result-with-support-client";
import { toNumber } from "@/lib/utils";

interface EssayResultPageProps {
  params: Promise<{
    serverId: string;
    examId: string;
    resultId: string;
  }>;
}

const EssayResultPage = async ({ params }: EssayResultPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Properly await params before using
  const { serverId, examId, resultId } = await params;

  // Get the exam result with submission details
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
          files: true,
        },
      },
      submission: true,
    },
  });

  // If not found or doesn't belong to this user, redirect
  if (!result || result.userId !== profile.id || result.examId !== examId) {
    return redirect(`/servers/${serverId}/exams/`);
  }

  // Prepare submission URL if available
  let submissionUrl = null;
  if (result.submission?.fileUrl) {
    let fileUrl = result.submission.fileUrl;
    if (!fileUrl.startsWith("/api/files/")) {
      fileUrl = `/api/files/view?path=${encodeURIComponent(fileUrl)}`;
    }
    submissionUrl = fileUrl;
  }

  return (
    <ResultWithSupportClient
      examId={examId}
      resultId={resultId}
      submissionId={result.submission?.id}
      channelId={result.exam.channel?.id}
      serverId={serverId}
      examDetails={{
        ...result.exam,
        files: result.exam.files || [],
      }}
      result={{
        id: result.id,
        examId: result.examId,
        examName: result.examName,
        userId: result.userId,
        userName: result.userName,
        score: toNumber(result.score),
        duration: result.duration,
        createdAt: result.createdAt.toISOString(),
        submissionFileName: result.submission?.fileName,
        submissionId: result.submission?.id,
        feedback: result.feedback,
        aiEvaluation: result.aiEvaluation,
      }}
      submissionUrl={submissionUrl}
    />
  );
};

export default EssayResultPage;
