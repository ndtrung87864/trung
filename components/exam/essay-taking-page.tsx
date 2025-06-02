"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Upload, File, X, CheckCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "@/hooks/use-toast";
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SharedExamTimer } from "./shared-exam-timer";
import { 
  getEssayTimerKey, 
  parseMinutesFromPrompt, 
  formatDeadline
} from "@/lib/exam-timer";

interface ExamFile {
  name: string;
  url: string;
}

interface Exam {
  id: string;
  name: string;
  description?: string;
  files?: ExamFile[];
  model?: {
    id: string;
  };
  prompt?: string | null;
  deadline?: string | null;
  channelId?: string;
  channel?: {
    server?: {
      id?: string;
    };
  };
}

export const EssayTakingPage = ({ 
  exam, 
  documentContent, 
  examFileUrl 
}: { 
  exam?: Exam; 
  documentContent: {
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null;
  examFileUrl: string | null;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Basic state
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Add new states for grading process
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [examData, setExamData] = useState<Exam | null>(null);
  const [resolvedExamId, setResolvedExamId] = useState<string | undefined>();
  const [profileId, setProfileId] = useState<string | null>(null);
  interface ExamResult {
    id: string;
    userId: string;
    examId: string;
    [key: string]: unknown; // Add more fields as needed for your use case
  }
  const [submittedResult, setSubmittedResult] = useState<ExamResult | null>(null);
  const [checkingResult, setCheckingResult] = useState(true);
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);

  // File upload state
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  
  // Add channel information state
  const [channelInfo, setChannelInfo] = useState<{
    channelId?: string;
    serverId?: string;
  } | null>(null);
  
  // Extract exam ID from URL path
  useEffect(() => {
    const segments = (pathname ?? "").split("/");
    const idFromPath = segments[segments.length - 1];
    setResolvedExamId(idFromPath);
  }, [pathname]);

  // Load exam data
  useEffect(() => {
    if (exam) {
      setExamData(exam);
      
      // Set channel info if available in the exam prop
      if (exam.channelId && exam.channel?.server?.id) {
        setChannelInfo({
          channelId: exam.channelId,
          serverId: exam.channel.server.id
        });
      }
    } else if (resolvedExamId) {
      // Fetch exam details including channel info if not provided in props
      fetch(`/api/exams/${resolvedExamId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setExamData(data);
            
            if (data?.channelId && data?.channel?.server?.id) {
              setChannelInfo({
                channelId: data.channelId,
                serverId: data.channel.server.id
              });
            }
          }
        })
        .catch(err => console.error("Error fetching exam details:", err));
    }
  }, [exam, resolvedExamId]);

  // Get userId from API
  useEffect(() => {
    fetch("/api/profile/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => setProfileId(data?.id || null))
      .catch(() => setProfileId(null));
  }, []);

  // Check for existing result
  useEffect(() => {
    if (!resolvedExamId || !profileId) return;
    setCheckingResult(true);
    
    fetch(`/api/exam-result?examId=${resolvedExamId}&userId=${profileId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`API responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // Check if we have a valid result with required fields
        if (data && data.id && data.userId === profileId && data.examId === resolvedExamId) {
          setSubmittedResult(data);
        } else {
          setSubmittedResult(null);
        }
        setCheckingResult(false);
      })
      .catch((error) => {
        console.error("Error checking exam results:", error);
        setSubmittedResult(null);
        setCheckingResult(false);
      });
  }, [resolvedExamId, profileId]);

  // Initialize timer based on exam prompt
  useEffect(() => {
    if (!exam?.id || !exam?.prompt) return;
    
    const setupTimer = () => {
      try {
        // Try to load saved timer state
        const savedExamState = localStorage.getItem(getEssayTimerKey(exam.id));
        
        if (savedExamState) {
          const parsedState = JSON.parse(savedExamState);
          
          if (parsedState.expiresAt) {
            const expiresAt = new Date(parsedState.expiresAt).getTime();
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
            
            if (remainingSeconds > 0) {
              setTimeLeft(remainingSeconds);
              setTotalTime(parsedState.totalTime || (parseMinutesFromPrompt(exam.prompt) * 60));
              return;
            } else {
              // Timer already expired
              setIsTimerExpired(true);
            }
          }
        }
        
        // If no valid saved state, initialize new timer
        const minutes = parseMinutesFromPrompt(exam.prompt);
        if (minutes > 0) {
          const totalSeconds = minutes * 60;
          setTimeLeft(totalSeconds);
          setTotalTime(totalSeconds);
          
          // Save initial timer state
          const expiresAt = new Date(Date.now() + totalSeconds * 1000).toISOString();
          localStorage.setItem(getEssayTimerKey(exam.id), JSON.stringify({
            totalTime: totalSeconds,
            expiresAt,
            examId: exam.id,
            lastUpdated: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error("Error setting up timer:", error);
      }
    };
    
    setupTimer();
  }, [exam?.id, exam?.prompt]);
  // Save timer state to localStorage
  const saveTimerState = useCallback((currentTimeLeft: number, currentTotalTime: number) => {
    if (!exam?.id) return;
    try {
      const expiresAt = currentTimeLeft > 0 
        ? new Date(Date.now() + currentTimeLeft * 1000).toISOString() 
        : null;
      
      localStorage.setItem(getEssayTimerKey(exam.id), JSON.stringify({
        totalTime: currentTotalTime,
        expiresAt,
        examId: exam.id,
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  }, [exam?.id]);// Define a function to submit without file
  const handleSubmitWithoutFile = useCallback(async () => {
    if (!resolvedExamId || !profileId || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/exams/${resolvedExamId}/submit-essay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },        
        body: JSON.stringify({
          isTimeExpired: true,
          answers: [
            {
              type: "essay",
              score: 0,
              fileUrl: "null",
              feedback: "ĐIỂM SỐ: 0/10\n\nĐÁNH GIÁ:\n\nHết thời gian, chưa nộp bài"
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error("Lỗi khi nộp bài");
      }
      
      const result = await response.json();
      
      // Clear timer data
      if (resolvedExamId) {
        localStorage.removeItem(getEssayTimerKey(resolvedExamId));
      }
      
      // Redirect to result page
      router.push(`/exams/${resolvedExamId}/result/${result.submissionId}`);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({
        title: "Lỗi",
        description: "Không thể nộp bài. Vui lòng thử lại.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  }, [resolvedExamId, profileId, isSubmitting, router]);
  // Handle timer expiration
  const handleTimeUp = useCallback(() => {
    // Only set the timer expired flag and show toast if it's not already expired
    if (!isTimerExpired) {
      setIsTimerExpired(true);
      toast({
        title: "Hết thời gian!",
        description: "Thời gian làm bài đã kết thúc. Hệ thống sẽ tự động ghi nhận trạng thái nộp bài.",
        variant: "destructive"
      });
      
      // Auto-submit if time expires, but only do it once
      if (!isSubmitting) {
        handleSubmitWithoutFile();
      }
    }
  }, [isTimerExpired, isSubmitting, handleSubmitWithoutFile]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setAnswerFile(file);
    
    // Simulate progress for UI feedback
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setAnswerFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadProgress(0);
  };

  // Add a function to grade the essay with Gemini API
  const handleGradeEssay = async (resultId: string, fileUrl: string) => {
    try {
      // Send file for AI grading
      const gradeResponse = await fetch(`/api/exams/${resolvedExamId}/grade-essay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resultId,
          fileUrl,
          scoreScale: 10,  // Ensure this is set to 10 explicitly
          enforceScoreScale: true  // Add new flag to enforce scale
        })
      });
      
      if (!gradeResponse.ok) {
        const gradeError = await gradeResponse.json().catch(() => ({}));
        throw new Error(gradeError?.error || "Failed to grade essay");
      }
      
      return await gradeResponse.json();
    } catch (error) {
      console.error("Error grading essay:", error);
      throw error;
    }
  };

  // Modify the handleSubmitExam function to use the Dialog popup for grading
  const handleSubmitExam = async () => {
    if (!answerFile) {
      toast({
        title: "Chưa có tệp bài làm",
        description: "Vui lòng tải lên tệp bài làm của bạn trước khi nộp bài",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Calculate late submission penalty
      let latePenalty = 0;
      let lateSubmissionNote = "";
      let penaltyType = "";  // Added to track penalty type
      let originalScore = 0; // Will store the original score before penalty

      if (examData?.deadline) {
        const deadline = new Date(examData.deadline);
        const now = new Date();
        
        if (now > deadline) {
          const minutesLate = Math.floor((now.getTime() - deadline.getTime()) / (60 * 1000));
          
          if (minutesLate <= 30) {
            latePenalty = 0.5;
            penaltyType = "fixed";
            lateSubmissionNote = `Nộp muộn ${minutesLate} phút, trừ 0.5 điểm.`;
          } else if (minutesLate <= 60) {
            latePenalty = 2;
            penaltyType = "fixed";
            lateSubmissionNote = `Nộp muộn ${minutesLate} phút, trừ 2 điểm.`;
          } else {
            latePenalty = 50; // 50% penalty
            penaltyType = "percentage";
            lateSubmissionNote = `Nộp muộn ${Math.floor(minutesLate/60)} giờ ${minutesLate%60} phút, trừ 1/2 số điểm.`;
          }
        }
      }
      
      // Create form data to handle file upload
      const formData = new FormData();
      formData.append('file', answerFile);
      formData.append('examId', resolvedExamId || '');
      
      // Add late penalty info to form data if applicable
      if (latePenalty !== 0) {
        formData.append('latePenalty', JSON.stringify({
          amount: latePenalty,
          type: penaltyType,
          note: lateSubmissionNote
        }));
      }
      
      // Send to API
      const response = await fetch(`/api/exams/${resolvedExamId}/submit-essay`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to submit essay");
      }
      
      const result = await response.json();
      
      // Clear timer data immediately after successful submission
      if (resolvedExamId) {
        localStorage.removeItem(getEssayTimerKey(resolvedExamId));
      }
      
      // Start the AI grading process immediately
      if (result.success && result.submissionId && result.fileUrl) {
        // Show grading status
        setIsSubmitting(false);
        setIsGrading(true);
        setGradingProgress(10);
        
        try {
          // Simulate progress while grading is happening
          const progressInterval = setInterval(() => {
            setGradingProgress(prev => {
              if (prev >= 95) {
                clearInterval(progressInterval);
                return 95;
              }
              return Math.min(prev + Math.random() * 10, 95);
            });
          }, 2000);
          
          // Use the handleGradeEssay function to grade the submission
          const gradeResult = await handleGradeEssay(result.submissionId, result.fileUrl);
          
          clearInterval(progressInterval);
          setGradingProgress(100);
          
          // Store the original score before applying penalty
          originalScore = gradeResult.score;
          
          // Apply late penalty to the score properly based on type
          let finalScore = gradeResult.score;
          if (latePenalty > 0) {
            if (penaltyType === "fixed") {
              // Fixed penalty (0.5 or 2 points)
              finalScore = Math.max(0, finalScore - latePenalty);
            } else if (penaltyType === "percentage") {
              // Percentage penalty (50% reduction)
              finalScore = finalScore / 2;
            }
          }
          
          // Round score to one decimal place
          finalScore = Math.round(finalScore * 10) / 10;
          
          // Show success message with the score
          toast({
            title: "Bài làm đã được chấm",
            description: latePenalty !== 0
              ? `Điểm số của bạn: ${finalScore}/10 (${lateSubmissionNote})`
              : `Điểm số của bạn: ${finalScore}/10`,
            variant: "default"
          });
          
          // Apply late penalty to the submission result in the database
          if (latePenalty !== 0) {
            try {
              await fetch(`/api/exams/${result.submissionId}/update-score`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  score: finalScore, // Penalized score
                  originalScore: originalScore, // Original score before penalty
                  latePenalty: {
                    amount: latePenalty,
                    type: penaltyType,
                    note: lateSubmissionNote
                  }
                })
              });
            } catch (err) {
              console.error("Error updating score with late penalty:", err);
              // Continue with the flow even if this update fails
            }
          }
          
          // Redirect after a short delay
          setTimeout(() => {
            if (result.submissionId) {
              router.push(`/servers/${channelInfo?.serverId}/exams/detail/${resolvedExamId}/result/${result.submissionId}`);
            } else {
              router.push(`/servers/${channelInfo?.serverId}/exams/detail/${resolvedExamId}/results`);
            }
          }, 2000);
          
        } catch (gradeError) {
          console.error("Error grading essay:", gradeError);
          toast({
            title: "Lỗi khi chấm bài",
            description: "Hệ thống không thể chấm bài tự động. Bài của bạn đã được lưu và sẽ được giáo viên chấm sau.",
            variant: "destructive"
          });
          
          // Still redirect to results page after error
          setTimeout(() => {
            if (result.submissionId) {
              router.push(`/servers/${channelInfo?.serverId}/exams/detail/${resolvedExamId}/result/${result.submissionId}`);
            } else {
              router.push(`/servers/${channelInfo?.serverId}/exams/detail/${resolvedExamId}/results`);
            }
          }, 3000);
        }
      } else {
        // If no submission ID was returned, just show success and redirect
        setIsSubmissionSuccessful(true);
        toast({
          title: "Nộp bài thành công",
          description: latePenalty !== 0 
            ? `Bài làm của bạn đã được ghi nhận. ${lateSubmissionNote}`
            : "Bài làm của bạn đã được ghi nhận.",
          variant: "default"
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/exams/${resolvedExamId}/results`);
        }, 3000);
      }
      
    } catch (error) {
      console.error("Error submitting essay:", error);
      toast({
        title: "Lỗi khi nộp bài",
        description: (error instanceof Error ? error.message : "Đã xảy ra lỗi khi nộp bài, vui lòng thử lại"),
        variant: "destructive"
      });
      setIsSubmitting(false);
      setIsGrading(false);
    }  
  };

  // Add isDeadlinePassed function if it's rendered in this component
  const isDeadlinePassed = (deadlineStr?: string | null) => {
    if (!deadlineStr) return false;
    try {
      const deadline = new Date(deadlineStr);
      const now = new Date();
      return now > deadline;
    } catch (error) {
      console.error("Error checking deadline:", error);
      return false;
    }
  };

  // Add a navigation handler function
  const handleBackAction = () => {
    if (channelInfo?.serverId && channelInfo?.channelId) {
      router.push(`/exams?serverId=${channelInfo.serverId}&channelId=${channelInfo.channelId}`);
    } else {
      router.push("/exams");
    }
  };

  // Loading state
  if (checkingResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Already submitted state
  if (submittedResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={handleBackAction}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">{examData?.name || "Bài kiểm tra"}</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Kết quả bài kiểm tra</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-lg font-medium mb-2">Bạn đã hoàn thành bài kiểm tra này</p>
              <p className="text-muted-foreground text-center">
                Bài làm của bạn đã được gửi đến giáo viên. Kết quả sẽ được thông báo sau.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={handleBackAction}>
                Quay lại danh sách bài kiểm tra
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Successful submission state
  if (isSubmissionSuccessful) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={handleBackAction}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">{examData?.name || "Bài kiểm tra"}</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Nộp bài thành công</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-lg font-medium mb-2">Bài làm của bạn đã được ghi nhận</p>
              <p className="text-muted-foreground text-center">
                Cảm ơn bạn đã hoàn thành bài kiểm tra. Đang chuyển hướng đến trang kết quả...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Add a new state for grading in progress
  if (isGrading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">{examData?.name || "Bài kiểm tra"}</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Đang chấm bài tự động</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
              <p className="text-lg font-medium mb-4">Hệ thống đang chấm điểm bài làm của bạn</p>
              <div className="w-full max-w-md mb-2">
                <Progress value={gradingProgress} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {gradingProgress < 30 
                  ? "Đang phân tích nội dung bài làm..." 
                  : gradingProgress < 60 
                    ? "Đang so sánh với yêu cầu đề bài..." 
                    : gradingProgress < 90 
                      ? "Đang tính toán điểm số và đánh giá..." 
                      : "Hoàn tất quá trình chấm điểm..."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main essay exam interface
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={handleBackAction}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>        <h1 className="text-lg font-semibold">{examData?.name || "Bài kiểm tra"}</h1>
        {/* Add deadline display here if it exists */}
        {examData?.deadline && (
          <div className="text-sm">
            <span>Hạn nộp: {formatDateSafely(examData.deadline)}</span>
            {isDeadlinePassed(examData.deadline) && (
              <span className="text-red-500 font-medium ml-1">[Nộp muộn]</span>
            )}
          </div>
        )}
      </div>
      {/* Timer and deadline indicators */}
      <div className="bg-amber-50 dark:bg-amber-900/20 py-2 px-4 text-xs border-b flex flex-col sm:flex-row sm:items-center gap-2">
        
        {/* Add timer display with isFinished prop */}
        {timeLeft !== null && totalTime !== null && (
          <div className="flex items-center">
            <SharedExamTimer
              initialTimeLeft={timeLeft}
              totalTime={totalTime}
              onTimeUp={handleTimeUp}
              onTimerUpdate={setTimeLeft}
              saveTimerState={saveTimerState}
              isFinished={isSubmitting || isSubmissionSuccessful || isGrading} // Stop timer when exam is being submitted
            />
          </div>
        )}
      </div>
      {/* Document Status Indicator */}
      {documentContent && (
        <div className="bg-green-50 dark:bg-green-900/20 py-1 px-4 text-xs text-green-700 dark:text-green-300 border-b flex items-center">
          <FileText className="h-3.5 w-3.5 mr-1" />
          <span>Tài liệu bài kiểm tra: {documentContent.name}</span>
        </div>
      )}
      {/* Main content area with document viewer and upload area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Left side - Document viewer */}
        <div className="relative h-full border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
          <div className="absolute inset-0">
            <iframe 
              src={examFileUrl || ""} 
              className="w-full h-full border-0" 
              title="Exam Document"
            />
          </div>
        </div>
        {/* Right side - File upload area */}
        <div className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Nộp bài làm</CardTitle>
              <CardDescription>
                Tải lên tệp bài làm của bạn (định dạng PDF, Word, hoặc file hình ảnh)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* File upload area */}
              {!answerFile ? (
                <div 
                  className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-1">Nhấp để tải lên tệp bài làm</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Hoặc kéo và thả tệp vào đây
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    Hỗ trợ PDF, DOCX, JPG, PNG (tối đa 10MB)
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Upload progress */}
                  {uploadProgress < 100 ? (
                    <div className="mb-4">
                      <p className="text-sm mb-1">Đang tải lên...</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  ) : null}
                  {/* File preview */}
                  <div className="flex-1 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Tệp bài làm</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={clearSelectedFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center p-3 border rounded bg-white dark:bg-gray-900 mb-4">
                      <File className="h-8 w-8 text-blue-500 mr-3" />
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{answerFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(answerFile.size / 1024 / 1024).toFixed(2)} MB - {answerFile.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-center text-sm text-gray-500">
                        Tệp của bạn đã sẵn sàng. Nhấn Nộp bài để hoàn thành.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleSubmitExam}
                disabled={!answerFile || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang nộp bài...
                  </>
                ) : (
                  "Nộp bài kiểm tra"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper function to format date safely
const formatDateSafely = (dateString?: string | null) => {
  return formatDeadline(dateString);
};
