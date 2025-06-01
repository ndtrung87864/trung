"use client";

import { FC, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, HelpCircle, Target, CheckCircle, Trophy, User } from "lucide-react";
import { ExerciseSupportChat } from "./exercise-support-chat";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  aiSupport?: {
    exerciseData?: {
      exerciseId: string;
      exerciseName: string;
      score: number;
      answers: WrittenAnswer[];
      exerciseType: string;
      createdAt: string;
    };
  };
  exercise?: {
    channel?: {
      id: string;
    };
    channelId?: string;
  };
}

interface WrittenExerciseResultPageProps {
  result: WrittenExerciseResult;
  serverId: string;
}

export const WrittenExerciseResultPage: FC<WrittenExerciseResultPageProps> = ({ result, serverId }) => {
  const router = useRouter();
  const [showSupport, setShowSupport] = useState(false);
  
  const handleNavigateBack = () => {
    if (result.exercise?.channel?.id) {
      router.push(`/servers/${serverId}/exercises/${result.exercise.channelId}`);
    } else if (serverId) {
      router.push(`/servers/${serverId}/exercises`);
    } else {
      router.push('/exercises');
    }
  };

  const toggleSupport = () => {
    setShowSupport(!showSupport);
  };

  const writtenAnswers = Array.isArray(result.answers) ? result.answers : [];
  
  const formattedScore = result.score !== null && result.score !== undefined 
    ? parseFloat(String(result.score)).toFixed(1)
    : "N/A";
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button 
          variant="ghost" 
          onClick={handleNavigateBack}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-lg font-semibold">{result.exerciseName || "Bài tập Tự luận "}</h1>
      </div>
      
      <div className={`flex-1 p-4 ${showSupport ? 'flex overflow-hidden' : 'flex justify-center overflow-hidden'}`}>
        {/* Result display area */}
        <div className={showSupport 
          ? "w-1/2 pr-2 overflow-hidden" 
          : "w-2/3 max-w-3xl overflow-hidden"}>
          <Card className="mx-auto relative flex flex-col h-[calc(100vh-120px)]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Kết quả bài tập - Tự luận</CardTitle>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {result.userName}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto pb-20">
              <ScrollArea className="h-full w-full">
                {/* Result content - similar to existing code */}
                <div className="flex flex-col items-center justify-center">
                  {/* Score display */}
                  <div className="w-32 h-32 rounded-full flex items-center justify-center bg-red-500 dark:bg-red-700 text-white mb-4">
                    <span className="text-4xl font-bold">{Number(result.score).toFixed(1)}/10</span>
                  </div>
                  
                  {/* Statistics cards */}
                  <div className={`grid gap-4 mb-6 ${showSupport ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Target className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <div className="text-xl font-bold text-blue-600">{writtenAnswers.length}</div>
                      <div className="text-xs text-muted-foreground">Câu hỏi</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <div className="text-xl font-bold text-green-600">
                        {Math.round(((parseFloat(formattedScore) || 0) / 10) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Tỷ lệ hoàn thành</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-xl font-bold text-purple-600">
                        {writtenAnswers.length > 0 
                          ? (writtenAnswers.reduce((sum, answer) => sum + (answer.score || 0), 0) / writtenAnswers.length).toFixed(1)
                          : '0.0'
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Điểm TB/câu</div>
                    </div>
                  </div>

                  <div className="w-full mt-2">
                    <h3 className="font-medium text-lg mb-2">Kết quả chi tiết:</h3>
                    <div className={`${showSupport ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
                      {writtenAnswers.map((answer, index) => {
                        const questionScore = answer.score || 0;
                        const maxScore = answer.maxScore || (10 / writtenAnswers.length);
                        const percentage = answer.percentage || 0;
                        const status = answer.status || 'unanswered';
                        
                        const getStatusInfo = (status: string, percentage: number) => {
                          if (status === 'correct' || percentage >= 90) 
                            return { label: "Xuất sắc", color: "border-green-300 bg-green-50 dark:bg-green-900/10", variant: "default" as const };
                          if (percentage >= 70) 
                            return { label: "Tốt", color: "border-blue-300 bg-blue-50 dark:bg-blue-900/10", variant: "secondary" as const };
                          if (status === 'partial' || percentage >= 50) 
                            return { label: "Khá", color: "border-amber-300 bg-amber-50 dark:bg-amber-900/10", variant: "outline" as const };
                          if (percentage >= 30) 
                            return { label: "Trung bình", color: "border-orange-300 bg-orange-50 dark:bg-orange-900/10", variant: "outline" as const };
                          if (percentage >= 10) 
                            return { label: "Yếu", color: "border-pink-300 bg-pink-50 dark:bg-pink-900/10", variant: "destructive" as const };
                          return { label: "Kém", color: "border-red-300 bg-red-50 dark:bg-red-900/10", variant: "destructive" as const };
                        };

                        const statusInfo = getStatusInfo(status, percentage);

                        return (
                          <div 
                            key={index} 
                            className={`border rounded-lg p-4 ${statusInfo.color} ${showSupport ? 'h-auto' : 'h-full flex flex-col'}`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">Câu {index + 1}</h4>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            
                            <p className="text-sm mb-2 font-medium">{answer.question}</p>
                            <p className="text-sm mb-4 text-muted-foreground border-l-2 border-blue-300 pl-2 italic">
                              {answer.answer || "Không có câu trả lời"}
                            </p>
                            
                            <div className="mt-2 mb-4">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Điểm: <span className="font-medium">{questionScore.toFixed(2)}/{maxScore.toFixed(2)}</span></span>
                                <span>{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                <div 
                                  className={`h-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-blue-500' : percentage >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                  style={{ width: `${Math.max(percentage, 3)}%` }}
                                />
                              </div>
                            </div>
                            
                            {answer.standardAnswer && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Đáp án chuẩn:</span> 
                                <span className="text-green-700 dark:text-green-400 ml-1">
                                  {answer.standardAnswer}
                                </span>
                              </div>
                            )}
                            
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t">
              <div className="flex flex-row gap-2 justify-between">
                
                <Button 
                  onClick={toggleSupport}
                  variant="default" 
                  className={`flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700`}
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
        
        {/* Support chat area */}
        {showSupport && (
          <div className="w-1/2 pl-2 h-[calc(100vh-120px)] overflow-hidden">
            <ExerciseSupportChat 
              exerciseId={result.exerciseId}
              resultId={result.id}
              exerciseName={result.exerciseName}
              modelId={result.modelId}
              examData={result.aiSupport?.exerciseData || {
                exerciseId: result.exerciseId,
                exerciseName: result.exerciseName,
                score: result.score,
                answers: result.answers,
                exerciseType: 'written',
                createdAt: result.createdAt
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
