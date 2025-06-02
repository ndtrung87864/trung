"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ResultPageClient } from "@/components/exam/result-page-client";
import dynamic from "next/dynamic";

const MultipleChoiceResultClient = dynamic(
  () => import("@/components/exam/result-page-client"),
  { ssr: false, loading: () => <LoadingSpinner size="lg" /> }
);

interface ExamResultPageProps {
  params: Promise<{ id: string }>;
}

export default function ExamResultPage({ params }: ExamResultPageProps) {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paramId, setParamId] = useState<string | null>(null);
  
  // Resolve params first
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setParamId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!paramId) return; // Wait for params to be resolved

    const fetchExamResult = async () => {
      try {
        const response = await fetch(`/api/exams/results/${paramId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch exam result");
        }
        const data = await response.json();
        console.log("Fetched result data:", data);
        setResult(data);
      } catch (error) {
        console.error("Error fetching exam result:", error);
        router.push("/exams");
      } finally {
        setLoading(false);
      }
    };

    fetchExamResult();
  }, [paramId, router]);

  if (loading || !paramId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Explicitly determine if this is an essay exam
  const isEssayExam = !!result.isEssayType || 
    (result.answers && result.answers.length > 0 && result.answers[0].type === "essay");
  
  console.log("Is essay exam?", isEssayExam);

  // Render the appropriate component based on exam type
  return isEssayExam ? (
    <ResultPageClient result={result} />
  ) : (
    <MultipleChoiceResultClient result={result} />
  );
}
