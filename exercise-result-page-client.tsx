"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ExerciseSupportChat } from "./exercise-support-chat";
import { WrittenExerciseResultPage } from "./written-exercise-result-page";
import { EssayExerciseResultPage } from "./essay-exercise-result-page";
import { MultipleChoiceExerciseResultPage } from "./multiple-choice-exercise-result-page";

interface Answer {
  type?: string;
  fileUrl?: string;
  status?: "correct" | "incorrect" | "unanswered";
  isCorrect?: boolean;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  question?: {
    text: string;
  } | string;
  score?: number;
  maxScore?: number;
  percentage?: number;
}

interface ExerciseResult {
  id: string;
  exerciseId: string;
  exerciseName: string;
  userId: string;
  userName: string;
  score: number;
  duration: string;
  answers: Answer[];
  createdAt: string;
  modelId?: string;
  modelName?: string;
  exerciseType?: "multiple-choice" | "written" | "essay";
  // Additional fields for different exercise types
  submittedFileUrl?: string;
  submittedFileName?: string;
  feedback?: string;
  detailedEvaluation?: string;
  criteriaScores?: {
    content: number;
    structure: number;
    language: number;
    creativity: number;
  };
  gradedAt?: string;
  gradedBy?: "AI" | "MANUAL";
  [key: string]: unknown;
}

interface ExerciseResultPageClientProps {
  result: ExerciseResult;
}

// Type transformation interfaces for each specialized result page
interface WrittenAnswer {
  question: string;
  answer: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: string;
  standardAnswer?: string;
  detailsBreakdown?: string;
  calculation?: string;
  analysis?: string;
  strengths?: string;
  improvements?: string;
}

interface WrittenExerciseResult {
  id: string;
  exerciseId: string;
  exerciseName: string;
  userId: string;
  userName: string;
  score: number;
  duration: string | null;
  answers: WrittenAnswer[];
  createdAt: string;
  modelId: string;
  modelName: string;
  exerciseType: string;
}

export const ExerciseResultPageClient = ({ result }: ExerciseResultPageClientProps) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  
  // Route to specialized result pages based on exercise type
  // Kiểm tra answer có type="essay" không
  const hasEssayAnswer = Array.isArray(result.answers) && 
    result.answers.some(answer => answer.type === "essay" || answer.fileUrl);
  
  if (hasEssayAnswer || result.exerciseType === "essay" || result.submittedFileUrl) {
    // Transform result to match EssayExerciseResult type
    const essayAnswers = result.answers.map(answer => {
      // Create a new object with index signature
      const transformedAnswer: {
        [key: string]: string | number | boolean | undefined;
        type?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        feedback?: string;
        score?: number;
      } = {
        ...answer,
        // Map specific properties to ensure they're included
        type: answer.type,
        fileUrl: answer.fileUrl,
        score: answer.score,
        // Transform question to string to comply with index signature
        question: typeof answer.question === 'object' ? answer.question.text : 
                 typeof answer.question === 'string' ? answer.question : 
                 undefined
      };
      
      return transformedAnswer;
    });
    
    const essayResult = {
      ...result,
      exerciseType: "essay" as const, // Force the type to be "essay"
      answers: essayAnswers,
    };
    
    return <EssayExerciseResultPage result={essayResult} serverId={result.exerciseId} />;
  }
  
  if (result.exerciseType === "written") {
    // Transform general answers into WrittenAnswer format
    const writtenAnswers: WrittenAnswer[] = result.answers.map(answer => ({
      question: typeof answer.question === 'object' ? answer.question.text : 
               typeof answer.question === 'string' ? answer.question : 
               "No question text available",
      answer: answer.userAnswer || "", 
      score: typeof answer.score === 'number' ? answer.score : 0,
      maxScore: typeof answer.maxScore === 'number' ? answer.maxScore : 10,
      percentage: typeof answer.percentage === 'number' ? answer.percentage : 0,
      status: answer.status || "unanswered",
      standardAnswer: answer.correctAnswer
    }));
    
    // Create properly typed result object for written exercises
    const writtenResult: WrittenExerciseResult = {
      id: result.id,
      exerciseId: result.exerciseId,
      exerciseName: result.exerciseName,
      userId: result.userId,
      userName: result.userName,
      score: result.score,
      duration: result.duration,
      answers: writtenAnswers,
      createdAt: result.createdAt,
      modelId: result.modelId || "gemini-2.0-flash",
      modelName: result.modelName || "Gemini 2.0 Flash",
      exerciseType: "written"
    };
    
    return <WrittenExerciseResultPage result={writtenResult} serverId={result.exerciseId} />;
  }

  if (result.exerciseType === "multiple-choice") {
      // Transform for multiple choice format with all required fields and proper types
    const multipleChoiceResult = {
      ...result,
      id: result.id,
      exerciseId: result.exerciseId,
      examName: result.exerciseName, // Map exerciseName to examName
      userId: result.userId,
      userName: result.userName,
      score: result.score,
      duration: result.duration || null,
      isEssayType: false as boolean | null, // Match the expected null type
      modelId: result.modelId || "gemini-2.0-flash", 
      modelName: result.modelName || "Gemini AI", // Ensure modelName is always a string
      // Either keep existing answers or transform them
      answers: result.answers.map(a => ({
        questionId: typeof a.question === 'object' ? a.question.text : 
                   typeof a.question === 'string' ? a.question : 
                   "Question",
        answer: a.userAnswer || ""
      })),
      // Add any missing required properties with defaults
      details: result.answers.map((a, index) => ({
        question: {
          id: `question-${index}`,
          text: typeof a.question === 'object' ? a.question.text : 
               typeof a.question === 'string' ? a.question : 
               `Question ${index + 1}`
        },
        userAnswer: a.userAnswer || null,
        correctAnswer: a.correctAnswer || "",
        status: a.status || (a.isCorrect ? "correct" : "incorrect"),
        explanation: a.explanation || ""
      })),
      channelId: typeof result.channelId === 'string' ? result.channelId : "",
    };
    
    return <MultipleChoiceExerciseResultPage result={multipleChoiceResult} serverId={result.exerciseId} />;
  }

  // ...existing code for generic result page...
  const totalQuestions = result.answers?.length || 0;
  const correctAnswers = result.answers?.filter((answer: Answer) => 
    answer.status === "correct" || answer.isCorrect
  ).length || 0;
  const incorrectAnswers = result.answers?.filter((answer: Answer) => 
    answer.status === "incorrect" || (!answer.isCorrect && answer.userAnswer)
  ).length || 0;
  const unansweredQuestions = result.answers?.filter((answer: Answer) => 
    answer.status === "unanswered" || (!answer.userAnswer)
  ).length || 0;

  const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return "default";
    if (score >= 6) return "secondary";
    if (score >= 4) return "outline";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold">Kết quả bài tập</h1>
          <div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{result.exerciseName}</span>
                  <Badge variant={getScoreBadgeVariant(result.score)}>
                    {result.score.toFixed(1)}/10
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                    <div className="text-sm text-muted-foreground">Đúng</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{incorrectAnswers}</div>
                    <div className="text-sm text-muted-foreground">Sai</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{unansweredQuestions}</div>
                    <div className="text-sm text-muted-foreground">Chưa trả lời</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">Tổng câu</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tỷ lệ chính xác</span>
                    <span>{scorePercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={scorePercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Thời gian: {result.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Ngày làm: {new Date(result.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết kết quả</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.answers?.map((answer: Answer, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium">Câu {index + 1}</h3>
                        <Badge 
                          variant={
                            answer.status === "correct" || answer.isCorrect
                              ? "default"
                              : answer.status === "unanswered" || !answer.userAnswer
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {answer.status === "correct" || answer.isCorrect ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Đúng</>
                          ) : answer.status === "unanswered" || !answer.userAnswer ? (
                            "Chưa trả lời"
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" />Sai</>
                          )}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-3 font-medium">
                        {typeof answer.question === 'object' && answer.question ? answer.question.text : answer.question}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Câu trả lời của bạn: </span>
                          <span className={
                            answer.status === "correct" || answer.isCorrect
                              ? "text-green-600"
                              : answer.userAnswer
                                ? "text-red-600"
                                : "text-gray-500"
                          }>
                            {answer.userAnswer || "Không có câu trả lời"}
                          </span>
                        </div>
                        
                        {answer.correctAnswer && (
                          <div>
                            <span className="font-medium">Đáp án đúng: </span>
                            <span className="text-green-600">{answer.correctAnswer}</span>
                          </div>
                        )}
                        
                        {answer.explanation && (
                          <div>
                            <span className="font-medium">Giải thích: </span>
                            <span className="text-muted-foreground">{answer.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support Chat Sidebar */}
          <div className="lg:col-span-1">
            <ExerciseSupportChat
              exerciseName={result.exerciseName}
              modelId={result.modelId || "gemini-2.0-flash"}
              exerciseId={result.exerciseId}
              resultId={result.id}
              examData={result}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
