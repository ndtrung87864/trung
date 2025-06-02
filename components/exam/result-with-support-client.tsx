"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, HelpCircle, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExamSupportChat } from "./exam-support-chat";
import { WrittenResultPage } from "./written-result-page";
import { Target, Trophy } from "lucide-react";

// Define the Answer type if not imported from elsewhere
type Answer = {
  status?: 'correct' | 'incorrect' | 'partial' | string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  userAnswer?: string;
  explanation?: string;
  question?: {
    text?: string;
    type?: string;
  };
  score?: number;
  percentage?: number;
  correctAnswer?: string;
  detailsBreakdown?: Record<string, unknown>;
  calculation?: Record<string, unknown>;
  analysis?: string | string[];
  strengths?: string | string[];
  improvements?: string | string[];
};

// Update the interface to include latePenalty
interface ResultWithSupportClientProps {
  result: {
    id: string;
    examId: string;
    examName: string;
    userId: string;
    userName: string;
    score: number;
    duration: string | null;
    isEssayType: boolean | null;
    answers: Answer[];
    createdAt: string;
    modelId: string;
    modelName: string;
    channelId?: string;
    serverId?: string;
    latePenalty?: {
      amount: number;
      note: string;
      originalScore: number;
    };
  };
}

const ResultWithSupportClient = ({ result }: ResultWithSupportClientProps) => {
  const router = useRouter();
  const [showSupport, setShowSupport] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{
    channelId?: string;
    serverId?: string;
  } | null>(null);
  
  // Use refs for scrollable areas to avoid re-renders
  const contentScrollRef = useRef<HTMLDivElement>(null);
  
  const answers = Array.isArray(result.answers) ? result.answers : [];

  const toggleSupport = () => {
    setShowSupport(!showSupport);
  };

  // Only fetch channel info once on component mount
  useEffect(() => {
    // Set from props directly if available
    if (result.channelId && result.serverId) {
      setChannelInfo({
        channelId: result.channelId,
        serverId: result.serverId
      });
      return;
    }
    
    // Otherwise fetch from API
    if (result.examId) {
      fetch(`/api/exams/${result.examId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.channelId && data?.channel?.server?.id) {
            setChannelInfo({
              channelId: data.channelId,
              serverId: data.channel.server.id
            });
          }
        })
        .catch(err => console.error("Error fetching exam details:", err));
    }
  }, [result.examId, result.channelId, result.serverId]);

  const handleBackToExams = () => {
    // Use serverId to create consistent navigation
    const serverId = result?.serverId || channelInfo?.serverId;
    
    if (serverId) {
      router.push(`/servers/${serverId}/exams/${channelInfo?.channelId}`);
    } else {
      // Fallback to the general exams page
      router.push("/exams");
    }
  };

  // Enhanced logic to detect written-type exams
  const isWrittenExam =
    result.answers &&
    Array.isArray(result.answers) &&
    result.answers.some(
      (a: Answer) =>
        a.type === 'written' ||
        (a.question && a.question.type === 'written')
    );

  // For written-type exams, use the new WrittenResultPage
  if (isWrittenExam) {
    // Transform Answer objects into WrittenAnswer objects
    const transformedAnswers = result.answers.map((answer: Answer) => {
      // Extract the question text from various possible formats
      const questionText = 
        typeof answer.question === 'object' && answer.question 
          ? answer.question.text || "No question text available"
          : typeof answer.question === 'string'
            ? answer.question
            : "No question text available";
      
      // Create a properly formatted WrittenAnswer
      return {
        question: questionText,
        answer: answer.userAnswer || "",
        score: typeof answer.score === 'number' ? answer.score : 0,
        maxScore: 10, // Default max score
        percentage: typeof answer.percentage === 'number' ? answer.percentage : 0,
        status: answer.status || "unanswered",
        standardAnswer: answer.correctAnswer,
        // Include other optional properties if they exist - convert objects to strings
        detailsBreakdown: answer.detailsBreakdown ? JSON.stringify(answer.detailsBreakdown) : undefined,
        calculation: answer.calculation ? JSON.stringify(answer.calculation) : undefined,
        analysis: Array.isArray(answer.analysis) ? answer.analysis.join('\n') : answer.analysis,
        strengths: Array.isArray(answer.strengths) ? answer.strengths.join('\n') : answer.strengths,
        improvements: Array.isArray(answer.improvements) ? answer.improvements.join('\n') : answer.improvements,
      };
    });
    
    // Create a new result object with the transformed answers
    const transformedResult = {
      ...result,
      answers: transformedAnswers
    };
    
    return (
      <WrittenResultPage 
        result={transformedResult}
        channelInfo={channelInfo ?? undefined}
      />
    );
  }

  // For essay-type exams
  if (result.isEssayType) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={handleBackToExams}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">{result.examName || "Bài kiểm tra"}</h1>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 ${showSupport ? 'flex' : 'flex justify-center'}`}>
          <div className={showSupport ? "w-1/2 pr-2" : "w-2/3 max-w-3xl"}>
            <Card className="mx-auto relative flex flex-col h-[calc(100vh-120px)]">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Kết quả bài kiểm tra</CardTitle>
                <CardDescription>Bài tự luận đã được nộp thành công</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pb-20">
                {/* Use a regular div with overflow instead of ScrollArea */}
                <div ref={contentScrollRef} className="overflow-auto">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 mb-4">
                      <CheckCircle className="h-16 w-16 text-blue-500" />
                    </div>
                    
                    <p className="text-lg font-medium mb-6">Bài làm của bạn đã được nộp</p>
                    
                    {Array.isArray(result.answers) && result.answers.some((a: Answer) => a.fileUrl) && (
                      <div className="w-full">
                        <h3 className="font-medium text-lg mb-2">Tài liệu đã nộp:</h3>
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          {result.answers
                            .filter((a: Answer) => a.fileUrl)
                            .map((answer: Answer, index: number) => (
                              <div key={index} className="flex items-center justify-between">
                                <span>{answer.fileName || "Tài liệu " + (index + 1)}</span>
                                <a
                                  href={answer.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  Xem tài liệu
                                </a>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="mt-6 text-muted-foreground text-center">
                      Giáo viên sẽ chấm điểm và thông báo kết quả sau.
                    </p>
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
                  examType: 'multiple-choice',
                  isEssayType: result.isEssayType === null ? undefined : result.isEssayType,
                  duration: result.duration === null ? undefined : result.duration,
                  score: result.score,
                  createdAt: result.createdAt,
                  answers: result.answers.map(answer => ({
                    type: answer.type,
                    score: answer.score,
                    percentage: answer.percentage,
                    status: answer.status,
                    question: answer.question,
                    userAnswer: answer.userAnswer,
                    correctAnswer: answer.correctAnswer,
                    explanation: answer.explanation,
                    strengths: Array.isArray(answer.strengths) ? answer.strengths.join('\n') : (answer.strengths as string),
                    improvements: Array.isArray(answer.improvements) ? answer.improvements.join('\n') : (answer.improvements as string),
                    analysis: Array.isArray(answer.analysis) ? answer.analysis.join('\n') : (answer.analysis as string)
                  }))
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // For multiple-choice exams
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 h-12 border-b-2">
        <Button variant="ghost" onClick={handleBackToExams}>
          <ArrowLeft className="h-4 w-4" />
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
              <CardTitle className="text-2xl">Kết quả bài kiểm tra - Trắc nghiệm </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pb-20">
              {/* Use a regular div with overflow instead of ScrollArea */}
              <div ref={contentScrollRef} className="overflow-auto scrollbar-hide">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center  bg-red-500 dark:bg-red-700 text-white  mb-4">
                    <span className="text-4xl font-bold">{Number(result.score)}/10</span>
                  </div>
                  
                  {/* Display late penalty information if available */}
                  {result.latePenalty && (
                    <div className="w-full mb-6">
                      <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                            Nộp muộn
                          </Badge>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                          {result.latePenalty.note}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span>Điểm gốc:</span>
                          <span className="font-medium">{result.latePenalty.originalScore.toFixed(1)}/10</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Trừ điểm:</span>
                          <span className="font-medium text-red-600">-{result.latePenalty.amount.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t mt-2 pt-2">
                          <span>Điểm sau khi trừ:</span>
                          <span className="font-medium">{result.score.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                          {answers.filter((r: Answer) => r.status === 'correct').length}/{answers.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Số câu đúng</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                        <div className="text-xl font-bold text-green-600">
                          {answers.length > 0 ? Math.round((answers.filter((r: Answer) => r.status === 'correct').length / answers.length) * 100) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Tỷ lệ đúng</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                        <div className="text-xl font-bold text-purple-600">
                          {answers.length > 0 ? (Number(result.score) / answers.length).toFixed(3) : '0.0'}
                        </div>
                        <div className="text-xs text-muted-foreground">Điểm TB/câu</div>
                      </div>
                    </div>
                    
                  </div>
                  
                  <div className="w-full mt-2">
                    <h3 className="font-medium text-lg mb-2">Kết quả chi tiết:</h3>
                    <div className={`${showSupport ? 'space-y-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
                      {answers.map((answer: Answer, index: number) => (
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
                            <p className="font-medium text-lg line-clamp-2">Câu {index + 1}: {answer.question?.text}</p>
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
                isEssayType: result.isEssayType === null ? undefined : result.isEssayType,
                duration: result.duration === null ? undefined : result.duration,
                answers: result.answers.map(answer => ({
                  ...answer,
                  strengths: Array.isArray(answer.strengths) ? answer.strengths.join('\n') : answer.strengths,
                  improvements: Array.isArray(answer.improvements) ? answer.improvements.join('\n') : answer.improvements,
                  analysis: Array.isArray(answer.analysis) ? answer.analysis.join('\n') : answer.analysis
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

export default ResultWithSupportClient;
