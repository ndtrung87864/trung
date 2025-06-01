"use client";

import { FC, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  FileText,
  Download,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  Target,
  CheckCircle,
  Trophy,
  File,
} from "lucide-react";
import { ExerciseSupportChat } from "./exercise-support-chat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";

interface EssayExerciseResult {
  id: string;
  exerciseId: string;
  exerciseName: string;
  userId: string;
  userName: string;
  score: number;
  submittedFileUrl?: string | null;  // Updated to allow null
  submittedFileName?: string | null;  // Updated to allow null
  createdAt: string;
  modelId?: string;
  modelName?: string;
  feedback?: string | null;  // Updated to allow null
  criteriaScores?: {
    content: number;
    structure: number;
    language: number;
    creativity: number;
  } | Record<string, number> | null;  // Updated to allow Record and null
  exerciseType: "essay";
  gradedAt?: string | null;  // Updated to allow null
  gradedBy?: "AI" | "MANUAL" | string | null;  // Updated to allow generic strings and null
  answers?: Array<{
    type?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string;
    fileSize?: number;
    feedback?: string | null;
    score?: number;
    [key: string]: string | number | boolean | undefined | null;
  }>;
  exercise?: {
    files?: Array<{
      id: string;
      name: string;
      url: string;
    }>;
    channel?: {
      server?: {
        id: string;
      } | null;
    } | null;
  };
}

interface EssayExerciseResultPageProps {
  result: EssayExerciseResult;
  serverId: string;
}

export const EssayExerciseResultPage: FC<EssayExerciseResultPageProps> = ({
  result,
  serverId,
}) => {
  const [showSupport, setShowSupport] = useState(false);
  const router = useRouter();
  const [parsedFeedback, setParsedFeedback] = useState<{
    score?: string;
    strengths?: string[];
    weaknesses?: string[];
    comments?: string;
  }>({});
  const [isRegradeDialogOpen, setIsRegradeDialogOpen] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Get feedback from result.feedback or from answers array if available
    const feedbackText =
      result.feedback ||
      (Array.isArray(result.answers) &&
        result.answers.length > 0 &&
        result.answers[0].feedback);

    // Parse feedback if available
    if (feedbackText) {
      try {
        const parsedData: {
          score?: string;
          strengths?: string[];
          weaknesses?: string[];
          comments?: string;
          [key: string]: string | string[] | undefined;
        } = {};

        // Parse score
        const scoreMatch = feedbackText.match(/ĐIỂM SỐ:\s*(\d+([.,]\d+)?)\/10/);
        if (scoreMatch) {
          parsedData.score = scoreMatch[1];
        }
        // Parse sections
        const sections = [
          {
            key: "strengths" as const,
            pattern:
              /(?:ĐIỂM MẠNH|ĐIỂM TÍCH CỰC|ƯU ĐIỂM|\*\*ĐIỂM MẠNH\*\*|\*\*STRENGTHS\*\*|✅\s*\*\*ĐIỂM MẠNH:\*\*):([\s\S]*?)(?=ĐIỂM YẾU|NHƯỢC ĐIỂM|CẦN CẢI THIỆN|ĐIỂM HẠN CHẾ|\*\*CẦN CẢI THIỆN\*\*|⚠️\s*\*\*CẦN CẢI THIỆN:|NHẬN XÉT|GỢI Ý|\*\*GỢI Ý\*\*|💡\s*\*\*GỢI Ý:\*\*|$)/i,
          },
          {
            key: "weaknesses" as const,
            pattern:
              /(?:ĐIỂM YẾU|NHƯỢC ĐIỂM|CẦN CẢI THIỆN|ĐIỂM HẠN CHẾ|\*\*CẦN CẢI THIỆN\*\*|⚠️\s*\*\*CẦN CẢI THIỆN:):([\s\S]*?)(?=NHẬN XÉT|GỢI Ý|\*\*GỢI Ý\*\*|💡\s*\*\*GỢI Ý:\*\*|$)/i,
          },
          {
            key: "comments" as const,
            pattern:
              /(?:NHẬN XÉT CHUNG|NHẬN XÉT|ĐÁNH GIÁ|GỢI Ý|\*\*GỢI Ý\*\*|💡\s*\*\*GỢI Ý:\*\*):([\s\S]*?)$/i,
          },
        ];

        sections.forEach((section) => {
          const match = feedbackText.match(section.pattern);
          if (match && match[1]) {
            if (section.key === "comments") {
              parsedData[section.key] = match[1].trim();
            } else {
              parsedData[section.key] = match[1]
                .split(/[-•*]/)
                .map((item: string) => item.trim())
                .filter((item: string) => item && !item.match(/^\s*$/));
            }
          }
        });

        // Clean up comments
        if (parsedData.comments) {
          let cleanedComments = parsedData.comments;

          // Remove references to strengths/weaknesses to avoid duplicates
          if (parsedData.strengths) {
            parsedData.strengths.forEach((strength) => {
              cleanedComments = cleanedComments.replace(strength, "");
            });
          }

          if (parsedData.weaknesses) {
            parsedData.weaknesses.forEach((weakness) => {
              cleanedComments = cleanedComments.replace(weakness, "");
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
  }, [result.feedback, result.answers]);

  const handleNavigateBack = () => {
    if (serverId) {
      router.push(`/servers/${serverId}/exercises`);
    } else {
      router.push("/exercises");
    }
  };

  // Get file information from the answers or direct properties
  const getFileInfo = () => {
    if (Array.isArray(result.answers) && result.answers.length > 0) {
      const firstAnswer = result.answers[0];
      if (firstAnswer.fileUrl || firstAnswer.fileName) {
        return {
          url: firstAnswer.fileUrl,
          name: firstAnswer.fileName || "Tệp đã tải lên",
          type: firstAnswer.fileType,
          size: firstAnswer.fileSize,
        };
      }
    }

    if (result.submittedFileUrl) {
      return {
        url: result.submittedFileUrl,
        name: result.submittedFileName || "Tệp đã tải lên",
        type: "application/pdf", // Default type
        size: 0, // Size unknown
      };
    }

    return null;
  };

  const fileInfo = getFileInfo();

  const toggleSupport = () => {
    setShowSupport(!showSupport);
  };

  const viewSubmissionFile = () => {
    if (fileInfo && fileInfo.url) {
      const url = fileInfo.url.startsWith("http")
        ? fileInfo.url
        : `${fileInfo.url}`;
      window.open(url, "_blank");
    } else {
      toast({
        title: "File không khả dụng",
        description: "Không thể tìm thấy file bài làm.",
        variant: "destructive",
      });
    }
  };

  const downloadSubmissionFile = () => {
    if (fileInfo && fileInfo.url) {
      const url = fileInfo.url.startsWith("http")
        ? fileInfo.url
        : `/api/files/view?path=${encodeURIComponent(
            fileInfo.url
          )}&download=true`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileInfo.name || "download";
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

      const fileUrl = fileInfo?.url;

      if (!fileUrl) {
        toast({
          title: "Lỗi chấm lại bài",
          description: "Không tìm thấy file bài làm",
          variant: "destructive",
        });
        return;
      }

      const regradeResponse = await fetch(
        `/api/exercises/${result.exerciseId}/grade-essay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resultId: result.id,
            fileUrl: fileUrl,
          }),
        }
      );

      if (!regradeResponse.ok) {
        throw new Error("Không thể chấm lại bài Thực hành");
      }

      toast({
        title: "Chấm lại thành công",
        description: "Bài tập đã được chấm lại. Trang sẽ tải lại sau giây lát.",
        variant: "default",
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error regrading exercise:", error);
      toast({
        title: "Lỗi chấm lại bài",
        description:
          error instanceof Error
            ? error.message
            : "Đã có lỗi xảy ra khi chấm lại bài",
        variant: "destructive",
      });
    } finally {
      setIsRegrading(false);
      setIsRegradeDialogOpen(false);
    }
  };

  const formattedScore =
    result.score !== null && result.score !== undefined
      ? parseFloat(String(result.score)).toFixed(1)
      : "N/A";

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">
            {result.exerciseName || "Bài tập Thực hành"}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRegradeDialogOpen(true)}
          className="mr-2"
          title="Chấm lại bài tập"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className={`flex-1 p-4 ${showSupport ? 'flex overflow-hidden' : 'flex justify-center overflow-hidden'}`}>
        <div className={showSupport ? "w-1/2 pr-2" : "w-2/3 max-w-3xl overflow-hidden"}>
          <Card className="mx-auto relative flex flex-col h-[calc(100vh-120px)]">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-xl">
                Kết quả bài tập - Thực hành
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden pt-2">
              <div
                ref={contentScrollRef}
                className="h-[calc(100vh-250px)] overflow-y-auto pr-4 scrollbar-hide"
              >
                {result.score !== null && result.score !== undefined && (
                  <div className="flex-1 p-4 flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-red-500 dark:bg-red-700 text-white flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {formattedScore}/10
                      </span>
                    </div>
                  </div>
                )}

                {/* Statistics cards */}
                <div
                  className={`grid gap-4 mb-6 ${
                    showSupport ? "grid-cols-1" : "grid-cols-3"
                  }`}
                >
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Target className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-xl font-bold text-blue-600">1</div>
                    <div className="text-xs text-muted-foreground">Bài làm</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="text-xl font-bold text-green-600">
                      {Math.round(
                        ((parseFloat(formattedScore) || 0) / 10) * 100
                      )}
                      %
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tỷ lệ hoàn thành
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-xl font-bold text-purple-600">
                      {formattedScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Điểm số</div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* File display */}
                  {fileInfo ? (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <File className="h-5 w-5 mr-2 text-blue-500" />
                          <span className="font-medium">
                            Bài làm đã nộp: {fileInfo.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={viewSubmissionFile}
                          >
                            Xem bài làm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadSubmissionFile}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Tải xuống
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p>Không tìm thấy thông tin tệp bài làm</p>
                    </div>
                  )}{" "}
                  {/* Feedback section styled like the exam result page */}
                  {result.feedback ||
                  (Array.isArray(result.answers) &&
                    result.answers.length > 0 &&
                    result.answers[0].feedback) ? (
                    <div className="space-y-6">
                      <div
                        className={
                          !showSupport
                            ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                            : "space-y-6"
                        }
                      >
                        {parsedFeedback.strengths &&
                          parsedFeedback.strengths.length > 0 && (
                            <div className="border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                              <h3 className="font-medium text-lg mb-2">
                                Điểm mạnh
                              </h3>
                              <ul className="list-disc pl-5 space-y-1">
                                {parsedFeedback.strengths.map(
                                  (strength, index) => (
                                    <li
                                      key={index}
                                      className="text-sm text-gray-700 dark:text-gray-300"
                                    >
                                      {strength}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        {parsedFeedback.weaknesses &&
                          parsedFeedback.weaknesses.length > 0 && (
                            <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/10">
                              <h3 className="font-medium text-lg mb-2">
                                Điểm cần cải thiện
                              </h3>
                              <ul className="list-disc pl-5 space-y-1">
                                {parsedFeedback.weaknesses.map(
                                  (weakness, index) => (
                                    <li
                                      key={index}
                                      className="text-sm text-gray-700 dark:text-gray-300"
                                    >
                                      {weakness}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                      <div className="border border-green-200 dark:border-green-900/30 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">Góp ý </h3>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {parsedFeedback.comments
                            ? parsedFeedback.comments
                                .replace(
                                  /(?:ĐIỂM MẠNH|ĐIỂM TÍCH CỰC|ƯU ĐIỂM|ĐIỂM YẾU|NHƯỢC ĐIỂM|ĐIỂM HẠN CHẾ|NHẬN XÉT CHUNG|NHẬN XÉT|ĐÁNH GIÁ):/gi,
                                  ""
                                )
                                .trim()
                            : result.feedback ||
                              (Array.isArray(result.answers) &&
                                result.answers.length > 0 &&
                                result.answers[0].feedback)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <LoadingSpinner size="md" />
                      </div>
                      <p className="text-lg font-medium mb-2">
                        Đang chấm điểm bài làm
                      </p>
                      <p className="text-muted-foreground text-center">
                        Bài làm của bạn đang được chấm điểm. Kết quả sẽ được cập
                        nhật sau.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 pb-4 flex justify-between">
              <Button
                variant="outline"
                className="w-full mr-2"
                onClick={handleNavigateBack}
              >
                Quay lại danh sách bài tập
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={toggleSupport}
              >
                {showSupport ? (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ẩn hỗ trợ
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Yêu cầu hỗ trợ
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {showSupport && (
          <div className="w-1/2 pl-2 h-[calc(100vh-120px)]">
            <ExerciseSupportChat
              exerciseId={result.exerciseId}
              resultId={result.id}
              modelId={result.modelId}
              exerciseName={result.exerciseName}
              examData={{
                exerciseType: "essay",
                exerciseName: result.exerciseName,
                score: result.score,
                answers: Array.isArray(result.answers) ? result.answers.map(answer => ({
                  ...answer,
                  type: "essay",
                  feedback: answer.feedback || result.feedback || undefined,
                  fileUrl: answer.fileUrl || undefined,
                  fileName: answer.fileName || undefined
                })) : [],
                createdAt: result.createdAt,
                feedback: result.feedback || undefined,
                submittedFileUrl: result.submittedFileUrl || 
                  (Array.isArray(result.answers) && result.answers.length > 0 && result.answers[0].fileUrl) || undefined,
                submittedFileName: result.submittedFileName ||
                  (Array.isArray(result.answers) && result.answers.length > 0 && result.answers[0].fileName) || undefined,
              }}
            />
          </div>
        )}
      </div>

      <Dialog open={isRegradeDialogOpen} onOpenChange={setIsRegradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấm lại bài tập</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn chấm lại bài tập này? Điểm số hiện tại có
              thể thay đổi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRegradeDialogOpen(false)}
              disabled={isRegrading}
            >
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

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }

        /* Hide scrollbars for all overflow containers */
        .overflow-y-auto,
        .overflow-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .overflow-y-auto::-webkit-scrollbar,
        .overflow-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
