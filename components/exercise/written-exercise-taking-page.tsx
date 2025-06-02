"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { sendMessageToGemini } from "@/lib/gemini_google";

// ...existing interfaces...
interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  passage?: string;
  groupId?: string;
  type?: string;
}

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
  channel?: {
    id: string;
    serverId: string;
  };
}

interface FileData {
  mimeType: string;
  data: ArrayBuffer;
  fileName: string;
}

// LocalStorage key for exercise session data
const EXERCISE_SESSION_KEY_PREFIX = "exercise_session_";

const getExerciseStorageKey = (exerciseId: string) =>
  `${EXERCISE_SESSION_KEY_PREFIX}${exerciseId}`;

// ...existing helper functions...

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

// Custom hook to manage exercise session data
const useExerciseSession = (exerciseId?: string) => {
  const saveAnswers = useCallback(
    (answers: { [questionId: string]: string }) => {
      if (!exerciseId) return;
      try {
        const sessionData = JSON.parse(
          localStorage.getItem(getExerciseStorageKey(exerciseId)) || "{}"
        );
        localStorage.setItem(
          getExerciseStorageKey(exerciseId),
          JSON.stringify({
            ...sessionData,
            writtenAnswers: answers,
            lastUpdated: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.error("Error saving answers to localStorage:", e);
      }
    },
    [exerciseId]
  );

  const saveTimerState = useCallback(
    (timeLeft: number, totalTime: number) => {
      if (!exerciseId) return;
      try {
        const sessionData = JSON.parse(
          localStorage.getItem(getExerciseStorageKey(exerciseId)) || "{}"
        );
        const expiresAt =
          timeLeft > 0
            ? new Date(Date.now() + timeLeft * 1000).toISOString()
            : null;

        localStorage.setItem(
          getExerciseStorageKey(exerciseId),
          JSON.stringify({
            ...sessionData,
            expiresAt,
            totalTime,
            lastUpdated: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.error("Error saving timer state to localStorage:", e);
      }
    },
    [exerciseId]
  );

  const saveQuestionIndex = useCallback(
    (index: number) => {
      if (!exerciseId) return;
      try {
        const sessionData = JSON.parse(
          localStorage.getItem(getExerciseStorageKey(exerciseId)) || "{}"
        );
        localStorage.setItem(
          getExerciseStorageKey(exerciseId),
          JSON.stringify({
            ...sessionData,
            currentQuestionIndex: index,
            lastUpdated: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.error("Error saving question index to localStorage:", e);
      }
    },
    [exerciseId]
  );

  const loadSession = useCallback(() => {
    if (!exerciseId) return null;
    try {
      const sessionData = JSON.parse(
        localStorage.getItem(getExerciseStorageKey(exerciseId)) || "{}"
      );

      if (sessionData.expiresAt) {
        const expiresAt = new Date(sessionData.expiresAt).getTime();
        const now = Date.now();
        const remainingTime = Math.max(0, Math.floor((expiresAt - now) / 1000));
        sessionData.timeLeft = remainingTime;
      }

      return sessionData;
    } catch (e) {
      console.error("Error loading session from localStorage:", e);
      return null;
    }
  }, [exerciseId]);

  const clearSession = useCallback(() => {
    if (!exerciseId) return;
    localStorage.removeItem(getExerciseStorageKey(exerciseId));
  }, [exerciseId]);

  return {
    saveAnswers,
    saveTimerState,
    saveQuestionIndex,
    loadSession,
    clearSession,
  };
};

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
        className={`px-3 py-2 rounded text-base flex items-center transition-all duration-300 ${getTimerClass(
          timeLeft,
          totalTime
        )}`}
      >
        <span className="whitespace-nowrap">
          Thời gian: {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
};

export const WrittenExerciseTakingPage = ({
  exercise,
  questions,
  exerciseFileUrl,
  documentContent,
  timeLeft: initialTimeLeft, // This might be passed from parent
  totalTime: initialTotalTime, // This might be passed from parent
  clearSession,
  resolvedExerciseId,
}: {
  exercise: Exercise | null;
  questions: Question[];
  exerciseFileUrl: string | null;
  documentContent: {
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null;
  timeLeft: number | null;
  totalTime: number | null;
  clearSession: () => void;
  resolvedExerciseId?: string;
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [writtenAnswers, setWrittenAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  const [isExerciseFinished, setIsExerciseFinished] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(initialTimeLeft);
  const [totalTime, setTotalTime] = useState<number | null>(initialTotalTime);
  const [checkedCustomTimer, setCheckedCustomTimer] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const questionsEndRef = useRef<HTMLDivElement>(null);
  const { saveAnswers, saveQuestionIndex, loadSession, saveTimerState } =
    useExerciseSession(resolvedExerciseId);

  // Check for custom timer in URL or localStorage
  useEffect(() => {
    if (!resolvedExerciseId || checkedCustomTimer) return;

    try {
      // Check URL for timer parameter first
      const searchParams = new URLSearchParams(window.location.search);
      const timerParam = searchParams.get("timer");

      if (timerParam) {
        const minutes = parseInt(timerParam, 10);
        if (!isNaN(minutes) && minutes > 0) {
          console.log(
            "[WRITTEN_EXERCISE_TIMER] Found timer in URL:",
            minutes,
            "minutes"
          );
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
          setCheckedCustomTimer(true);
          return;
        }
      }

      // If no URL param, check localStorage
      if (typeof window !== "undefined") {
        const timersKey = "exercise_custom_timers";
        const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");

        if (savedTimers[resolvedExerciseId]) {
          const minutes = savedTimers[resolvedExerciseId];
          console.log(
            "[WRITTEN_EXERCISE_TIMER] Found timer in localStorage:",
            minutes,
            "minutes"
          );

          // Check if timer is already running in session
          const sessionData = loadSession();
          if (sessionData?.expiresAt) {
            const expiresAt = new Date(sessionData.expiresAt).getTime();
            const now = Date.now();
            const remainingTime = Math.max(
              0,
              Math.floor((expiresAt - now) / 1000)
            );

            if (remainingTime > 0) {
              setTimeLeft(remainingTime);
              setTotalTime(minutes * 60);
            } else {
              // Start new timer
              setTimeLeft(minutes * 60);
              setTotalTime(minutes * 60);
            }
          } else {
            // Start new timer
            setTimeLeft(minutes * 60);
            setTotalTime(minutes * 60);
          }
        }
      }

      setCheckedCustomTimer(true);
    } catch (error) {
      console.error(
        "[WRITTEN_EXERCISE_TIMER] Error checking custom timer:",
        error
      );
      setCheckedCustomTimer(true);
    }
  }, [resolvedExerciseId, loadSession, checkedCustomTimer]);

  // Timer countdown effect
  useEffect(() => {
    if (
      timeLeft === null ||
      totalTime === null ||
      isExerciseFinished ||
      isProcessing
    )
      return;

    if (timeLeft <= 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      toast({
        title: "Hết thời gian làm bài",
        description:
          "Thời gian làm bài đã kết thúc. Bài làm sẽ được nộp tự động.",
        variant: "destructive",
      });

      handleSubmitExercise();
      return;
    }

    timerRef.current = setTimeout(
      () => setTimeLeft((prev) => (prev !== null ? prev - 1 : null)),
      1000
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, totalTime, isExerciseFinished, isProcessing]);

  // Save timer state every 30 seconds
  useEffect(() => {
    if (
      timeLeft === null ||
      totalTime === null ||
      isExerciseFinished ||
      !resolvedExerciseId
    )
      return;

    saveTimerState(timeLeft, totalTime);

    const saveInterval = setInterval(() => {
      if (timeLeft > 0) {
        saveTimerState(timeLeft, totalTime);
      }
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [
    timeLeft,
    totalTime,
    isExerciseFinished,
    resolvedExerciseId,
    saveTimerState,
  ]);

  // Session restoration effect
  useEffect(() => {
    if (!resolvedExerciseId || isRestoringSession) return;

    setIsRestoringSession(true);
    const sessionData = loadSession();

    if (sessionData) {
      if (sessionData.writtenAnswers) {
        setWrittenAnswers(sessionData.writtenAnswers);
      }
      if (sessionData.currentQuestionIndex !== undefined) {
        setCurrentQuestionIndex(sessionData.currentQuestionIndex);
      }
      if (
        typeof sessionData.timeLeft === "number" &&
        sessionData.timeLeft > 0
      ) {
        setTimeLeft(sessionData.timeLeft);
        if (typeof sessionData.totalTime === "number") {
          setTotalTime(sessionData.totalTime);
        }
      }
    }

    setIsRestoringSession(false);
  }, [resolvedExerciseId, loadSession]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (!isRestoringSession && resolvedExerciseId) {
      saveAnswers(writtenAnswers);
    }
  }, [writtenAnswers, saveAnswers, isRestoringSession, resolvedExerciseId]);

  // Save current question index
  useEffect(() => {
    if (!isRestoringSession && resolvedExerciseId) {
      saveQuestionIndex(currentQuestionIndex);
    }
  }, [
    currentQuestionIndex,
    saveQuestionIndex,
    isRestoringSession,
    resolvedExerciseId,
  ]);

  // Handle answer input
  const handleAnswerInput = (questionId: string, answer: string) => {
    setWrittenAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Navigation functions
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle navigation back to exercise list
  const handleNavigateBack = () => {
    if (!isExerciseFinished && questions.length > 0) {
      toast({
        title: "Tiến độ đã được lưu",
        description: "Bạn có thể quay lại để tiếp tục làm bài sau.",
        variant: "default",
      });
    }

    const channelId = exercise?.channel?.id;
    const serverId = exercise?.channel?.serverId;

    if (serverId && channelId) {
      router.push(`/servers/${serverId}/exercises/${channelId}`);
    } else if (serverId) {
      router.push(`/servers/${serverId}/exercises`);
    } else {
      router.push("/exercises");
    }
  };

  // Submit exercise for grading
  const handleSubmitExercise = async () => {
    try {
      setIsSubmitting(true);
      setIsProcessing(true);
      setIsExerciseFinished(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (resolvedExerciseId) {
        clearSession();
      }

      if (questions.length === 0) {
        toast({
          title: "Không thể nộp bài",
          description: "Không có câu hỏi nào trong bài tập",
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsProcessing(false);
        return;
      }

      console.log(
        "[SUBMIT] Starting submission for exercise:",
        resolvedExerciseId
      );

      // Create answers array with detailed question and answer information
      const answersArray = questions.map((question, index) => {
        const userAnswer = writtenAnswers[question.id] || "";

        return {
          questionId: question.id,
          questionText: question.text, // Thêm text câu hỏi
          question: question.text, // Backup field
          answer: userAnswer,
          userAnswer: userAnswer, // Backup field
          type: "written",
          questionIndex: index + 1,
          // Sẽ được cập nhật sau khi AI chấm điểm
          isCorrect: null,
          score: null,
          feedback: null,
          explanation: null,
          standardAnswer: null,
          correctAnswer: null,
        };
      });

      console.log(
        "[SUBMIT] Created answers array:",
        answersArray.length,
        "answers"
      );

      // Create detailed grading prompt for written answers
      const answersText = answersArray
        .map(
          (answer, index) =>
            `Câu ${index + 1}: ${
              answer.questionText
            }\nCâu trả lời của học sinh: ${
              answer.answer || "Không có câu trả lời"
            }`
        )
        .join("\n\n");

      // Kiểm tra nộp muộn
      let latePenalty = null;
      let latePenaltyText = "";
      if (exercise?.deadline) {
        const deadlineDate = new Date(exercise.deadline);
        const currentDate = new Date();

        if (currentDate > deadlineDate) {
          const minutesLate = Math.floor(
            (currentDate.getTime() - deadlineDate.getTime()) / (1000 * 60)
          );

          if (minutesLate > 0 && minutesLate <= 30) {
            latePenalty = { amount: 0.5, type: "fixed", minutes: minutesLate };
            latePenaltyText = `\n\n[CHÚ THÍCH NỘP MUỘN: Bài nộp muộn ${minutesLate} phút so với deadline. Áp dụng trừ 0.5 điểm.]`;
          } else if (minutesLate > 30 && minutesLate <= 60) {
            latePenalty = { amount: 2, type: "fixed", minutes: minutesLate };
            latePenaltyText = `\n\n[CHÚ THÍCH NỘP MUỘN: Bài nộp muộn ${minutesLate} phút so với deadline. Áp dụng trừ 2 điểm.]`;
          } else if (minutesLate > 60) {
            latePenalty = {
              amount: 50,
              type: "percentage",
              minutes: minutesLate,
            };
            latePenaltyText = `\n\n[CHÚ THÍCH NỘP MUỘN: Bài nộp muộn ${minutesLate} phút so với deadline. Áp dụng trừ 50% tổng điểm.]`;
          }
        }
      }

      // Sửa gradingPrompt để thêm thông tin penalty:
      const gradingPrompt = `
        Đánh giá bài làm bài tập tự luận viết với hệ thống CHẤM ĐIỂM TỪNG PHẦN và cho điểm theo thang 10 điểm:
        
        ${answersText}
        
        HƯỚNG DẪN CHẤM ĐIỂM CHI TIẾT:
        
        1. Phân tích từng câu hỏi và xác định đáp án chuẩn dựa trên tài liệu đính kèm
        2. So sánh câu trả lời của học sinh với đáp án chuẩn
        3. Đánh giá mức độ chính xác: Đúng hoàn toàn, Đúng một phần, Sai, hoặc Không trả lời
        4. Tính điểm cho từng câu dựa trên tỷ lệ chính xác
        5. Đưa ra nhận xét và gợi ý cải thiện cho từng câu
        
        ${latePenaltyText}
        
        YÊU CẦU ĐỊNH DẠNG PHẢN HỒI:
        
        ĐIỂM TỔNG: [điểm]/10
          
        Cho mỗi câu hỏi, hãy trả về theo định dạng sau:
        
        === CÂU [số] ===
        Câu hỏi: [nội dung câu hỏi]
        Trả lời học sinh: [câu trả lời của học sinh]
        Đáp án chuẩn: [đáp án đúng hoàn chỉnh]
        Đánh giá: [Đúng hoàn toàn/Đúng một phần/Sai/Không trả lời]
        Điểm: [điểm câu này]/[điểm tối đa câu này]
        Phần trăm: [%]
        Nhận xét: [đánh giá chi tiết về câu trả lời]
        Gợi ý: [hướng dẫn cải thiện]
        
        [Lặp lại cho tất cả ${questions.length} câu]
        
        TỔNG KẾT:
        Số câu đúng hoàn toàn: [số]
        Số câu đúng một phần: [số]  
        Số câu sai: [số]
        Số câu không trả lời: [số]
        Điểm trung bình: [điểm]/10
        Nhận xét chung: [đánh giá tổng quan]
      `;

      console.log("[SUBMIT] Starting AI evaluation...");

      let documentForEvaluation: FileData | undefined = undefined;
      if (documentContent && documentContent.data) {
        documentForEvaluation = {
          mimeType: documentContent.mimeType,
          data: documentContent.data,
          fileName: documentContent.name,
        };
      }

      const modelId = exercise?.model?.id || "gemini-2.0-flash";
      const evaluationResult = await sendMessageToGemini(
        gradingPrompt,
        modelId,
        documentForEvaluation,
        documentContent?.name,
        exercise?.prompt || undefined
      );

      console.log("[SUBMIT] AI evaluation completed");

      // Parse detailed results from AI response
      let extractedScore = 0;
      const scoreMatch = evaluationResult.match(
        /ĐIỂM TỔNG:\s*(\d+([.,]\d+)?)\/10/
      );
      if (scoreMatch && scoreMatch[1]) {
        extractedScore = parseFloat(scoreMatch[1].replace(",", "."));
      }

      // Parse individual question results and update answers array
      const updatedAnswers = answersArray.map((answer, index) => {
        const questionNumber = index + 1;

        // Regex để tìm thông tin từng câu
        const questionRegex = new RegExp(
          `=== CÂU ${questionNumber} ===([\\s\\S]*?)(?==== CÂU \\d|TỔNG KẾT:|$)`,
          "i"
        );

        const questionMatch = evaluationResult.match(questionRegex);

        if (questionMatch) {
          const questionSection = questionMatch[1];

          // Trích xuất thông tin chi tiết
          const standardAnswerMatch = questionSection.match(
            /Đáp án chuẩn:\s*([^\n]*)/i
          );
          const evaluationMatch =
            questionSection.match(/Đánh giá:\s*([^\n]*)/i);
          const scoreMatch = questionSection.match(
            /Điểm:\s*(\d+([.,]\d+)?)\/(\d+([.,]\d+)?)/i
          );
          const percentMatch = questionSection.match(
            /Phần trăm:\s*(\d+([.,]\d+)?)%/i
          );
          const feedbackMatch = questionSection.match(/Nhận xét:\s*([^\n]*)/i);
          const suggestionMatch = questionSection.match(/Gợi ý:\s*([^\n]*)/i);

          const standardAnswer = standardAnswerMatch
            ? standardAnswerMatch[1].trim()
            : "";
          const evaluation = evaluationMatch ? evaluationMatch[1].trim() : "";
          const questionScore = scoreMatch
            ? parseFloat(scoreMatch[1].replace(",", "."))
            : 0;
          const maxScore = scoreMatch
            ? parseFloat(scoreMatch[3].replace(",", "."))
            : 10 / questions.length;
          const percentage = percentMatch
            ? parseFloat(percentMatch[1].replace(",", "."))
            : 0;
          const feedback = feedbackMatch ? feedbackMatch[1].trim() : "";
          const suggestion = suggestionMatch ? suggestionMatch[1].trim() : "";

          // Xác định trạng thái
          let isCorrect = null;
          let status = "unanswered";

          if (evaluation.toLowerCase().includes("đúng hoàn toàn")) {
            isCorrect = true;
            status = "correct";
          } else if (evaluation.toLowerCase().includes("đúng một phần")) {
            isCorrect = false; // Partially correct
            status = "partial";
          } else if (evaluation.toLowerCase().includes("sai")) {
            isCorrect = false;
            status = "incorrect";
          } else if (evaluation.toLowerCase().includes("không trả lời")) {
            isCorrect = false;
            status = "unanswered";
          }

          // Cập nhật answer object với thông tin chi tiết
          return {
            ...answer,
            standardAnswer,
            correctAnswer: standardAnswer, // Backup field
            isCorrect,
            status,
            score: questionScore,
            maxScore,
            percentage,
            feedback: `${feedback}${
              suggestion ? `\n\nGợi ý: ${suggestion}` : ""
            }`,
            explanation: `Đánh giá: ${evaluation}\nĐiểm: ${questionScore}/${maxScore} (${percentage}%)\n\n${feedback}${
              suggestion ? `\n\nGợi ý cải thiện: ${suggestion}` : ""
            }`,
            evaluation,
            suggestion,
            // Thêm các trường bổ sung để tương thích
            level:
              percentage >= 80
                ? "Tốt"
                : percentage >= 60
                ? "Khá"
                : percentage >= 40
                ? "Trung bình"
                : "Yếu",
            detailedFeedback: questionSection,
          };
        }

        // Fallback nếu không parse được
        return {
          ...answer,
          standardAnswer: "Chưa có đáp án chuẩn",
          correctAnswer: "Chưa có đáp án chuẩn",
          isCorrect: false,
          status: "unanswered",
          score: 0,
          maxScore: 10 / questions.length,
          percentage: 0,
          feedback: "Không thể đánh giá câu trả lời này",
          explanation: "Không thể đánh giá câu trả lời này",
          evaluation: "Không xác định",
          suggestion: "Vui lòng liên hệ giáo viên",
          level: "Yếu",
          detailedFeedback: "Không có thông tin chi tiết",
        };
      });

      console.log(
        "[SUBMIT] Updated answers with AI feedback:",
        updatedAnswers.length
      );

      // Tính toán điểm số cuối cùng
      const calculatedTotalScore = updatedAnswers.reduce(
        (sum, answer) => sum + (answer.score || 0),
        0
      );
      let finalScore = Math.min(
        Math.max(extractedScore, calculatedTotalScore),
        10
      );

      console.log("[SUBMIT] Final score calculated:", finalScore);

      const serverId = exercise?.channel?.serverId;

      try {
        console.log("[SUBMIT] Checking for existing results...");

        let existingResult = null;
        try {
          const checkResponse = await fetch(
            `/api/exercises/${resolvedExerciseId}/result`
          );

          if (checkResponse.ok) {
            existingResult = await checkResponse.json();
          } else if (checkResponse.status !== 404) {
            const errorText = await checkResponse.text();
            console.warn(
              "[SUBMIT] Check existing result failed:",
              checkResponse.status,
              errorText
            );
          }
        } catch (checkError) {
          console.warn("[SUBMIT] Error checking existing results:", checkError);
        }

        if (existingResult && existingResult.id) {
          console.log("[SUBMIT] Exercise already submitted, redirecting...");
          toast({
            title: "Bài tập đã được nộp",
            description:
              "Bạn đã nộp bài tập này trước đây. Đang chuyển đến kết quả của bạn.",
            variant: "default",
          });
          router.push(
            `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/result/${existingResult.id}`
          );
          return;
        }

        console.log("[SUBMIT] Submitting to API...");

        // Sau khi có finalScore, thêm logic áp dụng penalty:
        if (latePenalty) {
          if (latePenalty.type === "fixed") {
            finalScore = Math.max(0, finalScore - latePenalty.amount);
          } else if (latePenalty.type === "percentage") {
            finalScore = finalScore * (1 - latePenalty.amount / 100);
          }
          finalScore = Math.max(0, Math.min(10, finalScore));
        }

        // Thêm latePenalty vào submitBody:
        const submitBody = {
          answers: updatedAnswers,
          score: finalScore,
          exerciseType: "written",
          latePenalty: latePenalty,
          detailedEvaluation: evaluationResult,
          totalQuestions: questions.length,
          answeredQuestions: updatedAnswers.filter(
            (a) => a.answer && a.answer.trim().length > 0
          ).length,
          correctQuestions: updatedAnswers.filter((a) => a.status === "correct")
            .length,
          partialQuestions: updatedAnswers.filter((a) => a.status === "partial")
            .length,
          incorrectQuestions: updatedAnswers.filter(
            (a) => a.status === "incorrect"
          ).length,
          unansweredQuestions: updatedAnswers.filter(
            (a) => a.status === "unanswered"
          ).length,
        };

        // Validate submit body before sending
        if (!submitBody.answers || submitBody.answers.length === 0) {
          throw new Error("No answers to submit");
        }

        if (typeof submitBody.score !== "number" || isNaN(submitBody.score)) {
          throw new Error("Invalid score calculated");
        }

        console.log("[SUBMIT] Submit body prepared:", {
          answersCount: submitBody.answers.length,
          score: submitBody.score,
          exerciseType: submitBody.exerciseType,
          totalQuestions: submitBody.totalQuestions,
          hasDetailedEvaluation: !!submitBody.detailedEvaluation,
        });

        const response = await fetch(
          `/api/exercises/${resolvedExerciseId}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(submitBody),
          }
        );

        console.log("[SUBMIT] API response status:", response.status);

        // Get response text first for better error handling
        const responseText = await response.text();
        console.log("[SUBMIT] API response text:", responseText);

        if (!response.ok) {
          console.error(
            "[SUBMIT] API response error:",
            response.status,
            responseText
          );

          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { error: responseText || "Unknown server error" };
          }

          if (errorData.error === "Database schema mismatch") {
            throw new Error(
              "Cấu hình cơ sở dữ liệu không đúng. Vui lòng liên hệ quản trị viên."
            );
          }

          if (errorData.error === "Exercise already submitted") {
            toast({
              title: "Bài tập đã được nộp",
              description: "Bạn đã nộp bài tập này trước đây.",
              variant: "default",
            });
            if (errorData.submissionId) {
              router.push(
                `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/result/${errorData.submissionId}`
              );
            }
            return;
          }

          throw new Error(
            errorData?.error ||
              errorData?.details ||
              `Server responded with status ${response.status}: ${responseText}`
          );
        }

        let resultData;
        try {
          resultData = JSON.parse(responseText);
        } catch {
          throw new Error("Invalid response format from server");
        }

        console.log("[SUBMIT] API response data:", resultData);

        if (!resultData.success) {
          throw new Error(resultData.error || "Submission failed");
        }

        if (!resultData.submissionId) {
          console.warn(
            "[SUBMIT] No submissionId in response, but submission was successful"
          );
        }

        clearSession();

        toast({
          title: "Nộp bài thành công",
          description: `Bài tập đã được chấm điểm chi tiết. Điểm của bạn: ${finalScore.toFixed(
            1
          )}/10. Đang chuyển đến trang kết quả.`,
          variant: "default",
        });

        // Navigation to results
        if (resultData.submissionId) {
          console.log(
            "[SUBMIT] Navigating to written result page:",
            resultData.submissionId
          );
          if (!serverId) {
            console.error("[SUBMIT] Missing serverId for navigation");
            toast({
              title: "Lỗi chuyển trang",
              description:
                "Không thể xác định đường dẫn kết quả. Vui lòng quay lại danh sách bài tập.",
              variant: "destructive",
            });
            setTimeout(() => {
              router.push(`/exercises`);
            }, 2000);
            return;
          }
          setTimeout(() => {
            router.push(
              `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/written-result/${resultData.submissionId}`
            );
          }, 2000);
        } else {
          setTimeout(() => {
            const channelId = exercise?.channel?.id;
            if (serverId && channelId) {
              router.push(
                `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/results?serverId=${serverId}&channelId=${channelId}`
              );
            } else {
              router.push(
                `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/results`
              );
            }
          }, 2000);
        }
      } catch (apiError) {
        console.error("[SUBMIT] API submission error:", apiError);

        const errorMessage =
          apiError instanceof Error
            ? apiError.message
            : "Không thể kết nối tới máy chủ";

        toast({
          title: "Lỗi kết nối",
          description: `Không thể lưu kết quả: ${errorMessage}. Vui lòng thử lại sau.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("[SUBMIT] General error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";

      toast({
        title: "Lỗi",
        description: `Không thể nộp bài tập: ${errorMessage}. Vui lòng thử lại.`,
        variant: "destructive",
      });
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const answeredCount = Object.keys(writtenAnswers).filter(
    (key) => writtenAnswers[key].trim() !== ""
  ).length;
  const completionPercentage =
    questions.length > 0
      ? Math.round((answeredCount / questions.length) * 100)
      : 0;

  // Determine if current question has a passage
  const currentQuestion = questions[currentQuestionIndex];
  const hasPassage = currentQuestion?.passage && currentQuestion?.groupId;

  // ProcessingOverlay component
  const ProcessingOverlay = () => {
    const [stage, setStage] = useState(0);
    const stages = [
      "Đang thu thập bài làm của bạn...",
      "Đang phân tích từng câu hỏi...",
      "Đang xác định tiêu chí chấm điểm...",
      "Đang đánh giá độ chính xác câu trả lời...",
      "Đang tính toán điểm số theo tỷ lệ...",
      "Đang tạo nhận xét chi tiết...",
      "Đang hoàn thiện kết quả...",
    ];

    useEffect(() => {
      if (!isProcessing) return;

      const interval = setInterval(() => {
        setStage((prev) => {
          if (prev >= stages.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);

      return () => clearInterval(interval);
    }, [isProcessing]);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">Đang chấm điểm bài làm</h3>
          <p className="text-muted-foreground mb-4">{stages[stage]}</p>
          <Progress
            value={((stage + 1) * 100) / stages.length}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground mt-4">
            Vui lòng không đóng trang hoặc tải lại trang.
          </p>
        </div>
      </div>
    );
  };

  // Written exercise interface
  return (
    <div className="flex flex-col h-full">
      {isProcessing && <ProcessingOverlay />}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          onClick={handleNavigateBack}
          disabled={isProcessing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-lg font-semibold">{exercise?.name || "Bài tập"}</h1>
        {exerciseFileUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(exerciseFileUrl, "_blank")}
            disabled={isProcessing}
          >
            <FileText className="h-4 w-4 mr-1" />
            Xem tài liệu đính kèm
          </Button>
        )}
      </div>

      {/* Timer display (when available) */}
      {timeLeft !== null && totalTime !== null && (
        <div className="bg-amber-50 dark:bg-amber-900/20 py-2 px-4 border-b flex justify-center">
          <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 py-2 border-b">
        <div className="flex justify-between items-center mb-1 text-sm">
          <span>
            Tiến độ: {answeredCount}/{questions.length} câu
          </span>
          <span>{completionPercentage}%</span>
        </div>
        <Progress value={completionPercentage} max={100} className="h-2" />
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full">
        {/* Question navigator sidebar */}
        <div className="hidden md:block w-64 border-r p-4 flex flex-col h-full">
          <h3 className="font-medium mb-3">Danh sách câu hỏi</h3>
          <div
            className={`overflow-y-auto mb-4 ${
              questions.length > 40 ? "max-h-[420px]" : ""
            } scrollbar-hide`}
          >
            <div className="grid grid-cols-4 gap-2 pt-2">
              {questions.map((question, index) => (
                <Button
                  key={index}
                  variant={
                    currentQuestionIndex === index ? "default" : "outline"
                  }
                  className={`aspect-square p-0 text-xs ${
                    writtenAnswers[question.id]?.trim()
                      ? "border-green-500"
                      : ""
                  } ${
                    currentQuestionIndex === index ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setCurrentQuestionIndex(index)}
                  disabled={isProcessing}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">{index + 1}</span>
                    {writtenAnswers[question.id]?.trim() && (
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Timer or no-timer indicator */}
          <div className="mt-auto rounded-md border p-2">
            {timeLeft !== null && totalTime !== null ? (
              <div className="bg-gray-100 dark:bg-gray-800">
                <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />
              </div>
            ) : (
              <div className="bg-green-100 dark:bg-green-800 text-center text-sm text-green-700 dark:text-green-300">
                <span className="font-medium">Không giới hạn thời gian</span>
                <br />
                <span className="text-xs">Bạn có thể làm bài thoải mái</span>
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col md:flex-row h-full">
          {/* Questions area (left) */}
          <div
            className={`flex-1 overflow-y-auto p-4 ${
              hasPassage ? "md:w-1/2" : "w-full"
            }`}
          >
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto">
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        Câu hỏi {currentQuestionIndex + 1}/{questions.length}
                      </CardTitle>
                      <Badge variant="outline">
                        {writtenAnswers[
                          questions[currentQuestionIndex]?.id
                        ]?.trim()
                          ? "Đã trả lời"
                          : "Chưa trả lời"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg mb-6">
                      {questions[currentQuestionIndex]?.text}
                    </p>

                    {/* Written Answer Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Câu trả lời của bạn:
                      </label>
                      <Textarea
                        value={
                          writtenAnswers[questions[currentQuestionIndex]?.id] ||
                          ""
                        }
                        onChange={(e) =>
                          handleAnswerInput(
                            questions[currentQuestionIndex]?.id,
                            e.target.value
                          )
                        }
                        placeholder="Nhập câu trả lời của bạn..."
                        className="min-h-[200px] resize-y"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Hãy trả lời chi tiết và rõ ràng. Bài làm sẽ được đánh
                        giá dựa trên nội dung và độ hoàn thành.
                        {timeLeft !== null && totalTime !== null
                          ? " Hãy hoàn thành trong thời gian quy định."
                          : " Không giới hạn thời gian làm bài."}
                      </p>
                    </div>

                    {/* Mobile timer display */}
                    <div className="md:hidden mt-6 border-t pt-4">
                      {timeLeft !== null && totalTime !== null ? (
                        <CountdownTimer
                          timeLeft={timeLeft}
                          totalTime={totalTime}
                        />
                      ) : (
                        <div className="bg-green-100 dark:bg-green-800 rounded-md border p-2 text-center">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            Không giới hạn thời gian làm bài
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0 || isProcessing}
                    >
                      Câu trước
                    </Button>

                    <Button
                      onClick={handleNextQuestion}
                      disabled={
                        currentQuestionIndex === questions.length - 1 ||
                        isProcessing
                      }
                    >
                      Câu tiếp
                    </Button>
                  </CardFooter>
                </Card>

                {/* Mobile question navigator */}
                <div className="md:hidden mb-6">
                  <h3 className="font-medium mb-3">Danh sách câu hỏi</h3>
                  <div
                    className={`overflow-y-auto ${
                      questions.length > 40 ? "max-h-[240px]" : ""
                    } scrollbar-hide`}
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((question, index) => (
                        <Button
                          key={index}
                          variant={
                            currentQuestionIndex === index
                              ? "default"
                              : "outline"
                          }
                          className={`aspect-square p-0 text-xs ${
                            writtenAnswers[question.id]?.trim()
                              ? "border-green-500"
                              : ""
                          } ${
                            currentQuestionIndex === index
                              ? "ring-2 ring-primary"
                              : ""
                          }`}
                          onClick={() => setCurrentQuestionIndex(index)}
                          disabled={isProcessing}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-medium">
                              {index + 1}
                            </span>
                            {writtenAnswers[question.id]?.trim() && (
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1" />
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleSubmitExercise}
                    disabled={isSubmitting || isProcessing}
                    className="w-full max-w-md"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Nộp bài tập
                      </>
                    )}
                  </Button>
                </div>

                <div ref={questionsEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Passage area (right) */}
          {hasPassage && (
            <div className="md:w-1/2 border-l p-4 bg-gray-50 dark:bg-gray-800">
              <ScrollArea className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Đoạn văn tham khảo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {currentQuestion.passage}
                    </p>
                  </CardContent>
                </Card>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
