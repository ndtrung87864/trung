"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Upload, File, X, CheckCircle, Clock } from "lucide-react";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "@/hooks/use-toast";
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExerciseFile {
  name: string;
  url: string;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  files?: ExerciseFile[];
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
    serverId?: string;
  };
}

interface ExerciseResult {
  id: string;
  userId: string;
  exerciseId: string;
  [key: string]: unknown;
}

// Helper function to generate essay timer key
const getEssayTimerKey = (exerciseId: string) => {
  return `essay_timer_${exerciseId}`;
};

// Format time in mm:ss format
function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function getTimerClass(timeLeft: number, totalTime: number): string {
  if (totalTime === 0) return "bg-gray-200 text-black";
  const percent = timeLeft / totalTime;
  if (timeLeft <= 10) {
    return "bg-pink-100 text-red-600 font-bold animate-pulse";
  }
  if (percent > 0.75) {
    return "bg-gray-200 text-black";
  }
  if (percent > 0.5) {
    return "bg-green-100 text-green-700 font-semibold";
  }
  if (percent > 0.25) {
    return "bg-yellow-100 text-yellow-800 font-semibold";
  }
  return "bg-orange-100 text-orange-700 font-semibold";
}

// CountdownTimer component
const CountdownTimer = ({
  timeLeft,
  totalTime,
}: {
  timeLeft: number;
  totalTime: number;
}) => {
  return (
    <div className="flex items-center justify-center my-2">
      <div
        className={`px-3 py-2 rounded text-base flex items-center gap-2 transition-all duration-300 ${getTimerClass(
          timeLeft,
          totalTime
        )}`}
      >
        <Clock className="h-4 w-4" />
        <span className="whitespace-nowrap">
          Thời gian: {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
};

export const EssayExerciseTakingPage = ({ 
  exercise, 
  documentContent, 
  exerciseFileUrl,
  generatedPrompt,
  debugInfo
}: { 
  exercise?: Exercise; 
  documentContent: {
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null;
  exerciseFileUrl: string | null;
  generatedPrompt?: string;
  debugInfo?: { originalPrompt?: string };
}) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Basic state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [exerciseData, setExerciseData] = useState<Exercise | null>(null);
  const [resolvedExerciseId, setResolvedExerciseId] = useState<string | undefined>();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<ExerciseResult | null>(null);
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
  const [checkedCustomTimer, setCheckedCustomTimer] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add channel information state
  const [channelInfo, setChannelInfo] = useState<{
    channelId?: string;
    serverId?: string;
  } | null>(null);
  
  // Navigate confirmation dialog state
  const [isNavigateDialogOpen, setIsNavigateDialogOpen] = useState(false);
  
  // Extract exercise ID from URL path
  useEffect(() => {
    if (!pathname) return;
    
    try {
      const segments = pathname.split("/");
      const idFromPath = segments[segments.length - 1];
      setResolvedExerciseId(idFromPath);
    } catch (error) {
      console.error("Error extracting exercise ID:", error);
    }
  }, [pathname]);

  // Load exercise data
  useEffect(() => {
    const loadExerciseData = async () => {
      try {
        if (exercise) {
          setExerciseData(exercise);
          
          if (exercise.channelId && exercise.channel?.server?.id) {
            setChannelInfo({
              channelId: exercise.channelId,
              serverId: exercise.channel.server.id
            });
          } else if (exercise.channel?.serverId) {
            setChannelInfo({
              channelId: exercise.channelId,
              serverId: exercise.channel.serverId
            });
          }
        } else if (resolvedExerciseId) {
          const response = await fetch(`/api/exercises/${resolvedExerciseId}`);
          if (response.ok) {
            const data = await response.json();
            setExerciseData(data);
            
            if (data?.channelId && data?.channel?.server?.id) {
              setChannelInfo({
                channelId: data.channelId,
                serverId: data.channel.server.id
              });
            } else if (data?.channel?.serverId) {
              setChannelInfo({
                channelId: data.channelId,
                serverId: data.channel.serverId
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching exercise details:", error);
      }
    };

    loadExerciseData();
  }, [exercise, resolvedExerciseId]);

  // Get userId from API
  useEffect(() => {
    const fetchProfileId = async () => {
      try {
        const response = await fetch("/api/profile/me");
        if (response.ok) {
          const data = await response.json();
          setProfileId(data?.id || null);
        } else {
          setProfileId(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfileId(null);
      }
    };

    fetchProfileId();
  }, []);
  // Check for existing result
  useEffect(() => {
    const checkExistingResult = async () => {
      if (!resolvedExerciseId || !profileId) {
        setCheckingResult(false);
        return;
      }
      
      setCheckingResult(true);
      
      try {
        const response = await fetch(`/api/exercises/${resolvedExerciseId}/result`);
        
        // Kiểm tra nếu response là 404, có nghĩa là không tìm thấy kết quả (hợp lệ)
        if (response.status === 404) {
          setSubmittedResult(null);
          return;
        }
        
        // Kiểm tra các lỗi HTTP khác
        if (!response.ok) {
          console.warn(`API responded with status: ${response.status}`);
          setSubmittedResult(null);
          return;
        }
        
        // Xử lý dữ liệu khi response ok
        const data = await response.json();
        
        if (data && data.id && data.userId === profileId && data.exerciseId === resolvedExerciseId) {
          setSubmittedResult(data);
        } else {
          setSubmittedResult(null);
        }
      } catch (error) {
        console.error("Error checking exercise results:", error);
        setSubmittedResult(null);
      } finally {
        setCheckingResult(false);
      }
    };

    checkExistingResult();
  }, [resolvedExerciseId, profileId]);

  // Check for custom timer in URL or localStorage
  useEffect(() => {
    if (!resolvedExerciseId || checkedCustomTimer || checkingResult) return;
    
    try {
      // First check if there's an active specific timer already running
      const essayTimerKey = getEssayTimerKey(resolvedExerciseId);
      const activeTimerData = localStorage.getItem(essayTimerKey);
      
      if (activeTimerData) {
        try {
          const parsedData = JSON.parse(activeTimerData);
          if (parsedData.expiresAt) {
            const expiresAt = new Date(parsedData.expiresAt).getTime();
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
            
            if (remainingSeconds > 0) {
              console.log("[ESSAY_EXERCISE_TIMER] Found active timer with", remainingSeconds, "seconds left");
              setTimeLeft(remainingSeconds);
              setTotalTime(parsedData.totalTime || 3600); // Default to 1 hour if no total time
              setCheckedCustomTimer(true);
              return;
            } else {
              console.log("[ESSAY_EXERCISE_TIMER] Found expired timer, removing");
              localStorage.removeItem(essayTimerKey);
            }
          }
        } catch (e) {
          console.error("[ESSAY_EXERCISE_TIMER] Error parsing active timer:", e);
        }
      }
      
      // Check URL for timer parameter next
      const searchParams = new URLSearchParams(window.location.search);
      const timerParam = searchParams.get('timer');
      
      if (timerParam) {
        const minutes = parseInt(timerParam, 10);
        if (!isNaN(minutes) && minutes > 0) {
          console.log("[ESSAY_EXERCISE_TIMER] Found timer in URL:", minutes, "minutes");
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
          
          // Start the timer immediately and save to localStorage
          const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
          localStorage.setItem(getEssayTimerKey(resolvedExerciseId), JSON.stringify({
            totalTime: minutes * 60,
            expiresAt,
            examId: resolvedExerciseId,
            lastUpdated: new Date().toISOString()
          }));
          
          // Also synchronize with the global exercise_custom_timers
          try {
            const timersKey = "exercise_custom_timers";
            // Use localStorage instead of sessionStorage for consistency
            const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
            savedTimers[resolvedExerciseId] = minutes;
            localStorage.setItem(timersKey, JSON.stringify(savedTimers));
          } catch (e) {
            console.error("[ESSAY_EXERCISE_TIMER] Error syncing with global timers:", e);
          }
          
          setCheckedCustomTimer(true);
          return;
        }
      }
      
      // Check global exercise_custom_timers in localStorage
      if (typeof window !== 'undefined') {
        const timersKey = "exercise_custom_timers";
        const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
        
        if (savedTimers[resolvedExerciseId]) {
          const minutes = savedTimers[resolvedExerciseId];
          console.log("[ESSAY_EXERCISE_TIMER] Found timer in global timers:", minutes, "minutes");
          
          startNewTimer(minutes);
          setCheckedCustomTimer(true);
          return;
        } else {
          // Check exercise prompt for time limit if exists
          if (exercise?.prompt) {
            const timeMatch = exercise.prompt.match(/(\d+)\s*phút/i);
            if (timeMatch) {
              const minutes = parseInt(timeMatch[1], 10);
              console.log("[ESSAY_EXERCISE_TIMER] Found timer in exercise prompt:", minutes, "minutes");
              startNewTimer(minutes);
              setCheckedCustomTimer(true);
              return;
            }
          }
        }
      }
      
      setCheckedCustomTimer(true);
    } catch (error) {
      console.error("[ESSAY_EXERCISE_TIMER] Error checking custom timer:", error);
      setCheckedCustomTimer(true);
    }
  }, [resolvedExerciseId, checkingResult, checkedCustomTimer, exercise]);

  // Helper function to start a new timer
  const startNewTimer = (minutes: number) => {
    if (!resolvedExerciseId) return;
    
    const totalSeconds = minutes * 60;
    setTimeLeft(totalSeconds);
    setTotalTime(totalSeconds);
    
    try {
      // Save to specific essay timer key
      const expiresAt = new Date(Date.now() + totalSeconds * 1000).toISOString();
      localStorage.setItem(getEssayTimerKey(resolvedExerciseId), JSON.stringify({
        totalTime: totalSeconds,
        expiresAt,
        examId: resolvedExerciseId,
        lastUpdated: new Date().toISOString()
      }));
      
      // Synchronize with global exercise_custom_timers
      const timersKey = "exercise_custom_timers";
      const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
      savedTimers[resolvedExerciseId] = minutes;
      localStorage.setItem(timersKey, JSON.stringify(savedTimers));
      
      console.log("[ESSAY_EXERCISE_TIMER] Started new timer for", minutes, "minutes");
    } catch (error) {
      console.error("[ESSAY_EXERCISE_TIMER] Error starting new timer:", error);
    }
  };

  // Add timer countdown effect
  useEffect(() => {
    if (
      timeLeft === null ||
      totalTime === null || 
      isTimerExpired || 
      isSubmitting || 
      isGrading || 
      isSubmissionSuccessful ||
      submittedResult
    ) return;

    if (timeLeft <= 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      setIsTimerExpired(true);
      
      toast({
        title: "Hết thời gian làm bài",
        description: "Thời gian làm bài của bạn đã hết. Bài làm của bạn sẽ được nộp tự động.",
        variant: "destructive"
      });
      
      if (!isSubmitting) {
        handleTimeUp();
      }
      return;
    }

    timerRef.current = setTimeout(
      () => setTimeLeft((prev) => (prev !== null ? prev - 1 : null)),
      1000
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, totalTime, isTimerExpired, isSubmitting, isGrading, isSubmissionSuccessful, submittedResult]);

  // Save timer state every 10 seconds (reduced from 30 for more frequent updates)
  useEffect(() => {
    if (
      timeLeft === null || 
      totalTime === null || 
      isTimerExpired || 
      !resolvedExerciseId
    ) return;

    // Save immediately on mount
    saveTimerState(timeLeft, totalTime);
    
    const saveInterval = setInterval(() => {
      if (timeLeft > 0) {
        saveTimerState(timeLeft, totalTime);
      }
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(saveInterval);
      // Save on unmount as well
      if (timeLeft > 0) {
        saveTimerState(timeLeft, totalTime);
      }
    };
  }, [timeLeft, totalTime, isTimerExpired, resolvedExerciseId]);

  // Save timer state to localStorage
  const saveTimerState = (timeLeft: number, totalTime: number) => {
    if (typeof window === 'undefined' || !resolvedExerciseId) return;
    
    try {
      const essayTimerKey = getEssayTimerKey(resolvedExerciseId);
      const expiresAt = new Date(Date.now() + timeLeft * 1000).toISOString();
      
      // Save to essay-specific timer key
      localStorage.setItem(essayTimerKey, JSON.stringify({
        totalTime,
        expiresAt,
        examId: resolvedExerciseId,
        lastUpdated: new Date().toISOString()
      }));
      
      // Also update in global custom timers collection for consistency
      const timersKey = "exercise_custom_timers";
      const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
      
      // Keep the original minutes value in the global store
      if (savedTimers[resolvedExerciseId]) {
        // We don't update the minutes value here, just ensure it exists
        // This prevents the timer from changing when reloading
      } else {
        // Only add if not exists
        const minutesRemaining = Math.ceil(timeLeft / 60);
        if (minutesRemaining > 0) {
          savedTimers[resolvedExerciseId] = minutesRemaining;
          localStorage.setItem(timersKey, JSON.stringify(savedTimers));
        }
      }
      
      console.log("[ESSAY_EXERCISE_TIMER] Saved timer state:", timeLeft, "seconds left");
    } catch (error) {
      console.error("[ESSAY_EXERCISE_TIMER] Error saving timer state:", error);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Save timer state before unmounting if there's still time left
      if (timeLeft !== null && totalTime !== null && timeLeft > 0 && resolvedExerciseId) {
        console.log("[ESSAY_EXERCISE_TIMER] Saving timer state before unmount:", timeLeft, "seconds left");
        saveTimerState(timeLeft, totalTime);
      }
      
      // Clear any active timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, totalTime, resolvedExerciseId]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setAnswerFile(file);
    
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev: number) => {
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

  // Handle time up event
  const handleTimeUp = async () => {
    setIsTimerExpired(true);
    toast({
      title: "Hết thời gian làm bài",
      description: "Thời gian làm bài của bạn đã hết. Bài làm của bạn sẽ được nộp tự động.",
      variant: "destructive"
    });
    
    // Auto-submit logic
    if (answerFile) {
      await handleSubmitExercise();
    } else {
      toast({
        title: "Không có tệp để nộp",
        description: "Bạn chưa tải lên tệp bài làm nào trước khi hết thời gian.",
        variant: "destructive"
      });
    }
  };

  // Handle grading essay with API
  const handleGradeEssay = async (resultId: string, fileUrl: string) => {
    try {
      const gradeResponse = await fetch(`/api/exercises/${resolvedExerciseId}/grade-essay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resultId,
          fileUrl,
          scoreScale: 10,
          enforceScoreScale: true
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

  // Submit exercise
  const handleSubmitExercise = async () => {
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
      
      // Clear timer if it's running
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      // Clear timer data from localStorage if exists
      if (resolvedExerciseId) {
        const essayTimerKey = getEssayTimerKey(resolvedExerciseId);
        localStorage.removeItem(essayTimerKey);
        
        // Also clear from custom timers collection
        try {
          const timersKey = "exercise_custom_timers";
          const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
          if (savedTimers[resolvedExerciseId]) {
            delete savedTimers[resolvedExerciseId];
            localStorage.setItem(timersKey, JSON.stringify(savedTimers));
          }
        } catch (e) {
          console.error("Error clearing timer:", e);
        }
      }
      
      // Kiểm tra nộp muộn và tính toán penalty
      let latePenalty = null;
      if (exerciseData?.deadline) {
        const deadlineDate = new Date(exerciseData.deadline);
        const currentDate = new Date();

        if (currentDate > deadlineDate) {
          const minutesLate = Math.floor(
            (currentDate.getTime() - deadlineDate.getTime()) / (1000 * 60)
          );

          if (minutesLate > 0 && minutesLate <= 30) {
            // 1-30 phút: trừ 0.5 điểm
            latePenalty = { amount: 0.5, type: "fixed", minutes: minutesLate };
          } else if (minutesLate > 30 && minutesLate <= 60) {
            // 31-60 phút: trừ 2 điểm
            latePenalty = { amount: 2, type: "fixed", minutes: minutesLate };
          } else if (minutesLate > 60) {
            // Trên 60 phút: trừ 50% tổng điểm
            latePenalty = {
              amount: 50,
              type: "percentage",
              minutes: minutesLate,
            };
          }
        }
      }
      
      const formData = new FormData();
      formData.append('file', answerFile);
      formData.append('exerciseId', resolvedExerciseId || '');
      if (latePenalty) {
        formData.append('latePenalty', JSON.stringify(latePenalty));
      }
      
      const response = await fetch(`/api/exercises/${resolvedExerciseId}/submit-essay`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to submit essay");
      }
      
      const result = await response.json();
      
      if (result.success && result.submissionId && result.fileUrl) {
        setIsSubmitting(false);
        setIsGrading(true);
        setGradingProgress(10);
        
        try {
          const progressInterval = setInterval(() => {
            setGradingProgress((prev: number) => {
              if (prev >= 95) {
                clearInterval(progressInterval);
                return 95;
              }
              return Math.min(prev + Math.random() * 10, 95);
            });
          }, 2000);
          
          const gradeResult = await handleGradeEssay(result.submissionId, result.fileUrl);
          
          clearInterval(progressInterval);
          setGradingProgress(100);
          
          // Apply late penalty if exists
          let finalScore = gradeResult.score;
          if (latePenalty) {
            if (latePenalty.type === "fixed") {
              finalScore = Math.max(0, finalScore - latePenalty.amount);
            } else if (latePenalty.type === "percentage") {
              finalScore = finalScore * (1 - latePenalty.amount / 100);
            }
            finalScore = Math.max(0, Math.min(10, finalScore));
            
            // Update the score in the database with penalty applied
            try {
              const updateResponse = await fetch(`/api/exercises/${resolvedExerciseId}/update-score`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  resultId: result.submissionId,
                  score: finalScore,
                  latePenalty: latePenalty
                })
              });
              
              if (!updateResponse.ok) {
                console.error("Failed to update score with penalty applied");
              }
            } catch (updateError) {
              console.error("Error updating score with penalty:", updateError);
            }
            
            let penaltyMessage = "";
            if (latePenalty.type === "fixed") {
              penaltyMessage = `Bạn nộp muộn ${latePenalty.minutes} phút, điểm đã bị trừ ${latePenalty.amount} điểm.`;
            } else {
              penaltyMessage = `Bạn nộp muộn ${latePenalty.minutes} phút, điểm đã bị trừ ${latePenalty.amount}%.`;
            }
            
            toast({
              title: "Bài làm đã được chấm",
              description: `${penaltyMessage} Điểm cuối cùng của bạn: ${finalScore}/10`,
              variant: "default"
            });
          } else {
            toast({
              title: "Bài làm đã được chấm",
              description: `Điểm số của bạn: ${gradeResult.score}/10`,
              variant: "default"
            });
          }            
          
          // Update gradeResult.score for consistency
          gradeResult.score = finalScore;

          setTimeout(() => {
            if (!channelInfo?.serverId) {
              router.push(`/servers/${channelInfo?.serverId}/exercises`);
              return;
            }

            if (result.submissionId) {
              router.push(`/servers/${channelInfo.serverId}/exercises/detail/${resolvedExerciseId}/essay-result/${result.submissionId}`);
            } else {
              router.push(`/servers/${channelInfo.serverId}/exercises/detail/${resolvedExerciseId}/results`);
            }
          }, 2000);
          
        } catch (gradeError) {
          console.error("Error grading essay:", gradeError);
          toast({
            title: "Lỗi khi chấm bài",
            description: "Hệ thống không thể chấm bài tự động. Bài của bạn đã được lưu và sẽ được giáo viên chấm sau.",
            variant: "destructive"
          });            
          
          setTimeout(() => {
            if (!channelInfo?.serverId) {
              router.push(`/servers/${channelInfo?.serverId}/exercises`);
              return;
            }

            if (result.submissionId) {
              router.push(`/servers/${channelInfo.serverId}/exercises/detail/${resolvedExerciseId}/essay-result/${result.submissionId}`);
            } else {
              router.push(`/servers/${channelInfo.serverId}/exercises/detail/${resolvedExerciseId}/results`);
            }
          }, 3000);
        }
      } else {
        setIsSubmissionSuccessful(true);
        toast({
          title: "Nộp bài thành công",
          description: "Bài làm của bạn đã được ghi nhận.",
          variant: "default"
        });
          setTimeout(() => {
          if (channelInfo?.serverId) {
            router.push(`/servers/${channelInfo.serverId}/exercises/detail/${resolvedExerciseId}/results`);
          } else {
            router.push(`/exercises/${resolvedExerciseId || ""}/results`);
          }
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


  // Navigation handler with confirmation
  const handleBackAction = () => {
    // Show confirmation dialog only if we have a file uploaded but not submitted
    if (answerFile && !isSubmissionSuccessful && !isGrading && !submittedResult) {
      setIsNavigateDialogOpen(true);
    } else {
      proceedWithNavigation();
    }
  };

  // Proceed with navigation after confirmation
  const proceedWithNavigation = () => {
    setIsNavigateDialogOpen(false);
    
    // Clear timer data if exists when navigating away
    if (resolvedExerciseId && timeLeft !== null) {
      const essayTimerKey = getEssayTimerKey(resolvedExerciseId);
      localStorage.removeItem(essayTimerKey);
    }
    
    if (channelInfo?.serverId && channelInfo?.channelId) {
      router.push(`/servers/${channelInfo.serverId}/exercises/${channelInfo.channelId}`);
    } else {
      router.push(`/servers/${channelInfo?.serverId}/exercises`);
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
          <h1 className="text-lg font-semibold">{exerciseData?.name || "Bài tập"}</h1>
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
          <h1 className="text-lg font-semibold">{exerciseData?.name || "Bài tập"}</h1>
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
                Cảm ơn bạn đã hoàn thành bài tập. Đang chuyển hướng đến trang kết quả...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Grading in progress state
  if (isGrading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">{exerciseData?.name || "Bài tập"}</h1>
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

  // Main essay exercise interface
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={handleBackAction}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-lg font-semibold">{exerciseData?.name || "Bài tập"}</h1>
      </div>
      
      {/* Timer display when available */}
      {timeLeft !== null && totalTime !== null && (
        <div className="bg-amber-50 dark:bg-amber-900/20 py-2 px-4 border-b flex justify-center">
          <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />
        </div>
      )}

      {/* Document Status Indicator */}
      {documentContent && (
        <div className="bg-green-50 dark:bg-green-900/20 py-1 px-4 text-xs text-green-700 dark:text-green-300 border-b flex items-center">
          <FileText className="h-3.5 w-3.5 mr-1" />
          <span>Tài liệu bài tập: {documentContent.name}</span>
        </div>
      )}
      
      {/* Generated Prompt Display - With prominent styling */}
      {generatedPrompt && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 p-5 border-b border-blue-100 dark:border-blue-900">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-3 text-blue-700 dark:text-blue-300 flex items-center">
              <div className="h-4 w-1 bg-blue-500 mr-2 rounded-full"></div>
              Đề bài:
            </h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-md">
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-line text-base leading-relaxed font-medium">
                  {generatedPrompt}
                </div>
              </div>
            </div>
            {exercise?.description && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                <p className="font-medium mb-1">Mô tả thêm:</p>
                <p>{exercise.description}</p>
              </div>
            )}
            
            {/* Always add debugging section for essay prompts */}
            <details className="mt-4 text-xs border border-gray-200 dark:border-gray-700 rounded-md">
              <summary className="cursor-pointer bg-gray-50 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400">
                Debug Information
              </summary>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 text-xs">
                <p className="font-mono mb-1">Exercise ID: {exercise?.id}</p>
                {debugInfo?.originalPrompt && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Original Prompt:</p>
                    <pre className="whitespace-pre-wrap bg-white dark:bg-gray-900 p-2 rounded border border-yellow-200 text-xs overflow-auto max-h-48">
                      {debugInfo.originalPrompt}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
      
      {/* Debug information if provided - Keep this for compatibility but it's redundant now */}
      {debugInfo?.originalPrompt && !generatedPrompt && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-2 border-b border-yellow-200 text-xs">
          <details className="max-w-3xl mx-auto">
            <summary className="cursor-pointer text-yellow-600 dark:text-yellow-400">Debug: Original Prompt</summary>
            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-yellow-200">
              <pre className="whitespace-pre-wrap">{debugInfo.originalPrompt}</pre>
            </div>
          </details>
        </div>
      )}

      {/* Main content area with document viewer and upload area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Left side - Document viewer */}
        <div className="relative h-full border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
          {exerciseFileUrl ? (
            <div className="absolute inset-0">
              <iframe 
                src={exerciseFileUrl} 
                className="w-full h-full border-0" 
                title="Exercise Document"
                onError={(e) => {
                  console.error("Error loading iframe:", e);
                  toast({
                    title: "Lỗi tải tài liệu",
                    description: "Không thể hiển thị tài liệu. Vui lòng thử lại sau.",
                    variant: "destructive"
                  });
                }}
              />
            </div>
          ) : documentContent ? (
            <div className="p-4">
              <h3 className="font-semibold mb-2">Tài liệu bài tập: {documentContent.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tài liệu đã được tải và sẵn sàng để làm bài.
              </p>
              {/* Add fallback link to view document */}
              <Button
                variant="outline"
                onClick={() => {
                  if (exerciseFileUrl) {
                    window.open(exerciseFileUrl, '_blank');
                  }
                }}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Mở tài liệu trong tab mới
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Không có tài liệu đính kèm</p>
              </div>
            </div>
          )}
        </div>

        {/* Right side - File upload area */}
        <div className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Nộp bài làm</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
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
                  {uploadProgress < 100 ? (
                    <div className="mb-4">
                      <p className="text-sm mb-1">Đang tải lên...</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  ) : null}

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
                        {timeLeft !== null && timeLeft < 300 && (
                          <span className="block mt-2 text-orange-500 font-medium">
                            Còn {Math.floor(timeLeft / 60)} phút {timeLeft % 60} giây để nộp bài!
                          </span>
                        )}
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
                onClick={handleSubmitExercise}
                disabled={!answerFile || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang nộp bài...
                  </>
                ) : (
                  "Nộp bài tập"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <Dialog open={isNavigateDialogOpen} onOpenChange={setIsNavigateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thoát khỏi bài làm?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn thoát khỏi bài làm? Tất cả dữ liệu bạn đã nhập sẽ bị mất.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNavigateDialogOpen(false)}>
              Tiếp tục làm bài
            </Button>
            <Button variant="default" onClick={proceedWithNavigation}>
              Thoát bài làm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
