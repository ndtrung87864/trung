"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, File, Download, HelpCircle, MessageSquare, RefreshCw, XCircle, Target, CheckCircle, Trophy } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ExamSupportChat } from "@/components/exam/exam-support-chat";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ResultWithSupportClient = dynamic(
  () => import('./result-with-support-client'),
  { ssr: false }
);

// Component chính
interface ExamResult {
  isEssayType?: boolean;
  answers?: Array<{
    type?: string;
    fileUrl?: string;
    fileName?: string;
    feedback?: string;
  }>;
  score?: number;
  examName?: string;
  examId?: string;
  id?: string;
  channelId?: string;
  serverId?: string;
  modelId?: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
  modelName?: string;
  duration?: number | null;
  [key: string]: unknown; 
}

export const ResultPageClient = ({ result }: { result: ExamResult }) => {
  const isEssayType =
    result.isEssayType ||
    (result.answers && result.answers.length > 0 && result.answers[0].type === "essay");

  if (!isEssayType) {
    return <MultipleChoiceResultPage result={result} />;
  }

  return <EssayResultPage result={result} />;
};

// Component cho bài kiểm tra trắc nghiệm - separated to prevent re-renders from affecting parent
const MultipleChoiceResultPage = ({ result }: { result: ExamResult }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ResultWithSupportClient
      result={{
        id: result.id ?? "",
        examId: result.examId ?? "",
        examName: result.examName ?? "",
        userId: result.userId ?? "",
        userName: result.userName ?? "",
        score: result.score ?? 0,
        duration: result.duration !== null && result.duration !== undefined ? String(result.duration) : null,
        isEssayType: result.isEssayType ?? null,
        answers: result.answers ?? [],
        createdAt: result.createdAt ?? "",
        modelId: result.modelId ?? "",
        modelName: result.modelName ?? "",
        channelId: result.channelId,
        serverId: result.serverId,
      }}
    />
  );
};

// Component for essay exams - separated to prevent state updates affecting other components
const EssayResultPage = ({ result }: { result: ExamResult }) => {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [essayFeedback, setEssayFeedback] = useState<string | null>(null);
  const [parsedFeedback, setParsedFeedback] = useState<{
    score?: string;
    strengths?: string[];
    weaknesses?: string[];
    comments?: string;
  }>({});
  const [isRegradeDialogOpen, setIsRegradeDialogOpen] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{
    channelId?: string;
    serverId?: string;
  } | null>(null);

  // Prevent scroll area re-renders
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isTimeExpiredSubmission =
    result.answers &&
    Array.isArray(result.answers) &&
    result.answers.length > 0 &&
    result.answers[0].fileUrl === "null" &&
    result.answers[0].feedback &&
    result.answers[0].feedback.includes("Hết thời gian, chưa nộp bài");

  // Process feedback only once on mount
  useEffect(() => {
    // Parse essay feedback if available
    if (result.answers && result.answers.length > 0) {
      const feedback = result.answers[0].feedback;
      if (feedback) {
        setEssayFeedback(feedback);
        
        try {
          const parsedData: {
            score?: string;
            strengths?: string[];
            weaknesses?: string[];
            comments?: string;
          } = {};
          
          // Parse score
          const scoreMatch = feedback.match(/ĐIỂM SỐ:\s*(\d+([.,]\d+)?)\/10/);
          if (scoreMatch) {
            parsedData.score = scoreMatch[1];
          }
          
          // Parse sections with safer string handling
          const sections = [
            {
              key: "strengths",
              pattern: /(?:ĐIỂM MẠNH|ĐIỂM TÍCH CỰC|ƯU ĐIỂM):([\s\S]*?)(?=ĐIỂM YẾU|NHƯỢC ĐIỂM|ĐIỂM HẠN CHẾ|NHẬN XÉT|$)/i
            },
            {
              key: "weaknesses",
              pattern: /(?:ĐIỂM YẾU|NHƯỢC ĐIỂM|ĐIỂM HẠN CHẾ):([\s\S]*?)(?=NHẬN XÉT|$)/i
            },
            {
              key: "comments",
              pattern: /(?:NHẬN XÉT CHUNG|NHẬN XÉT|ĐÁNH GIÁ):([\s\S]*?)$/i
            }
          ];
          
          sections.forEach(section => {
            const match = feedback.match(section.pattern);
            if (match && match[1]) {
              if (section.key === "comments") {
                parsedData.comments = match[1].trim();
              } else {
                const items = match[1]
                  .split(/[-•*]/)
                  .map((item: string) => item.trim())
                  .filter((item: string) => item);
                
                if (section.key === "strengths") {
                  parsedData.strengths = items;
                } else if (section.key === "weaknesses") {
                  parsedData.weaknesses = items;
                }
              }
            }
          });
          
          // Clean up comments
          if (parsedData.comments) {
            let cleanedComments = parsedData.comments;
            
            // Remove references to strengths/weaknesses to avoid duplicates
            if (parsedData.strengths) {
              parsedData.strengths.forEach(strength => {
                cleanedComments = cleanedComments.replace(strength, '');
              });
            }
            
            if (parsedData.weaknesses) {
              parsedData.weaknesses.forEach(weakness => {
                cleanedComments = cleanedComments.replace(weakness, '');
              });
            }
            
            // Clean formatting
            parsedData.comments = cleanedComments
              .replace(/[-•*]\s*/g, "")
              .replace(/\n+/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          }
          
          setParsedFeedback(parsedData);
        } catch (e) {
          console.error("Error parsing feedback:", e);
        }
      }
    }
  }, [result.answers]);
  
  // Fetch channel info separately with stable dependencies
  useEffect(() => {
    // Only fetch if we need to
    if (!result.channelId || !result.serverId) {
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
    } else {
      // Set directly from result if available
      setChannelInfo({
        channelId: result.channelId,
        serverId: result.serverId
      });
    }
  }, [result.examId, result.channelId, result.serverId]);

  const getFileUrl = () => {
    if (result.answers && 
        Array.isArray(result.answers) && 
        result.answers.length > 0 && 
        !isTimeExpiredSubmission) {
      return result.answers[0].fileUrl || null;
    }
    return null;
  };

  const getFileName = () => {
    if (result.answers && Array.isArray(result.answers) && result.answers.length > 0) {
      return result.answers[0].fileName || "attachment.pdf";
    }
    return "attachment.pdf";
  };

  const viewSubmissionFile = () => {
    const fileUrl = getFileUrl();
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      toast({
        title: "File không khả dụng",
        description: "Không thể tìm thấy file bài làm.",
        variant: "destructive",
      });
    }
  };

  const downloadSubmissionFile = () => {
    const fileUrl = getFileUrl();
    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = getFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast({
        title: "File không khả dụng",
        description: "Không thể tìm thấy file bài làm.",
        variant: "destructive",
      });
    }
  };

  const handleRegrade = async () => {
    try {
      setIsRegrading(true);

      const fileUrl = result.answers && result.answers.length > 0 ? result.answers[0]?.fileUrl : undefined;

      if (!fileUrl) {
        toast({
          title: "Lỗi chấm lại bài",
          description: "Không tìm thấy file bài làm",
          variant: "destructive",
        });
        return;
      }

      const regradeResponse = await fetch(`/api/exams/${result.examId}/grade-essay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resultId: result.id,
          fileUrl: fileUrl,
        }),
      });

      if (!regradeResponse.ok) {
        throw new Error("Không thể chấm lại bài tự luận");
      }

      toast({
        title: "Chấm lại thành công",
        description: "Bài kiểm tra đã được chấm lại. Trang sẽ tải lại sau giây lát.",
        variant: "default",
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error regrading exam:", error);
      toast({
        title: "Lỗi chấm lại bài",
        description: error instanceof Error ? error.message : "Đã có lỗi xảy ra khi chấm lại bài",
        variant: "destructive",
      });
    } finally {
      setIsRegrading(false);
      setIsRegradeDialogOpen(false);
    }
  };

  const handleBackToExams = () => {
    const serverId = result?.serverId || channelInfo?.serverId;

    if (serverId) {
      router.push(`/servers/${serverId}/exams/${channelInfo?.channelId}`);
    } else {
      router.push("/exams");
    }
  };

  return (
    <div className="flex-2 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBackToExams}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </div>
        <h1 className="text-lg font-semibold">{result.examName || "Bài kiểm tra"}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRegradeDialogOpen(true)}
          className="mr-2"
          title="Chấm lại bài kiểm tra"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 ${showChat ?  'flex overflow-hidden' : 'flex justify-center overflow-hidden'}`}>
        <div className={showChat ?  "w-1/2 pr-2 overflow-hidden" 
          : "w-2/3 max-w-3xl overflow-hidden"}>
          <Card className="flex-1 flex flex-col h-full">
            <CardHeader className="pb-2 text-center">
              <CardTitle>Kết quả bài kiểm tra - Thực hành</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden pt-2">
              {/* Use a div with overflow instead of ScrollArea to avoid infinite loop */}
              <div 
                ref={scrollAreaRef}
                className="h-[calc(100vh-320px)] overflow-y-auto pr-4 scrollbar-hide"
              >
                <div className="flex-1 p-4 flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-red-500 dark:bg-red-700 text-white flex items-center justify-center">
                    <span className="text-2xl font-bold">{result.score}/10</span>
                  </div>
                </div>
                
                {/* Add statistics cards for essay exams */}
                {!isTimeExpiredSubmission && essayFeedback && (
                  <div className={`grid gap-4 mb-6 ${showChat ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Target className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <div className="text-xl font-bold text-blue-600">1</div>
                      <div className="text-xs text-muted-foreground">Bài làm</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <div className="text-xl font-bold text-green-600">
                        {Math.round(((result.score ?? 0) / 10) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Tỷ lệ hoàn thành</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-xl font-bold text-purple-600">
                        {(result.score ?? 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Điểm số</div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {isTimeExpiredSubmission ? (
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                      <div className="flex items-start mb-2">
                        <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                        <p className="font-medium text-lg text-red-600">Hết thời gian làm bài</p>
                      </div>
                      <p className="text-center mt-2">
                        Bạn đã không nộp bài trước khi hết thời gian làm bài. Hệ thống đã tự động ghi nhận kết quả với điểm số 0.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <File className="h-5 w-5 mr-2 text-blue-500" />
                          <span className="font-medium">Bài làm đã nộp: {getFileName()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={viewSubmissionFile}>
                            Xem bài làm
                          </Button>
                          <Button variant="outline" size="sm" onClick={downloadSubmissionFile}>
                            <Download className="h-4 w-4 mr-1" />
                            Tải xuống
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {essayFeedback ? (
                    <div className="space-y-6">
                      <div className="border border-green-200 dark:border-green-900/30 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">Tổng quan</h3>
                          <Badge variant="success">{result.score}/10 điểm</Badge>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {parsedFeedback.comments
                            ? parsedFeedback.comments
                                .replace(
                                  /(?:ĐIỂM MẠNH|ĐIỂM TÍCH CỰC|ƯU ĐIỂM|ĐIỂM YẾU|NHƯỢC ĐIỂM|ĐIỂM HẠN CHẾ|NHẬN XÉT CHUNG|NHẬN XÉT|ĐÁNH GIÁ):/gi,
                                  ""
                                )
                                .trim()
                            : "Nhận xét tổng thể sẽ hiển thị ở đây."}
                        </p>
                      </div>

                      <div className={!showChat ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6"}>
                        <div className="border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                          <h3 className="font-medium text-lg mb-2">Điểm mạnh</h3>
                          {parsedFeedback.strengths && parsedFeedback.strengths.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {parsedFeedback.strengths.map((strength, index) => (
                                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Chưa có thông tin về điểm mạnh.
                            </p>
                          )}
                        </div>

                        <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/10">
                          <h3 className="font-medium text-lg mb-2">Điểm cần cải thiện</h3>
                          {parsedFeedback.weaknesses && parsedFeedback.weaknesses.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {parsedFeedback.weaknesses.map((weakness, index) => (
                                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                  {weakness}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Chưa có thông tin về điểm cần cải thiện.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <LoadingSpinner size="md" />
                      </div>
                      <p className="text-lg font-medium mb-2">Đang chấm điểm bài làm</p>
                      <p className="text-muted-foreground text-center">
                        Bài làm của bạn đang được chấm điểm. Kết quả sẽ được cập nhật sau.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 pb-4 flex justify-between">
              <Button variant="outline" className="w-full mr-2" onClick={handleBackToExams}>
                Quay lại danh sách bài kiểm tra
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowChat(!showChat)}
              >
                {showChat ? (
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
            </CardFooter>
          </Card>
        </div>        {showChat && (
          <div className="w-1/2 pl-2 h-[calc(100vh-120px)] overflow-hidden">
            <ExamSupportChat
              examId={result.examId ?? ""}
              examName={result.examName ?? ""}
              modelId={result.modelId ?? ""}
              examData={{
                ...result,
                examType: "essay", // Explicitly set exam type for essay/practical exams
                isEssayType: true, // Ensure this is marked as essay type
                duration:
                  result.duration !== null && result.duration !== undefined
                    ? String(result.duration)
                    : undefined,
              }}
            />
          </div>
        )}
      </div>

      <Dialog open={isRegradeDialogOpen} onOpenChange={setIsRegradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấm lại bài kiểm tra</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn chấm lại bài kiểm tra này? Điểm số hiện tại có thể thay đổi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegradeDialogOpen(false)} disabled={isRegrading}>
              Hủy
            </Button>
            <Button onClick={handleRegrade} disabled={isRegrading}>
              {isRegrading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Đang chấm lại...
                </>
              ) : (
                "Chấm lại"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultPageClient;