"use client";

import React, { FC, useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, HelpCircle, MessageSquare, Target, Trophy } from "lucide-react";
import { ExerciseSupportChat } from "./exercise-support-chat";

// Define more specific type for question
interface QuestionObject {
  id?: string;
  text?: string;
  options?: string[];
}

interface MultipleChoiceExerciseResultProps {
  result: {
    id: string;
    exerciseId: string;
    examName: string; // This is the correct property name
    userId: string;
    userName: string;
    score: number;
    duration: string | null;
    isEssayType: boolean | null;
    answers: Array<{ questionId: string; answer: string }>;

    details?: Array<{
      question: {
        id: string;
        text: string;
        options?: string[];
      };
      userAnswer: string | null;
      correctAnswer: string;
      status: string;
      explanation: string;
    }>;
    createdAt: string;
    modelId: string;
    modelName: string;
    channelId?: string;
  };
  serverId: string;
}

interface ProcessedDetail {
  questionNumber: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  status: string;
  explanation: string;
}

export const MultipleChoiceExerciseResultPage: FC<MultipleChoiceExerciseResultProps> = ({
  result,
  serverId,
}) => {
  const router = useRouter();
  const [showSupport, setShowSupport] = useState(false);
  const [processedDetails, setProcessedDetails] = useState<ProcessedDetail[]>([]);
  
  // Use refs for scrollable areas to avoid re-renders
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const handleNavigateBack = () => {
    // Get channelId from result if available
    const channelId = result?.channelId || "";
    router.push(`/servers/${serverId}/exercises/${channelId}`);
  };

  const toggleSupport = () => {
    setShowSupport(!showSupport);
  };

  // Update the processing of results to handle the new format
  useEffect(() => {
    if (result) {
      try {
        
        // Check if answers is an array or needs parsing
        let parsedAnswers = result.answers;
        if (typeof result.answers === 'string') {
          try {
            parsedAnswers = JSON.parse(result.answers) as Array<{ questionId: string; answer: string }>;
          
          } catch (parseError) {
            console.error("Error parsing answers string:", parseError);
            parsedAnswers = [];
          }
        }

        // Make sure we have an array
        if (!Array.isArray(parsedAnswers)) {
          
          // If it's an object of key-value pairs, convert to array
          if (parsedAnswers && typeof parsedAnswers === 'object') {
            parsedAnswers = Object.entries(parsedAnswers).map(([key, value]) => ({
              questionId: key,
              answer: String(value),
            }));
          } else {
            parsedAnswers = [];
          }
        }
        // Define interface for potential answer item structures
        interface AnswerItem {
          questionId?: string;
          question?: string | QuestionObject;
          userAnswer?: string;
          answer?: string;
          correctAnswer?: string;
          status?: string;
          isCorrect?: boolean;
          explanation?: string;
        }
        
        // Process answers based on type with fixed type handling
        const processedDetails = parsedAnswers.map(
          (item: AnswerItem, index: number): ProcessedDetail => {
            // Check if the item is already in the correct format with question object and status
            if (item && item.question !== undefined && item.status !== undefined) {
              const questionText = typeof item.question === 'object' && item.question !== null
                ? (item.question.text || "Không có nội dung")
                : typeof item.question === 'string'
                  ? item.question
                  : "Không có nội dung";
              
              return {
                questionNumber: index + 1,
                question: questionText,
                userAnswer: item.userAnswer || "Không trả lời",
                correctAnswer: item.correctAnswer || "Không có dữ liệu",
                status: item.status,
                explanation: item.explanation || "",
              };
            } 
            
            // Check if the item has a question property that's a string
            else if (item && typeof item.question === 'string') {
              return {
                questionNumber: index + 1,
                question: item.question,
                userAnswer: item.userAnswer || item.answer || "Không trả lời",
                correctAnswer: item.correctAnswer || "Không có dữ liệu",
                status: item.isCorrect === true ? "correct" : "incorrect",
                explanation: item.explanation || "",
              };
            }
            
            // Legacy format with questionId and answer
            else if (item && (item.questionId || item.answer !== undefined)) {
              return {
                questionNumber: index + 1,
                question: typeof item.questionId === "string" ? item.questionId : `Câu hỏi ${index + 1}`,
                userAnswer: item.answer !== undefined ? String(item.answer) : "Không có dữ liệu",
                correctAnswer: "Không có dữ liệu",
                status: "unknown",
                explanation: "Không có dữ liệu đánh giá",
              };
            }
            
            // Fall back to a default structure
            else {
              return {
                questionNumber: index + 1,
                question: `Câu hỏi ${index + 1}`,
                userAnswer: "Không có dữ liệu",
                correctAnswer: "Không có dữ liệu",
                status: "unknown",
                explanation: "Không có dữ liệu đánh giá",
              };
            }
          }
        );
        setProcessedDetails(processedDetails);
      } catch (e) {
        console.error("Error processing results:", e);
      }
    }
  }, [result]);

  const answers = processedDetails || [];

  // Fix the formatted exam data - Use examName instead of exerciseName
  const formattedExamData = useMemo(() => {
    return {
      ...result,
      exerciseType: "multiple-choice",
      exerciseName: result.examName, // Add this line to map examName to exerciseName
      answers: processedDetails?.map(detail => ({
        question: detail.question,
        userAnswer: detail.userAnswer,
        correctAnswer: detail.correctAnswer,
        status: detail.status === "correct" ? "correct" : 
               detail.status === "unknown" ? "unanswered" : "incorrect",
        explanation: detail.explanation,
        isCorrect: detail.status === "correct"
      })) || []
    };
  }, [result, processedDetails]);
  
  // Then in your return statement, update the ExerciseSupportChat component prop
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 h-12 border-b-2">
        <Button variant="ghost" onClick={handleNavigateBack}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>
        <h1 className="text-lg font-semibold">{result.examName || "Kết quả bài tập"}</h1>
      </div>
      
      <div className={`flex-1 p-4 ${showSupport ? 'flex overflow-hidden' : 'flex justify-center overflow-hidden'}`}>
        <div className={showSupport 
          ? "w-1/2 pr-2 overflow-hidden" 
          : "w-2/3 max-w-3xl overflow-hidden"}>
          <Card className="mx-auto relative flex flex-col h-[calc(100vh-120px)]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Kết quả bài tập - Trắc nghiệm</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-20">
              {/* Use a regular div with overflow instead of ScrollArea */}
              <div ref={contentScrollRef} className="overflow-auto scrollbar-hide">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center bg-blue-500 dark:bg-blue-700 text-white mb-4">
                    <span className="text-4xl font-bold">{Number(result.score)}/10</span>
                  </div>
                  
                  <div className="w-full mt-2">
                    <div className="text-center mb-4">
                      <Badge 
                        variant="secondary"
                        className="text-lg px-4 py-2 bg-blue-100 text-blue-800"
                      >
                        {result.score >= 9 ? "Xuất sắc" : 
                         result.score >= 7 ? "Tốt" : 
                         result.score >= 5 ? "Trung bình" : "Cần cải thiện"}
                      </Badge>
                    </div>
                    <div className={`grid gap-4 mb-6 ${showSupport ? 'grid-cols-1' : 'grid-cols-3'}`}>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Target className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <div className="text-xl font-bold text-blue-600">
                          {answers.filter((r: ProcessedDetail) => r.status === 'correct').length}/{answers.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Số câu đúng</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                        <div className="text-xl font-bold text-green-600">
                          {answers.length > 0 ? Math.round((answers.filter((r: ProcessedDetail) => r.status === 'correct').length / answers.length) * 100) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Tỷ lệ đúng</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                        <div className="text-xl font-bold text-purple-600">
                          {answers.length > 0 ? (Number(result.score) / answers.length).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-xs text-muted-foreground">Điểm TB/câu</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full mt-2">
                    <h3 className="font-medium text-lg mb-2">Kết quả chi tiết:</h3>
                    <div className={`${showSupport ? 'space-y-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
                      {answers.map((answer: ProcessedDetail, index: number) => (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-4 ${
                            answer.status === 'correct' 
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/10' 
                              : answer.status === 'partial'
                                ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10'
                                : answer.status === 'incorrect'
                                  ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                                  : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10'
                          } ${showSupport ? 'h-auto' : 'h-full flex flex-col'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-lg line-clamp-2">Câu {answer.questionNumber}: {answer.question}</p>
                            <Badge 
                              variant={
                                answer.status === 'correct' 
                                  ? "success" 
                                  : answer.status === 'partial'
                                    ? "secondary"
                                    : answer.status === 'incorrect' 
                                      ? "destructive" 
                                      : "outline"
                              }
                              className={`ml-2 shrink-0 ${
                                answer.status === 'partial' 
                                  ? "bg-orange-500 text-white hover:bg-orange-600"
                                  : ""
                              }`}
                            >
                              {answer.status === 'correct' 
                                ? "Đúng" 
                                : answer.status === 'partial'
                                  ? "Thiếu"
                                  : answer.status === 'incorrect' 
                                    ? "Sai" 
                                    : "Chưa trả lời"}
                            </Badge>
                          </div>
                          
                          <div className="mb-2">
                            <p className="font-medium">Bạn đã chọn:</p>
                            <p className={`${
                              answer.status === 'correct' 
                                ? 'text-green-600 dark:text-green-400' 
                                : answer.status === 'partial'
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : answer.status === 'incorrect'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-yellow-600 dark:text-yellow-400'
                            } ml-2`}>
                              {answer.userAnswer || "Không trả lời"}
                            </p>
                          </div>
                          
                          {answer.explanation && (
                            <div className="mt-2 pt-2 border-t border-dashed">
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                {answer.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t">
              <div className="flex flex-row gap-2 justify-between">
                <Button 
                  onClick={handleNavigateBack}
                  className="flex-1"
                  variant="outline"
                >
                  Quay lại danh sách bài tập
                </Button>
                <Button 
                  onClick={toggleSupport}
                  variant="default" 
                  className={`flex-1 flex items-center gap-2 ${showSupport ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {showSupport ? (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      Ẩn hỗ trợ
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-4 w-4" />
                      Yêu cầu hỗ trợ
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {showSupport && (
          <div className="w-1/2 pl-2 h-[calc(100vh-120px)] overflow-hidden">
            <ExerciseSupportChat 
              exerciseId={result.exerciseId}
              resultId={result.id}
              exerciseName={result.examName} // Change to use examName directly
              modelId={result.modelId}
              examData={formattedExamData}
            />
          </div>
        )}
      </div>
      
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;     /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;             /* Chrome, Safari and Opera */
        }
        
        /* Hide scrollbars for all overflow containers */
        .overflow-y-auto, .overflow-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .overflow-y-auto::-webkit-scrollbar, .overflow-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
