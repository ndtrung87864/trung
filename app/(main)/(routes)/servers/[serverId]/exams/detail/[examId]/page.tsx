import { Metadata } from "next";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ExamTakingPage } from "@/components/exam/exam-taking-page";

export const metadata: Metadata = {
  title: "Làm bài kiểm tra - Hệ thống học tập",
  description: "Trang làm bài kiểm tra",
};

interface ExamPageProps {
  params: Promise<{
    examId: string;
  }>;
}

const ExamPage = async ({ params }: ExamPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Properly await params before accessing examId
  const { examId } = await params;

  const exam = await db.exam.findUnique({
    where: {
      id: examId,
    },
    include: {
      model: true,
      files: true,
      channel: {
        include: {
          server: true,
        },
      },
    },
  });

  if (!exam) {
    return redirect("/exams");
  }

  // Check if user already has a result for this exam
  const existingResult = await db.examResult.findFirst({
    where: {
      examId: examId,
      userId: profile.id,
    },
  });
  // If result exists, redirect directly to the specific result page
  if (existingResult) {
    return redirect(`/exams/${examId}/result/${existingResult.id}`);
  }

  const transformedExam = {
    ...exam,
    description: exam.description ?? undefined,
    prompt: exam.prompt ?? undefined,
    deadline: exam.deadline ? exam.deadline.toISOString() : undefined,
    channel: exam.channel ?? undefined, // Convert null to undefined
    allowReferences: exam.allowReferences ?? undefined, // Convert null to undefined
    questionCount: exam.questionCount ?? undefined, // Convert null to undefined
    shuffleQuestions: exam.shuffleQuestions ?? undefined, // Convert null to undefined
  };

  // No result exists, proceed to the exam-taking page
  return <ExamTakingPage exam={transformedExam} />;
};

export default ExamPage;
