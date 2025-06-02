import { Metadata } from "next";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kết quả bài kiểm tra - Hệ thống học tập",
  description: "Trang kết quả bài kiểm tra",
};

interface ResultsPageProps {
  params: Promise<{
    examId: string;
  }>;
  searchParams: Promise<{
    submissionId?: string;
  }>;
}

const ResultsPage = async ({ params, searchParams }: ResultsPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/");
  }

  const submissionId = await searchParams;
  const { examId } = await params;

  if (!submissionId) {
    return redirect(`/exams/${examId}`);
  }

  const submission = await db.score.findUnique({
    where: {
      id: submissionId as string,
      profileId: profile.id, // Ensure this submission belongs to current user
    },
    include: {
      Exam: true,
    },
  });

  if (!submission) {
    return redirect("/exams");
  }

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        
        <h1 className="text-2xl font-bold mb-2">Nộp bài thành công!</h1>
        
        <p className="text-muted-foreground mb-6">
          Bạn đã hoàn thành bài kiểm tra "{submission.Exam?.name}".
        </p>
        
        <div className="bg-muted p-4 rounded-md mb-6">
          <p className="text-lg font-medium">Điểm số của bạn</p>
          <p className="text-3xl font-bold text-primary">{Number(submission.score).toFixed(1)}/10</p>
        </div>
        
        <Link href="/exams">
          <Button className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách bài kiểm tra
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ResultsPage;
