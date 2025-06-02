"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { sortExamsByNumber, Exam as LibExam } from "@/lib/utils";
import { formatTime, getTimerClass } from "@/lib/exam-timer"; // Import shared timer utilities

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

// Add types for the filter option
type ExamFilterOption = "all" | "completed" | "not-taken";

// Add a function to check for active timer sessions
const getActiveTimerSession = (examId: string): {
  timeLeft: number;
  totalTime: number;
  type: "multiple-choice" | "essay";
} | null => {
  try {
    // Check both multiple-choice and essay session formats
    const mcKey = `exam_session_${examId}`;
    const essayKey = `essay_timer_${examId}`;

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
const ActiveExamTimer = ({
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
        <p className={`text-lg font-bold ${getTimerClass(remainingTime, totalTime)}`}>
          {formatTime(remainingTime)}
        </p>
      </div>
    </div>
  );
};

// Use Exam type from lib/utils for compatibility
type Exam = LibExam;

interface Server {
  id: string;
  name: string;
}

interface Channel {
  name?: string;
}

interface ExamContentProps {
  channel?: Channel;
  server?: Server;
  exams?: Exam[];
}

const ExamContent = ({ channel, server, exams = [] }: ExamContentProps) => {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  interface ExamResult {
    id: string;
    score: number;
    createdAt: string;
    // Add other fields as needed
  }

  const [examResults, setExamResults] = useState<Record<string, ExamResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  // Add state for the filter option
  const [filterOption, setFilterOption] = useState<ExamFilterOption>("all");
  // Thêm state để kiểm soát render phía client
  const [isClient, setIsClient] = useState(false);
  // Add state to track active exam timers
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

  // Đánh dấu khi component đã render ở client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sort exams by number in their name
  const sortedExams = sortExamsByNumber(exams);

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

  // Check for active timers
  useEffect(() => {
    if (!isClient) return;

    const timers: Record<
      string,
      {
        timeLeft: number;
        totalTime: number;
        type: "multiple-choice" | "essay";
      }
    > = {};

    // Check each exam for active timer sessions
    exams.forEach((exam: Exam) => {
      const timerSession = getActiveTimerSession(String(exam.id));
      if (timerSession) {
        timers[String(exam.id)] = {
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

      exams.forEach((exam: Exam) => {
        const timerSession = getActiveTimerSession(String(exam.id));
        if (timerSession) {
          updatedTimers[String(exam.id)] = {
            ...timerSession,
            type: timerSession.type as "multiple-choice" | "essay",
          };
        }
      });

      setActiveTimers(updatedTimers);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [exams, isClient]);

  // Fetch exam results for the user
  useEffect(() => {
    if (!profileId) return;

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        // Create a results object to track which exams the user has completed
        const results: Record<string, ExamResult> = {};

        // Fetch results for each exam
        await Promise.all(
          exams.map(async (exam: Exam) => {
            try {
              const res = await fetch(
                `/api/exam-result?examId=${exam.id}&userId=${profileId}`
              );
              if (!res.ok) throw new Error(`API error: ${res.status}`);
              const data = await res.json();

              // Store results indexed by exam ID
              if (data && data.id) {
                results[String(exam.id)] = data;
              }
            } catch (error) {
              console.error(
                `Error fetching result for exam ${exam.id}:`,
                error
              );
            }
          })
        );

        setExamResults(results);
      } catch (error) {
        console.error("Error fetching exam results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [exams, profileId]);

  // Parse minutes from prompt
  const getExamDuration = (prompt?: string | null) => {
    if (!prompt) return "Không giới hạn";
    const match = prompt.match(/(\d+)\s*phút/);
    return match ? `${match[1]} phút` : "Không giới hạn";
  };

  // Handle start exam button click
  const handleStartExam = (serverId: string, examId: string) => {
    router.push(`/servers/${serverId}/exams/detail/${examId}`);
  };

  // Handle view result button click
  const handleViewResult = (
    serverId: string,
    examId: string,
    resultId: string
  ) => {
    router.push(
      `/servers/${serverId}/exams/detail/${examId}/result/${resultId}`
    );
  };

  // Filter exams based on the selected option
  const filteredExams = sortedExams.filter((exam) => {
    const typedExam = exam as Exam;
    if (filterOption === "all") return true;
    if (filterOption === "completed") return examResults[(typedExam.id as string)];
    if (filterOption === "not-taken") return !examResults[(typedExam.id as string)];
    return true;
  });

  // Safe date formatting that works consistently on server and client
  const formatDateSafely = (dateString?: string | Date | null): string => {
    if (!dateString) return "Không có hạn nộp";

    try {
      const dateStr = typeof dateString === 'string' 
        ? dateString 
        : dateString instanceof Date 
          ? dateString.toISOString() 
          : '';
      
      if (!dateStr) return "Không có hạn nộp";
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Ngày không hợp lệ";

      // Use consistent formatting that works on both server and client
      return new Intl.DateTimeFormat('vi-VN', {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: 'Asia/Ho_Chi_Minh'
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
      const deadlineDate = typeof deadlineStr === 'string'
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold">
              {channel?.name || "Bài kiểm tra"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {server?.name || "Tất cả lớp học"}
            </p>
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Đang tải danh sách bài kiểm tra...
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
                    {channel?.name || "Bài kiểm tra"}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {server?.name || "Tất cả lớp học"}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Filter Dropdown */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {filteredExams.length} bài kiểm tra
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {
                    filteredExams.filter((exam: Exam) => !!examResults[exam.id as string])
                      .length
                  }{" "}
                  đã hoàn thành
                </p>
              </div>
              <Select
                value={filterOption}
                onValueChange={(value) =>
                  setFilterOption(value as ExamFilterOption)
                }
              >
                <SelectTrigger className="w-[200px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <Filter className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Lọc bài kiểm tra" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                  <SelectItem
                    value="all"
                    className="focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full" />
                      Tất cả bài kiểm tra
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

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam: Exam) => {
            const hasCompleted = !!examResults[exam.id as string];
            const result = examResults[exam.id as string];
            const hasActiveTimer = isClient && !!activeTimers[String(exam.id)];
            const isOverdue = typeof exam.deadline === "string" && isDeadlinePassed(exam.deadline);

            return (
              <Card
                key={String(exam.id)}
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
                      {exam.name}
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
                    {(exam.description ?? "Không có mô tả").toString()}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Exam Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>
                        Thời gian:{" "}
                        <span className="font-medium">
                          {getExamDuration(typeof exam.prompt === "string" ? exam.prompt : (exam.prompt ? String(exam.prompt) : undefined))}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span>
                        Hạn nộp:
                        {isClient ? (
                          <span
                            className={`font-medium ml-1 ${
                              isOverdue ? "text-red-500" : ""
                            }`}
                          >
                            {formatDateSafely(exam.deadline as string | Date | null | undefined)}
                            {isOverdue && (
                              <span className="ml-1">[Nộp muộn]</span>
                            )}
                          </span>
                        ) : (
                          <span className="font-medium ml-1">
                            Đang tải...
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Results or Timer - similar to exercise content with isClient checks */}
                  {!hasCompleted && hasActiveTimer ? (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                      <ActiveExamTimer
                        timeLeft={activeTimers[String(exam.id)].timeLeft}
                        totalTime={activeTimers[String(exam.id)].totalTime}
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
                      {isClient && (
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
                </CardContent>

                <CardFooter className="pt-4">
                  {hasCompleted ? (
                    <Button
                      className="w-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition-all duration-200 group"
                      variant="outline"
                      onClick={() =>
                        server && result && typeof result.id === "string" && handleViewResult(server.id, exam.id as string, result.id as string)
                      }
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
                      onClick={() => server && handleStartExam(server.id, String(exam.id))}
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
      </div>
    </div>
  );
};

export default ExamContent;
