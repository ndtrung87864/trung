import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
//import ExamAttempt from "@/components/exam/exam-attempt";

interface ExamPageProps {
    params:Promise<{
        examId: string;
    }>;
}

export default async function ExamPage({ params }: ExamPageProps) {
    const profile = await currentProfile();

    if (!profile) {
        return redirect("/");
    }

    // Fixed: Access examId directly from params
    const { examId } = await params;

    const exam = await db.exam.findUnique({
        where: {
            id: examId,
            isActive: true
        },
        include: {
            model: true,
            files: true
        }
    });

    if (!exam) {
        return redirect("/exams");
    }

   {/*  return (
        <div className="container mx-auto py-6 px-4">
           <ExamAttempt exam={exam} profile={profile} />
        </div>
    ); */} 
}