"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  Book,
  BookCopy,
  Clock,
  Info,
  Calendar,
  PlayCircle,
  Trophy,
  CheckCircle,
  AlertCircle,
  Play,
  Filter,
  Building,
  Timer,
} from "lucide-react";
import { sortExamsByNumber } from "@/lib/utils";
import { formatTime, getTimerClass } from "@/lib/exam-timer";

// Define ExerciseType
type ExerciseType = "multiple-choice" | "essay" | "written";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // Remove DialogTrigger since it's unused
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Modify the timer form schema to include exerciseId
const timerFormSchema = z.object({
  minutes: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Thời gian phải là một số",
    })
    .refine((val) => Number(val) >= 5, {
      message: "Thời gian phải ít nhất 5 phút",
    })
    .refine((val) => Number(val) <= 120, {
      message: "Thời gian không được vượt quá 120 phút",
    }),
  exerciseId: z.string(),
});

// Add types for the filter option
type ExerciseFilterOption = "all" | "completed" | "not-taken";

// Add a function to check for active timer sessions
const getActiveTimerSession = (
  exerciseId: string
): {
  timeLeft: number;
  totalTime: number;
  type: "multiple-choice" | "essay";
} | null => {
  try {
    // Check both multiple-choice and essay session formats
    const mcKey = `exercise_session_${exerciseId}`;
    const essayKey = `essay_timer_${exerciseId}`;

    const mcSession = localStorage.getItem(mcKey);
    const essaySession = localStorage.getItem(essayKey);

    if (mcSession) {
      const sessionData = JSON.parse(mcSession);
      if (sessionData.expiresAt) {
        const expiresAt = new Date(sessionData.expiresAt).getTime();
        const now = Date.now();
        const remainingSeconds = Math.max(
          0,
          Math.floor((expiresAt - now) / 1000)
        );
        if (remainingSeconds > 0) {
          return {
            timeLeft: remainingSeconds,
            totalTime: sessionData.totalTime || 3600,
            type: "multiple-choice" as const,
          };
        }
      }
    }

    if (essaySession) {
      const sessionData = JSON.parse(essaySession);
      if (sessionData.expiresAt) {
        const expiresAt = new Date(sessionData.expiresAt).getTime();
        const now = Date.now();
        const remainingSeconds = Math.max(
          0,
          Math.floor((expiresAt - now) / 1000)
        );
        if (remainingSeconds > 0) {
          return {
            timeLeft: remainingSeconds,
            totalTime: sessionData.totalTime || 3600,
            type: "essay" as const,
          };
        }
      }
    }

    return null;
  } catch (e) {
    console.error("Error checking timer session:", e);
    return null;
  }
};

// Component to display the active timer
const ActiveExerciseTimer = ({
  timeLeft,
  totalTime,
}: {
  timeLeft: number;
  totalTime: number;
}) => {
  const [remainingTime, setRemainingTime] = useState(timeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
        <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
          Đang làm bài
        </p>
        <p
          className={`text-lg font-bold ${getTimerClass(
            remainingTime,
            totalTime
          )}`}
        >
          {formatTime(remainingTime)}
        </p>
      </div>
    </div>
  );
};

interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  deadline?: Date | string | null;
  isActive: boolean;
  exerciseType?: ExerciseType;
  type?: ExerciseType;
  model: {
    id: string;
    name: string;
  };
  field?: {
    id: string;
    name: string;
  };
  files: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  [key: string]: unknown;
}

interface Server {
  id: string;
  name: string;
}

interface Channel {
  name?: string;
}

interface ExerciseContentProps {
  channel?: Channel;
  server?: Server;
  exercises?: Exercise[];
}

const ExerciseContent = ({
  channel,
  server,
  exercises = [],
}: ExerciseContentProps) => {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  interface ExerciseResult {
    id: string;
    score: number;
    createdAt: string;
    type?: string;
    submissionType?: string;
    exerciseType?: ExerciseType;
    submittedFileUrl?: string;
    // Updated to include answers
    answers?: Array<{
      type?: string;
      fileUrl?: string;
      fileName?: string;
      [key: string]: unknown;
    }>;
  }

  const [exerciseResults, setExerciseResults] = useState<
    Record<string, ExerciseResult>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterOption, setFilterOption] = useState<ExerciseFilterOption>("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTimers, setActiveTimers] = useState<
    Record<
      string,
      {
        timeLeft: number;
        totalTime: number;
        type: "multiple-choice" | "essay";
      }
    >
  >({});
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [customTimers, setCustomTimers] = useState<Record<string, number>>({});

  // Form for custom timer
  const timerForm = useForm<z.infer<typeof timerFormSchema>>({
    resolver: zodResolver(timerFormSchema),
    defaultValues: {
      minutes: "30",
      exerciseId: "",
    },
  });

  // Function to set custom timer - update to use localStorage
  const setCustomTimer = (values: z.infer<typeof timerFormSchema>) => {
    try {
      const { minutes, exerciseId } = values;
      const minutesNum = Number(minutes);

      // Save custom timer to localStorage with exercise ID (changed from sessionStorage)
      const timersKey = "exercise_custom_timers";
      const existingTimers = JSON.parse(
        localStorage.getItem(timersKey) || "{}"
      );
      existingTimers[exerciseId] = minutesNum;
      localStorage.setItem(timersKey, JSON.stringify(existingTimers));

      // Update state
      setCustomTimers((prev) => ({
        ...prev,
        [exerciseId]: minutesNum,
      }));

      toast({
        title: "Hẹn giờ đã được thiết lập",
        description: `Bạn đã đặt hẹn giờ ${minutesNum} phút cho bài tập này. Thời gian sẽ được lưu cho đến khi đóng trình duyệt hoặc làm xong bài.`,
        variant: "success",
      });

      setTimerModalOpen(false);
    } catch (error) {
      console.error("Error setting custom timer:", error);
      toast({
        title: "Lỗi khi thiết lập hẹn giờ",
        description: "Đã có lỗi xảy ra. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Add function to delete custom timer
  const deleteCustomTimer = (exerciseId: string) => {
    try {
      // Remove timer from localStorage
      const timersKey = "exercise_custom_timers";
      const existingTimers = JSON.parse(
        localStorage.getItem(timersKey) || "{}"
      );
      if (existingTimers[exerciseId]) {
        delete existingTimers[exerciseId];
        localStorage.setItem(timersKey, JSON.stringify(existingTimers));
        
        // Update state
        setCustomTimers((prev) => {
          const updated = {...prev};
          delete updated[exerciseId];
          return updated;
        });
        
        toast({
          title: "Hẹn giờ đã được xóa",
          description: "Bài tập này không còn giới hạn thời gian.",
          variant: "success",
        });
      } else {
        toast({
          title: "Không có hẹn giờ",
          description: "Bài tập này chưa có hẹn giờ.",
          variant: "default",
        });
      }
      
      setTimerModalOpen(false);
    } catch (error) {
      console.error("Error deleting custom timer:", error);
      toast({
        title: "Lỗi khi xóa hẹn giờ",
        description: "Đã có lỗi xảy ra. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Open timer setting modal for specific exercise - only for exercises not completed
  const openTimerModal = (exerciseId: string) => {
    // Check if the exercise has been completed
    const hasCompleted = !!exerciseResults[exerciseId];
    
    if (hasCompleted) {
      toast({
        title: "Không thể đặt hẹn giờ",
        description: "Bạn đã hoàn thành bài tập này. Không thể đặt hẹn giờ.",
        variant: "default",
      });
      return;
    }

    // Set current value from saved timers if exists
    const savedMinutes = customTimers[exerciseId] || 30;
    timerForm.setValue("minutes", String(savedMinutes));
    timerForm.setValue("exerciseId", exerciseId);

    setTimerModalOpen(true);
  };

  // Load previously set timers from localStorage and remove timers for completed exercises
  useEffect(() => {
    if (isLoaded) {
      try {
        const timersKey = "exercise_custom_timers";
        const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
        
        // Filter out timers for completed exercises
        const filteredTimers = { ...savedTimers };
        
        // Remove timers for exercises that have results
        Object.keys(exerciseResults).forEach(exerciseId => {
          if (filteredTimers[exerciseId]) {
            delete filteredTimers[exerciseId];
          }
        });
        
        // Update localStorage if timers were removed
        if (Object.keys(filteredTimers).length !== Object.keys(savedTimers).length) {
          localStorage.setItem(timersKey, JSON.stringify(filteredTimers));
        }
        
        setCustomTimers(filteredTimers);
      } catch (error) {
        console.error("Error loading saved timers:", error);
      }
    }
  }, [isLoaded, exerciseResults]);

  // Sort exercises by number in their name
  // Update this line
  const sortedExercises = sortExamsByNumber(
    exercises as unknown as Array<{ name: string }>
  );

  // Get user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile/me");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfileId(data.id);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // Format deadline display for exercise cards
  const formatDeadline = (deadline: string | undefined | null) => {
    if (!deadline) return null;
    
    try {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      const isOverdue = now > deadlineDate;
      
      return {
        formattedDate: deadlineDate.toLocaleDateString('vi-VN', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        isOverdue
      };
    } catch (e) {
      console.error("Error parsing deadline:", e);
      return null;
    }
  };

  // Check for active timers
  useEffect(() => {
    if (!isLoaded) return;

    const timers: Record<
      string,
      {
        timeLeft: number;
        totalTime: number;
        type: "multiple-choice" | "essay";
      }
    > = {};

    // Check each exercise for active timer sessions
    exercises.forEach((exercise: Exercise) => {
      const timerSession = getActiveTimerSession(String(exercise.id));
      if (timerSession) {
        timers[String(exercise.id)] = {
          ...timerSession,
          type: timerSession.type as "multiple-choice" | "essay",
        };
      }
    });

    setActiveTimers(timers);

    // Set up periodic check for timer updates
    const interval = setInterval(() => {
      const updatedTimers: Record<
        string,
        {
          timeLeft: number;
          totalTime: number;
          type: "multiple-choice" | "essay";
        }
      > = {};

      exercises.forEach((exercise: Exercise) => {
        const timerSession = getActiveTimerSession(String(exercise.id));
        if (timerSession) {
          updatedTimers[String(exercise.id)] = {
            ...timerSession,
            type: timerSession.type as "multiple-choice" | "essay",
          };
        }
      });

      setActiveTimers(updatedTimers);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [exercises, isLoaded]); // Fetch exercise results for the user - Using simplified approach like exam-content
  useEffect(() => {
    if (!profileId) return;

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        console.log(
          "[EXERCISE_CONTENT] Starting to fetch results for",
          exercises.length,
          "exercises"
        );

        // Create a results object to track which exercises the user has completed
        const results: Record<string, ExerciseResult> = {};

        // Fetch results for each exercise using the simple approach like exam-content
        await Promise.all(
          exercises.map(async (exercise: Exercise) => {
            try {
              console.log(
                "[EXERCISE_CONTENT] Fetching result for exercise:",
                exercise.id
              );

              const res = await fetch(
                `/api/exercise-result?exerciseId=${exercise.id}&userId=${profileId}`
              );

              if (!res.ok) {
                console.log(
                  "[EXERCISE_CONTENT] No result for exercise:",
                  exercise.id,
                  "Status:",
                  res.status
                );
                return; // Skip if no result found
              }

              const data = await res.json();
              console.log(
                "[EXERCISE_CONTENT] Result data for",
                exercise.id,
                ":",
                data
              );

              // Handle array response format from API
              let result = null;
              if (Array.isArray(data) && data.length > 0) {
                // Take the first (most recent) result
                result = data[0];
              } else if (data && data.id) {
                // Single object response
                result = data;
              }

              // Store results indexed by exercise ID
              if (result && result.id) {
                results[String(exercise.id)] = result;
                console.log(
                  "[EXERCISE_CONTENT] Stored result for exercise:",
                  exercise.id,
                  "with score:",
                  result.score
                );
              }
            } catch (error) {
              console.error(
                `[EXERCISE_CONTENT] Error fetching result for exercise ${exercise.id}:`,
                error
              );
            }
          })
        );

        console.log("[EXERCISE_CONTENT] Final results:", results);
        console.log(
          "[EXERCISE_CONTENT] Results count:",
          Object.keys(results).length
        );
        setExerciseResults(results);
      } catch (error) {
        console.error("[EXERCISE_CONTENT] Error in fetchResults:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [exercises, profileId]);

  // Check result when starting exercise with better error handling
  const checkResultAndStart = async (exerciseId: string) => {
    if (!profileId) return false;

    try {
      // Try both endpoints to check if user already has a result
      let response = await fetch(
        `/api/exercises/${exerciseId}/results?userId=${profileId}`
      );

      // Fallback to alternative endpoint
      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/exercises/${exerciseId}/result`);
      }

      if (response.ok) {
        const data = await response.json();

        let result = null;
        if (Array.isArray(data) && data.length > 0) {
          result = data[0]; // Take most recent result
        } else if (data && data.id) {
          result = data;
        }
        if (result && result.id) {
          // Redirect to result page based on submission type
          if (
            result.submissionType === "written" ||
            result.type === "written"
          ) {
            router.push(
              `/servers/${server?.id}/exercises/detail/${exerciseId}/written-result/${result.id}`
            );
          } else if (
            result.submissionType === "essay" ||
            result.type === "essay" ||
            result.isEssayType
          ) {
            router.push(
              `/servers/${server?.id}/exercises/detail/${exerciseId}/essay-result/${result.id}`
            );
          } else {
            router.push(
              `/servers/${server?.id}/exercises/detail/${exerciseId}/result/${result.id}`
            );
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking exercise result:", error);
      return false;
    }
  };

  // Handle start exercise button click
  const handleStartExercise = async (serverId: string, exerciseId: string) => {
    const hasResult = await checkResultAndStart(exerciseId);
    
    // If the user has completed the exercise, clear their timer setting
    if (hasResult) {
      try {
        // Remove timer for completed exercise
        const timersKey = "exercise_custom_timers";
        const existingTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
        
        if (existingTimers[exerciseId]) {
          delete existingTimers[exerciseId];
          localStorage.setItem(timersKey, JSON.stringify(existingTimers));
          
          // Also update state
          setCustomTimers(prev => {
            const updated = {...prev};
            delete updated[exerciseId];
            return updated;
          });
        }

        // Also clear from essay-specific timer if exists
        const essayTimerKey = `essay_timer_${exerciseId}`;
        localStorage.removeItem(essayTimerKey);
      } catch (error) {
        console.error("Error clearing timer for completed exercise:", error);
      }
    } else {
      // If there's a custom timer for this exercise, add it to the URL
      const customTimer = customTimers[exerciseId];
      let url = `/servers/${serverId}/exercises/detail/${exerciseId}`;

      if (customTimer) {
        url += `?timer=${customTimer}`;
      }

      router.push(url);
    }
  };


  // Helper to determine the correct exercise type
  const determineExerciseType = (
    exercise: Exercise,
    result?: ExerciseResult
  ): ExerciseType => {
    // First, check if we have result answers that indicate the type
    if (result?.answers) {
      let answers;
      try {
        answers = Array.isArray(result.answers)
          ? result.answers
          : typeof result.answers === "string"
          ? JSON.parse(result.answers)
          : [result.answers];

        // If answers has a type field
        const firstAnswer = answers[0];
        if (firstAnswer?.type === "written") {
          console.log("Determined type: written from answer.type");
          return "written";
        }
        if (firstAnswer?.type === "essay" || firstAnswer?.fileUrl) {
          console.log("Determined type: essay from answer.type or fileUrl");
          return "essay";
        }
      } catch (e) {
        console.error("Error parsing answers:", e);
      }
    }

    // Check explicit type properties
    if (result?.exerciseType) {
      console.log(
        `Determined type: ${result.exerciseType} from result.exerciseType`
      );
      return result.exerciseType as ExerciseType;
    }

    if (exercise.exerciseType) {
      console.log(
        `Determined type: ${exercise.exerciseType} from exercise.exerciseType`
      );
      return exercise.exerciseType;
    }

    if (exercise.type) {
      console.log(`Determined type: ${exercise.type} from exercise.type`);
      return exercise.type as ExerciseType;
    }

    if (result?.type) {
      console.log(`Determined type: ${result.type} from result.type`);
      return result.type as ExerciseType;
    }

    // Check if submitted file URL exists for essay type
    if (result?.submittedFileUrl) {
      console.log("Determined type: essay from submittedFileUrl");
      return "essay";
    }

    // Default to multiple-choice
    console.log("Defaulting to multiple-choice");
    return "multiple-choice";
  };

  // Update the handleViewResult function to correctly determine the exercise type and navigate
  const handleViewResult = (exercise: Exercise, resultId: string) => {
    const result = exerciseResults[exercise.id];

    // Determine the exercise type using our enhanced function
    const exerciseType = determineExerciseType(exercise, result);

    console.log(`Navigating to ${exerciseType} result page:`, {
      exerciseId: exercise.id,
      resultId,
      serverId: server?.id,
    });

    if (server?.id) {
      if (exerciseType === "essay") {
        router.push(
          `/servers/${server.id}/exercises/detail/${exercise.id}/essay-result/${resultId}`
        );
      } else if (exerciseType === "written") {
        router.push(
          `/servers/${server.id}/exercises/detail/${exercise.id}/written-result/${resultId}`
        );
      } else {
        // Default multiple-choice path
        router.push(
          `/servers/${server.id}/exercises/detail/${exercise.id}/result/${resultId}`
        );
      }
    } else {
      if (exerciseType === "essay") {
        router.push(
          `/exercises/detail/${exercise.id}/essay-result/${resultId}`
        );
      } else if (exerciseType === "written") {
        router.push(
          `/exercises/detail/${exercise.id}/written-result/${resultId}`
        );
      } else {
        // Default multiple-choice path
        router.push(`/exercises/detail/${exercise.id}/result/${resultId}`);
      }
    }
  };

  // Filter exercises based on the selected option
  const filteredExercises = sortedExercises.filter((exercise) => {
    const typedExercise = exercise as Exercise;
    if (filterOption === "all") return true;
    if (filterOption === "completed")
      return exerciseResults[typedExercise.id as string];
    if (filterOption === "not-taken")
      return !exerciseResults[typedExercise.id as string];
    return true;
  });

  // Initialize client-side rendering state
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Safe date formatting that works consistently on server and client
  const formatDateSafely = (dateString?: string | Date | null): string => {
    if (!dateString) return "Không có hạn nộp";

    try {
      const dateStr =
        typeof dateString === 'string'
          ? dateString
          : dateString instanceof Date
          ? dateString.toISOString()
          : '';

      if (!dateStr) return "Không có hạn nộp";

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Ngày không hợp lệ";

      // Use consistent formatting that works on both server and client
      return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Lỗi định dạng ngày";
    }
  };

  // Add function to check if deadline has passed
  const isDeadlinePassed = (deadlineStr?: string | Date | null): boolean => {
    if (!deadlineStr) return false;
    try {
      const deadlineDate =
        typeof deadlineStr === 'string'
          ? new Date(deadlineStr)
          : deadlineStr instanceof Date
          ? deadlineStr
          : null;

      if (!deadlineDate) return false;

      const now = new Date();
      return now > deadlineDate;
    } catch (error) {
      console.error("Error checking deadline:", error);
      return false;
    }
  };

  // Add function to check if result was submitted late
  const isSubmittedLate = (
    deadlineStr?: string | Date | null,
    resultDate?: string | Date | null
  ): boolean => {
    if (!deadlineStr || !resultDate) return false;
    
    try {
      const deadlineDate = typeof deadlineStr === 'string'
        ? new Date(deadlineStr)
        : deadlineStr instanceof Date ? deadlineStr : null;
      
      const submissionDate = typeof resultDate === 'string'
        ? new Date(resultDate)
        : resultDate instanceof Date ? resultDate : null;
        
      if (!deadlineDate || !submissionDate) return false;
      
      return submissionDate > deadlineDate;
    } catch (error) {
      console.error("Error checking submission time:", error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold">{channel?.name || "Bài tập"}</h1>
            <p className="text-sm text-muted-foreground">
              {server?.name || "Tất cả lớp học"}
            </p>
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Đang tải danh sách bài tập...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      {/* Enhanced Header */}
      <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BookCopy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {channel?.name || "Bài tập"}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {server?.name || "Tất cả lớp học"}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Dropdown without Timer Button */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {filteredExercises.length} bài tập
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {
                    filteredExercises.filter(
                      (exam) => !!exerciseResults[exam.id as string]
                    ).length
                  }{" "}
                  đã hoàn thành
                </p>
              </div>

              <Select
                value={filterOption}
                onValueChange={(value) =>
                  setFilterOption(value as ExerciseFilterOption)
                }
              >
                <SelectTrigger className="w-[200px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <Filter className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Lọc bài tập" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                  <SelectItem
                    value="all"
                    className="focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full" />
                      Tất cả bài tập
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="completed"
                    className="focus:bg-green-50 dark:focus:bg-green-950"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Đã hoàn thành
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="not-taken"
                    className="focus:bg-orange-50 dark:focus:bg-orange-950"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      Chưa làm
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Timer Modal shared for all exercise cards */}
      <Dialog open={timerModalOpen} onOpenChange={setTimerModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Đặt hẹn giờ cho bài tập</DialogTitle>
            <DialogDescription>
              Thiết lập thời gian làm bài từ 5 đến 120 phút.
            </DialogDescription>
          </DialogHeader>
          <Form {...timerForm}>
            <form
              onSubmit={timerForm.handleSubmit(setCustomTimer)}
              className="space-y-6 py-4"
            >
              <FormField
                control={timerForm.control}
                name="minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian (phút)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="30"
                        {...field}
                        type="number"
                        min={5}
                        max={120}
                        className="focus:ring-orange-500 focus:border-orange-500"
                      />
                    </FormControl>
                    <FormDescription>
                      Đặt thời gian từ 5 đến 120 phút cho bài tập.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input type="hidden" {...timerForm.register("exerciseId")} />
              <DialogFooter className="flex justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const exerciseId = timerForm.getValues("exerciseId");
                    if (exerciseId) {
                      deleteCustomTimer(exerciseId);
                    }
                  }}
                  disabled={!customTimers[timerForm.getValues("exerciseId")]}
                >
                  Xóa hẹn giờ
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTimerModalOpen(false)}
                    type="button"
                  >
                    Huỷ
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    Lưu thời gian
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => {
            const hasCompleted = !!exerciseResults[exercise.id as string];
            const result = exerciseResults[exercise.id as string];
            const hasActiveTimer =
              isLoaded && !!activeTimers[String(exercise.id)];
            // Fix type error by properly type-checking deadline
            const deadline = exercise.deadline as string | Date | null | undefined;
            const isOverdue = isDeadlinePassed(deadline);
            const isLateSubmission = hasCompleted && isSubmittedLate(deadline, result?.createdAt);
            const exerciseId = String(exercise.id);
            const hasCustomTimer = !!customTimers[exerciseId];

            return (
              <Card
                key={exerciseId}
                className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col min-h-[400px]"
              >
                {/* Status Indicator Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    hasCompleted
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : hasActiveTimer
                      ? "bg-gradient-to-r from-orange-500 to-red-500"
                      : isOverdue
                      ? "bg-gradient-to-r from-red-500 to-pink-500"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"
                  }`}
                />
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {exercise.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={`ml-2 text-xs font-medium ${
                        hasCompleted
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : hasActiveTimer
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : isOverdue
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {hasCompleted ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Đã hoàn thành
                        </div>
                      ) : hasActiveTimer ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Đang làm
                        </div>
                      ) : isOverdue ? (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Quá hạn
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          Chưa làm
                        </div>
                      )}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-600 dark:text-slate-400 line-clamp-2">
                    {(exercise.description ?? "Không có mô tả").toString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Exercise Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span>
                          Thời gian:{" "}
                          <span className="font-medium">
                            {hasCustomTimer
                              ? `${customTimers[exerciseId]} phút`
                              : "Không giới hạn"}
                          </span>
                        </span>
                      </div>

                      {/* Individual Timer Button for this card */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`w-8 h-8 rounded-full 
													${
                            hasCustomTimer
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        title={hasCompleted 
                          ? "Đã hoàn thành bài tập này"
                          : "Đặt hẹn giờ cho bài tập này"}
                        onClick={() => openTimerModal(exerciseId)}
                        disabled={hasCompleted}
                      >
                        <Timer className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span>
                        Hạn nộp:
                        {isLoaded ? (
                          <span
                            className={`font-medium ml-1 ${
                              isLateSubmission ? "text-red-500" : ""
                            }`}
                          >
                            {formatDateSafely(deadline)}
                            {isLateSubmission && (
                              <span className="ml-1">[Nộp muộn]</span>
                            )}
                          </span>
                        ) : (
                          <span className="font-medium ml-1">Đang tải...</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Results or Timer */}
                  {!hasCompleted && hasActiveTimer ? (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                      <ActiveExerciseTimer
                        timeLeft={activeTimers[String(exercise.id)].timeLeft}
                        totalTime={activeTimers[String(exercise.id)].totalTime}
                      />
                    </div>
                  ) : hasCompleted ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                            Kết quả của bạn
                          </p>
                          <p className="text-lg font-bold text-green-700 dark:text-green-300">
                            {Number(result.score)}/10 điểm
                          </p>
                        </div>
                      </div>
                      {isLoaded && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Hoàn thành vào: {formatDateSafely(result.createdAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            Chưa làm bài
                          </p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            Sẵn sàng làm bài
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {isOverdue
                          ? "Đã quá hạn nộp, nhưng bạn vẫn có thể làm bài"
                          : "Bắt đầu làm bài để hoàn thành trước thời hạn"}
                      </p>
                    </div>
                  )}
                </CardContent>{" "}
                <CardFooter className="pt-4">
                  {hasCompleted ? (
                    <Button
                      className="w-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-all duration-200 group"
                      variant="outline"
                      onClick={() => {
                        if (result && typeof result.id === "string") {
                          handleViewResult(exercise as Exercise, result.id);
                        }
                      }}
                    >
                      <Info className="h-4 w-4 mr-2 group-hover:text-blue-500 transition-colors" />
                      Xem chi tiết kết quả
                    </Button>
                  ) : (
                    <Button
                      className={`w-full font-medium transition-all duration-200 ${
                        hasActiveTimer
                          ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-orange-500/25"
                          : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25"
                      }`}
                      onClick={() =>
                        server &&
                        handleStartExercise(server.id, String(exercise.id))
                      }
                    >
                      {hasActiveTimer ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Tiếp tục làm bài
                        </>
                      ) : (
                        <>
                          <Book className="h-4 w-4 mr-2" />
                          Bắt đầu làm bài
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredExercises.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BookCopy className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Không có bài tập nào
            </h3>
            <p className="text-slate-500 dark:text-slate-500">
              {filterOption === "completed"
                ? "Bạn chưa hoàn thành bài tập nào"
                : filterOption === "not-taken"
                ? "Bạn đã hoàn thành tất cả bài tập"
                : "Chưa có bài tập nào được tạo"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseContent;
