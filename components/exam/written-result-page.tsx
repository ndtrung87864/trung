"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, User, Trophy, Target, HelpCircle, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ExamSupportChat } from "./exam-support-chat";

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

interface WrittenResultPageProps {
  result: {
    id: string;
    examId: string;
    examName: string;
    userId: string;
    userName: string;
    score: number;
    duration: string | null;
    isEssayType: boolean | null;
    answers: WrittenAnswer[];
    createdAt: string;
    modelId: string;
    modelName: string;
  };
  channelInfo?: {
    channelId?: string;
    serverId?: string;
  };
  examId?: string;
  resultId?: string;
}

export const WrittenResultPage = ({ result, channelInfo }: WrittenResultPageProps) => {
  const router = useRouter();
  const [showSupport, setShowSupport] = useState(false);

  const handleBackToExams = () => {
    const serverId = channelInfo?.serverId;
    const channelId = channelInfo?.channelId;
    
    if (serverId && channelId) {
      router.push(`/servers/${serverId}/exams/${channelId}`);
    } else if (serverId) {
      router.push(`/servers/${serverId}/exams`);
    } else {
      router.push("/exams");
    }
  };

  const toggleSupport = () => {
    setShowSupport(!showSupport);
  };

  const writtenAnswers = Array.isArray(result.answers) ? result.answers : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={handleBackToExams}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-lg font-semibold">{result.examName || "Bài kiểm tra"}</h1>
      </div>
      
      <div className={`flex-1 p-4 ${showSupport ? 'flex overflow-hidden' : 'flex justify-center overflow-hidden'}`}>
        <div className={showSupport 
          ? "w-1/2 pr-2 overflow-hidden" 
          : "w-2/3 max-w-3xl overflow-hidden"}>
          <Card className="mx-auto relative flex flex-col h-[calc(100vh-120px)]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Kết quả bài kiểm tra - Tự luận</CardTitle>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {result.userName}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-20">
              <div className="overflow-auto scrollbar-hide">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center bg-red-500 dark:bg-red-700 text-white mb-4">
                    <span className="text-4xl font-bold">{Number(result.score).toFixed(1)}/10</span>
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
                        <div className="text-xl font-bold text-blue-600">{writtenAnswers.length}</div>
                        <div className="text-xs text-muted-foreground">Tổng số câu</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                        <div className="text-xl font-bold text-green-600">
                          {Math.round((result.score / 10) * 100)}%
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
                            return { label: "Khá", color: "border-cyan-300 bg-cyan-50 dark:bg-cyan-900/10", variant: "outline" as const };
                          if (percentage >= 30) 
                            return { label: "Trung bình", color: "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10", variant: "outline" as const };
                          if (percentage >= 10) 
                            return { label: "Yếu", color: "border-orange-300 bg-orange-50 dark:bg-orange-900/10", variant: "outline" as const };
                          return { label: "Kém", color: "border-red-300 bg-red-50 dark:bg-red-900/10", variant: "destructive" as const };
                        };

                        const statusInfo = getStatusInfo(status, percentage);

                        return (
                          <div 
                            key={index} 
                            className={`border rounded-lg p-4 ${statusInfo.color} ${showSupport ? 'h-auto' : 'h-full flex flex-col'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-lg line-clamp-2">Câu {index + 1}</p>
                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <Badge variant={statusInfo.variant}>
                                  {statusInfo.label}
                                </Badge>
                                <Badge variant="outline">
                                  {questionScore.toFixed(1)}/{maxScore.toFixed(1)}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="mb-2">
                              <p className="text-sm font-medium">Câu hỏi:</p>
                              <p className="text-sm text-muted-foreground line-clamp-2 ml-2">
                                {answer.question}
                              </p>
                            </div>
                            
                            <div className="mb-2">
                              <p className="text-sm font-medium">Câu trả lời:</p>
                              <p className="text-sm text-muted-foreground line-clamp-3 ml-2">
                                {answer.answer || "Không có câu trả lời"}
                              </p>
                            </div>
                            
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Tỷ lệ hoàn thành (từng phần)</span>
                                <span>{percentage.toFixed(1)}%</span>
                              </div>
                              <Progress value={percentage} className="h-1" />
                            </div>
                            
                            {(answer.standardAnswer || answer.detailsBreakdown || answer.calculation || answer.analysis || answer.strengths || answer.improvements) && (
                              <div className="mt-2 pt-2 border-t border-dashed">
                                <details className="group">
                                  <summary className="text-xs font-medium cursor-pointer text-blue-600 hover:text-blue-800">
                                    Xem chi tiết chấm điểm từng phần
                                  </summary>
                                  <div className="mt-2 space-y-2 text-xs">
                                    {answer.standardAnswer && (
                                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                        <span className="font-medium text-green-700 dark:text-green-300">Đáp án chuẩn: </span>
                                        <span className="text-green-800 dark:text-green-200">{answer.standardAnswer}</span>
                                      </div>
                                    )}
                                    {answer.analysis && (
                                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                        <span className="font-medium text-blue-700 dark:text-blue-300">Phân tích câu hỏi: </span>
                                        <span className="text-blue-800 dark:text-blue-200">{answer.analysis}</span>
                                      </div>
                                    )}
                                    {answer.detailsBreakdown && (
                                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                                        <span className="font-medium text-purple-700 dark:text-purple-300">Chi tiết chấm điểm: </span>
                                        <div className="text-purple-800 dark:text-purple-200 whitespace-pre-line mt-1">
                                          {answer.detailsBreakdown}
                                        </div>
                                      </div>
                                    )}
                                    {answer.strengths && (
                                      <div>
                                        <span className="font-medium text-green-600">Điểm mạnh: </span>
                                        <span className="text-muted-foreground">{answer.strengths}</span>
                                      </div>
                                    )}
                                    {answer.improvements && (
                                      <div>
                                        <span className="font-medium text-orange-600">Cần cải thiện: </span>
                                        <span className="text-muted-foreground">{answer.improvements}</span>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t">
              <div className="flex flex-row gap-2 justify-between">
                <Button 
                  onClick={handleBackToExams}
                  className="flex-1"
                  variant="outline"
                >
                  Quay lại danh sách bài kiểm tra
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
            <ExamSupportChat 
              examId={result.examId}
              examName={result.examName}
              modelId={result.modelId}
              examData={{
                ...result,
                duration: result.duration ?? undefined,
                isEssayType: result.isEssayType ?? undefined,
                examType: 'written', // Explicitly mark as written exam
                answers: writtenAnswers.map((answer, index) => ({
                  ...answer,
                  type: 'written', // Ensure type is marked
                  questionNumber: index + 1,
                  question: {
                    text: answer.question,
                    type: 'written'
                  }
                }))
              }}
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
        
        /* Also hide scrollbars for CardContent */
        .flex-1.overflow-y-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
