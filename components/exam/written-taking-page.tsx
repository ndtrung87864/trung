"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, Calendar, Send } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import ClientOnly from "@/components/ClientOnly";
import { formatDeadline, isDeadlinePassed } from "@/lib/exam-timer";
import { sendMessageToGemini } from "@/lib/gemini_google";
import { clearCachedQuestions } from "./exam-taking-page";
// Interfaces (aligned with ExamTakingPage)
interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  passage?: string;
  groupId?: string;
  type?: string;
}

interface ExamFile {
  name: string;
  url: string;
}

interface ExamChannel {
  id: string;
  name: string;
  serverId: string;
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
  channel?: ExamChannel;
}

interface ExamResultDetail {
  question: Question;
  userAnswer: string | null;
  correctAnswer: string;
  status: string;
  explanation: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  level?: string;
  standardAnswer?: string;
  analysis?: string;
  detailsBreakdown?: string;
  calculation?: string;
  feedback?: string;
  strengths?: string;
  improvements?: string;
  suggestions?: string;
  detailedFeedback?: string;
}

interface SubmittedResult {
  id: string;
  userId: string;
  examId: string;
  score: number;
  answers: Array<{
    questionId: string;
    answer: string;
    type?: string;
  }>;
  submissionId?: string;
  details?: ExamResultDetail[];
}

// LocalStorage key for exam session data
const EXAM_SESSION_KEY_PREFIX = "exam_session_";

// Helper function to get the storage key for a specific exam
const getExamStorageKey = (examId: string) =>
  `${EXAM_SESSION_KEY_PREFIX}${examId}`;

// Parse minutes from prompt
function parseMinutesFromPrompt(prompt?: string | null): number {
  if (!prompt) return 0;
  const match = prompt.match(/(\d+)\s*phút/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

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

// Custom hook to manage exam session data (same as ExamTakingPage)
const useExamSession = (examId?: string) => {
  const saveAnswers = useCallback(
    (answers: { [questionId: string]: string }) => {
      if (!examId) return;
      try {
        const sessionData = JSON.parse(
          localStorage.getItem(getExamStorageKey(examId)) || "{}"
        );
        localStorage.setItem(
          getExamStorageKey(examId),
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
    [examId]
  );

  const saveTimerState = useCallback(
    (timeLeft: number, totalTime: number) => {
      if (!examId) return;
      try {
        const sessionData = JSON.parse(
          localStorage.getItem(getExamStorageKey(examId)) || "{}"
        );
        const expiresAt =
          timeLeft > 0
            ? new Date(Date.now() + timeLeft * 1000).toISOString()
            : null;

        localStorage.setItem(
          getExamStorageKey(examId),
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
    [examId]
  );

  const saveQuestionIndex = useCallback(
    (index: number) => {
      if (!examId) return;
      try {
        const sessionData = JSON.parse(
          localStorage.getItem(getExamStorageKey(examId)) || "{}"
        );
        localStorage.setItem(
          getExamStorageKey(examId),
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
    [examId]
  );

  const loadSession = useCallback(() => {
    if (!examId) return null;
    try {
      const sessionData = JSON.parse(
        localStorage.getItem(getExamStorageKey(examId)) || "{}"
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
  }, [examId]);

  const clearSession = useCallback(() => {
    if (!examId) return;
    localStorage.removeItem(getExamStorageKey(examId));
  }, [examId]);

  return {
    saveAnswers,
    saveTimerState,
    saveQuestionIndex,
    loadSession,
    clearSession,
  };
};

// CountdownTimer component (same as ExamTakingPage)
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

export const WrittenTakingPage = ({
  exam,
  questions,
  examFileUrl,
  timeLeft: initialTimeLeft,
  totalTime: initialTotalTime,
  clearSession,
  resolvedExamId,
}: {
  exam: Exam | null;
  questions: Question[];
  examFileUrl: string | null;
  documentContent: {
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null;
  timeLeft: number | null;
  totalTime: number | null;
  clearSession: () => void;
  resolvedExamId?: string;
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [writtenAnswers, setWrittenAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(initialTimeLeft);
  const [totalTime, setTotalTime] = useState<number | null>(initialTotalTime);
  const [submittedResult, setSubmittedResult] =
    useState<SubmittedResult | null>(null);
  const [checkingResult, setCheckingResult] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [showGradingPopup, setShowGradingPopup] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingMessage, setGradingMessage] = useState("");

  const questionsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { saveAnswers, saveTimerState, saveQuestionIndex, loadSession } =
    useExamSession(resolvedExamId);

  // Grading stages for written exam (from ExamTakingPage)
  const gradingStages = [
    "Đang thu thập bài làm của bạn...",
    "Đang phân tích từng câu hỏi...",
    "Đang xác định tiêu chí chấm điểm...",
    "Đang đánh giá độ chính xác câu trả lời...",
    "Đang tính toán điểm số theo tỷ lệ...",
    "Đang tạo nhận xét chi tiết...",
    "Đang hoàn thiện kết quả...",
  ];

  // Get userId from API
  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfileId(data?.id || null))
      .catch(() => setProfileId(null));
  }, []);

  // Check for existing result
  useEffect(() => {
    if (!resolvedExamId || !profileId) return;
    setCheckingResult(true);

    fetch(`/api/exam-result?examId=${resolvedExamId}&userId=${profileId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && typeof data.score !== "number") {
          try {
            if (typeof data.score === "string") {
              data.score = parseFloat(data.score);
            } else if (data.score && typeof data.score === "object") {
              data.score = parseFloat(data.score.toString());
            }
          } catch (e) {
            console.error("Error parsing score:", e);
            data.score = 0;
          }
        }

        if (
          data &&
          data.id &&
          data.userId === profileId &&
          data.examId === resolvedExamId &&
          data.score !== null &&
          data.score !== undefined &&
          Array.isArray(data.answers) &&
          data.answers.length > 0
        ) {
          setSubmittedResult(data);
        } else {
          setSubmittedResult(null);
          console.log("No valid exam result found");
        }
        setCheckingResult(false);
      })
      .catch((error) => {
        console.error("Error checking exam results:", error);
        setSubmittedResult(null);
        setCheckingResult(false);
        toast({
          title: "Lỗi kết nối",
          description:
            "Không thể kiểm tra kết quả bài thi. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      });
  }, [resolvedExamId, profileId]);

  // Restore session and set up timer
  useEffect(() => {
    if (!resolvedExamId || submittedResult || !questions.length) return;

    try {
      const savedSession = loadSession();
      if (savedSession && Object.keys(savedSession).length > 0) {
        setIsRestoringSession(true);

        if (
          savedSession.writtenAnswers &&
          Object.keys(savedSession.writtenAnswers).length > 0
        ) {
          setWrittenAnswers(savedSession.writtenAnswers);
        }

        if (typeof savedSession.currentQuestionIndex === "number") {
          setCurrentQuestionIndex(savedSession.currentQuestionIndex);
        }

        if (
          typeof savedSession.timeLeft === "number" &&
          savedSession.timeLeft > 0
        ) {
          setTimeLeft(savedSession.timeLeft);
          if (typeof savedSession.totalTime === "number") {
            setTotalTime(savedSession.totalTime);
          }
        } else if (exam?.prompt) {
          const minutes = parseMinutesFromPrompt(exam.prompt);
          if (minutes > 0) {
            setTimeLeft(minutes * 60);
            setTotalTime(minutes * 60);
          }
        }

        setIsRestoringSession(false);
      } else if (exam?.prompt) {
        const minutes = parseMinutesFromPrompt(exam.prompt);
        if (minutes > 0) {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    } catch (error) {
      console.error("Error restoring exam session:", error);
      setIsRestoringSession(false);

      if (exam?.prompt) {
        const minutes = parseMinutesFromPrompt(exam.prompt);
        if (minutes > 0 && timeLeft === null) {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    }
  }, [
    resolvedExamId,
    submittedResult,
    questions.length,
    exam,
    loadSession,
    timeLeft,
  ]);

  // Save answers when they change
  useEffect(() => {
    if (
      isRestoringSession ||
      isExamFinished ||
      !resolvedExamId ||
      !questions.length
    )
      return;
    saveAnswers(writtenAnswers);
  }, [
    writtenAnswers,
    isRestoringSession,
    isExamFinished,
    resolvedExamId,
    questions.length,
    saveAnswers,
  ]);

  // Save question index when it changes
  useEffect(() => {
    if (
      isRestoringSession ||
      isExamFinished ||
      !resolvedExamId ||
      !questions.length
    )
      return;
    saveQuestionIndex(currentQuestionIndex);
  }, [
    currentQuestionIndex,
    isRestoringSession,
    isExamFinished,
    resolvedExamId,
    questions.length,
    saveQuestionIndex,
  ]);

  // Save timer state periodically
  useEffect(() => {
    if (
      isRestoringSession ||
      isExamFinished ||
      timeLeft === null ||
      totalTime === null ||
      !resolvedExamId
    )
      return;

    saveTimerState(timeLeft, totalTime);

    const saveInterval = setInterval(() => {
      if (timeLeft > 0) {
        saveTimerState(timeLeft, totalTime);
      }
    }, 10000);

    return () => clearInterval(saveInterval);
  }, [
    timeLeft,
    totalTime,
    isRestoringSession,
    isExamFinished,
    resolvedExamId,
    saveTimerState,
  ]);

  // Add beforeunload event listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isExamFinished && questions.length > 0 && !submittedResult) {
        const message =
          "Bạn sẽ rời khỏi trang làm bài kiểm tra. Tiến độ làm bài sẽ được lưu lại.";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isExamFinished, questions.length, submittedResult]);

  // Scroll to bottom when changing questions
  useEffect(() => {
    if (questionsEndRef.current) {
      questionsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [questions, currentQuestionIndex]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || isExamFinished || isProcessing || checkingResult) return;

    // When timer reaches zero, trigger submission
    if (timeLeft <= 0) {
      // Use setTimeout to avoid potential render issues
      setTimeout(() => {
        if (!isSubmitting && !isProcessing) {
          toast({
            title: "Hết thời gian làm bài",
            description: "Bài kiểm tra của bạn đang được tự động nộp.",
            variant: "default",
          });
          handleSubmitExam();
        }
      }, 0);
      return;
    }

    timerRef.current = setTimeout(
      () => setTimeLeft((prev) => (prev !== null ? prev - 1 : null)),
      1000
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isExamFinished, isProcessing, checkingResult]);

  // Handle answer input
  const handleAnswerInput = (questionId: string, answer: string) => {
    setWrittenAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Move to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle navigation back to exam list
  const handleNavigateBack = () => {
    if (!isExamFinished && questions.length > 0) {
      toast({
        title: "Tiến độ đã được lưu",
        description: "Bạn có thể quay lại để tiếp tục làm bài sau.",
        variant: "default",
      });
    }

    const channelId = exam?.channel?.id;
    const serverId = exam?.channel?.serverId;

    if (serverId && channelId) {
      router.push(`/servers/${serverId}/exams/${channelId}`);
    } else if (serverId) {
      router.push(`/servers/${serverId}/exams`);
    } else {
      router.push("/exams");
    }
  };

  // Submit exam for grading
  const handleSubmitExam = async () => {
    try {
      // Prevent multiple submissions
      if (isSubmitting || isProcessing) return;
      
      // Immediately mark as submitting and processing to prevent duplicate submissions
      setIsSubmitting(true);
      setIsProcessing(true);
      setIsExamFinished(true);
      setShowGradingPopup(true);
      setGradingProgress(0);
      setGradingMessage(gradingStages[0]);

      // Clear any pending timer to prevent timer tick during submission
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (resolvedExamId) {
        clearSession();
      }

      // Determine if this is an automatic submission due to time expiring
      const isAutoSubmit = timeLeft !== null && timeLeft <= 0;
      
      if (isAutoSubmit) {
        toast({
          title: "Hết thời gian làm bài",
          description: "Bài kiểm tra của bạn đã được tự động nộp.",
          variant: "default",
        });
      }

      if (questions.length === 0) {
        toast({
          title: "Không thể nộp bài",
          description: "Không có câu hỏi nào trong bài kiểm tra",
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsProcessing(false);
        setShowGradingPopup(false);
        return;
      }

      // Ensure there's at least an empty answer for each question to prevent API errors
      const defaultAnswers: { [questionId: string]: string } = {};
      questions.forEach(q => {
        if (!writtenAnswers[q.id]) {
          defaultAnswers[q.id] = "";
        }
      });
      const combinedAnswers = { ...defaultAnswers, ...writtenAnswers };

      // Update grading progress
      setGradingProgress(20);
      setGradingMessage(gradingStages[1]);

      // Create answers array for written exam with combined answers
      const writtenAnswersArray = questions.map((question, index) => ({
        question: question.text,
        answer: combinedAnswers[question.id] || "",
        type: "written",
        questionIndex: index + 1,
      }));
      
      setGradingProgress(40);
      setGradingMessage(gradingStages[2]);

      // Create detailed grading prompt for written answers (from ExamTakingPage)
      const answersText = writtenAnswersArray
        .map(
          (answer, index) =>
            `Câu ${index + 1}: ${answer.question}\nCâu trả lời của học sinh: ${
              answer.answer || "Không có câu trả lời"
            }`
        )
        .join("\n\n");

      const gradingPrompt = `
        Bạn là giáo viên chấm điểm bài kiểm tra tự luận với hệ thống CHẤM ĐIỂM TỪNG PHẦN. Hãy đánh giá bài làm sau đây.
        
        Thông tin về bài kiểm tra:
        - Tên bài kiểm tra: ${exam?.name || "Bài kiểm tra tự luận"}
        - Tổng số câu hỏi: ${questions.length}
        - Điểm tối đa mỗi câu: ${(10 / questions.length).toFixed(2)} điểm
        - Tổng điểm: 10 điểm
        
        Bài làm của học sinh:
        ${answersText}
        
        NGUYÊN TẮC CHẤM ĐIỂM TỪNG PHẦN - BẮT BUỘC PHẢI TUÂN THỦ:
        
        **1. PHÂN TÍCH CẤU TRÚC CÂU HỎI:**
        - Chia mỗi câu hỏi thành các ý nhỏ cần trả lời
        - Xác định số điểm cho từng ý (điểm_câu ÷ số_ý)
        - Mỗi ý có thể đạt: 100%, 75%, 50%, 25%, hoặc 0%
        - LUÔN LUÔN tính điểm cho phần trả lời đúng, dù chỉ một phần nhỏ
        
        **2. TIÊU CHÍ CHẤM TỪNG Ý - KHUYẾN KHÍCH ĐIỂM PHẦN:**
        - **100% ý**: Trả lời hoàn toàn chính xác, đầy đủ
        - **75% ý**: Trả lời đúng phần lớn, thiếu chi tiết nhỏ hoặc có sai sót nhỏ
        - **50% ý**: Trả lời đúng một nửa, có ý tưởng chính đúng nhưng thiếu hoặc sai chi tiết
        - **25% ý**: Có ý tưởng đúng cơ bản, nhưng trình bày chưa rõ hoặc sai nhiều chi tiết
        - **0% ý**: Hoàn toàn sai hoặc không liên quan đến ý cần trả lời
        
        **3. QUY TẮC TÍNH ĐIỂM PHẦN - QUAN TRỌNG:**
        - NẾU học sinh trả lời được BẤT KỲ phần nào đúng → PHẢI cho điểm phần tương ứng
        - Điểm_câu = (Tổng % các ý) ÷ 100 × Điểm_tối_đa_câu
        - VÍ DỤ: Câu 2.5 điểm có 4 ý, học sinh đúng 2 ý (50%) → được 1.25 điểm
        - KHÔNG ĐƯỢC cho 0 điểm nếu có bất kỳ phần nào đúng
        
        **4. VÍ DỤ TÍNH ĐIỂM CHI TIẾT:**
        Câu có 4 ý (A, B, C, D), điểm tối đa 2.5:
        - Ý A: 75% = 0.469 điểm
        - Ý B: 50% = 0.313 điểm  
        - Ý C: 25% = 0.156 điểm
        - Ý D: 0% = 0 điểm
        → Tổng: (75+50+25+0)/4 = 37.5% → 0.938/2.5 điểm
        
        **5. XÁC ĐỊNH ĐÁP ÁN CHUẨN:**
        Dựa trên tài liệu đính kèm để xác định đáp án hoàn chỉnh cho từng câu hỏi
        
        **6. PHÂN LOẠI KẾT QUẢ DỰA TRÊN % ĐIỂM:**
        - **XUẤT SẮC**: 90-100% 
        - **TỐT**: 70-89% 
        - **KHÁ**: 50-69% 
        - **TRUNG BÌNH**: 30-49% 
        - **YẾU**: 10-29% 
        - **KÉM**: 0-9% 
        
        **ĐỊNH DẠNG KẾT QUẢ BẮT BUỘC:**
        
        ĐIỂM TỔNG: [tổng_điểm_thực_tế]/10
        
        Câu 1: [điểm_thực_tế]/[điểm_tối_đa] - Tỷ lệ: [X.X]% - Trạng thái: [Xuất sắc/Tốt/Khá/Trung bình/Yếu/Kém]
        + Đáp án chuẩn: [liệt kê đầy đủ tất cả các ý cần trả lời]
        + Phân tích: [Câu hỏi có X ý: ý1, ý2, ý3...]
        + Chi tiết chấm điểm:
          - Ý 1: [mô tả ý] → [100%/75%/50%/25%/0%] - [lý do chi tiết]
          - Ý 2: [mô tả ý] → [100%/75%/50%/25%/0%] - [lý do chi tiết]
          - Ý 3: [mô tả ý] → [100%/75%/50%/25%/0%] - [lý do chi tiết]
        + Tính toán: ([tỷ lệ ý1] + [tỷ lệ ý2] + [tỷ lệ ý3] + ...) ÷ [số ý] = [%tổng] = [điểm_cuối]/[điểm_tối_đa]
        + Điểm mạnh: [nêu những gì học sinh làm tốt]
        + Cần cải thiện: [nêu cụ thể thiếu sót]
        + Gợi ý: [hướng dẫn cách trả lời đầy đủ hơn]
        
        [Lặp lại cho tất cả ${questions.length} câu]
        
        TỔNG KẾT:
        - Điểm trung bình mỗi câu: [điểm_TB]/[điểm_tối_đa_TB]
        - Số câu xuất sắc/tốt/khá/trung bình/yếu/kém: [thống kê]
        - Nhận xét chung: [đánh giá tổng quan về năng lực học sinh]
        - Khuyến nghị: [hướng phát triển cho học sinh]
        
        **LƯU Ý QUAN TRỌNG - PHẢI TUÂN THỦ:**
        - Phải chấm điểm cho TẤT CẢ ${questions.length} câu hỏi
        - Tính điểm chính xác đến 2 chữ số thập phân
        - LUÔN LUÔN cho điểm phần nếu có bất kỳ ý nào đúng
        - Không được bỏ qua câu nào dù học sinh không trả lời
        - Phải có đáp án chuẩn cho từng câu
        - Phải chi tiết từng ý trong mỗi câu trả lời
        - Ưu tiên cho điểm phần thay vì 0 điểm khi có thể
      `;

      setGradingProgress(60);
      setGradingMessage(gradingStages[3]);

      const modelId = exam?.model?.id || "gemini-2.0-flash";
      const evaluationResult = await sendMessageToGemini(
        gradingPrompt,
        modelId,
        undefined,
        undefined,
        exam?.prompt || undefined
      );

      setGradingProgress(80);
      setGradingMessage(gradingStages[4]);

      // Extract total score from AI response (for reference only)
      let aiTotalScore = 0;
      const totalScoreMatch = evaluationResult.match(
        /ĐIỂM TỔNG:\s*(\d+([.,]\d+)?)\/10/
      );
      if (totalScoreMatch && totalScoreMatch[1]) {
        aiTotalScore = parseFloat(totalScoreMatch[1].replace(",", "."));
      }

      // Parse detailed results for each question with improved regex for ratio scoring
      const detailedResults = questions.map((question, index) => {
        const questionNumber = index + 1;
        const maxScorePerQuestion = 10 / questions.length;

        // Enhanced regex to capture actual score, max score, percentage and status with better flexibility
        const questionRegex = new RegExp(
          `Câu\\s*${questionNumber}:\\s*([\\d.,]+)\\s*\\/\\s*([\\d.,]+)\\s*-\\s*Tỷ\\s*lệ:\\s*([\\d.,]+)%\\s*-\\s*Trạng\\s*thái:\\s*([^\\+\\n]+?)([\\s\\S]*?)(?=Câu\\s*\\d+:|TỔNG\\s*KẾT:|$)`,
          "i"
        );

        const questionMatch = evaluationResult.match(questionRegex);

        let questionScore = 0;
        let actualMaxScore = maxScorePerQuestion;
        let percentage = 0;
        let standardAnswer = "";
        let analysis = "";
        let detailsBreakdown = "";
        let calculation = "";
        let strengths = "";
        let improvements = "";
        let suggestions = "";

        if (questionMatch) {
          // Parse scores and percentages with better handling
          const scoreText = questionMatch[1].replace(",", ".");
          const maxScoreText = questionMatch[2].replace(",", ".");
          const percentageText = questionMatch[3].replace(",", ".");

          // Use AI-provided score if available, otherwise calculate from percentage
          const aiProvidedScore = parseFloat(scoreText) || 0;
          actualMaxScore = parseFloat(maxScoreText) || maxScorePerQuestion;
          percentage = parseFloat(percentageText) || 0;

          // Calculate score based on percentage to ensure consistency
          const calculatedScore = (percentage / 100) * actualMaxScore;

          // Use calculated score for consistency, but validate against AI score
          questionScore = calculatedScore;

          // If AI provided score is significantly different but reasonable, consider using it
          if (
            aiProvidedScore > 0 &&
            Math.abs(aiProvidedScore - calculatedScore) <= actualMaxScore * 0.1
          ) {
            questionScore = Math.max(aiProvidedScore, calculatedScore); // Take the higher score to favor student
          }

          const details = questionMatch[5] || "";

          // Extract detailed feedback with improved patterns
          const standardAnswerMatch = details.match(
            /\+\s*Đáp\s*án\s*chuẩn:\s*([^\+]*?)(?=\+|$)/i
          );
          const analysisMatch = details.match(
            /\+\s*Phân\s*tích:\s*([^\+]*?)(?=\+|$)/i
          );
          const detailsMatch = details.match(
            /\+\s*Chi\s*tiết\s*chấm\s*điểm:\s*([^\+]*?)(?=\+|$)/i
          );
          const calculationMatch = details.match(
            /\+\s*Tính\s*toán:\s*([^\+]*?)(?=\+|$)/i
          );
          const strengthsMatch = details.match(
            /\+\s*Điểm\s*mạnh:\s*([^\+]*?)(?=\+|$)/i
          );
          const improvementsMatch = details.match(
            /\+\s*Cần\s*cải\s*thiện:\s*([^\+]*?)(?=\+|$)/i
          );
          const suggestionsMatch = details.match(
            /\+\s*Gợi\s*ý:\s*([^\+]*?)(?=\+|$)/i
          );

          standardAnswer = standardAnswerMatch
            ? standardAnswerMatch[1].trim()
            : "Chưa có đáp án chuẩn";
          analysis = analysisMatch
            ? analysisMatch[1].trim()
            : "Chưa có phân tích";
          detailsBreakdown = detailsMatch
            ? detailsMatch[1].trim()
            : "Chưa có chi tiết chấm điểm";
          calculation = calculationMatch
            ? calculationMatch[1].trim()
            : "Chưa có tính toán";
          strengths = strengthsMatch
            ? strengthsMatch[1].trim()
            : "Chưa có đánh giá";
          improvements = improvementsMatch
            ? improvementsMatch[1].trim()
            : "Chưa có đánh giá";
          suggestions = suggestionsMatch
            ? suggestionsMatch[1].trim()
            : "Chưa có đánh giá";
        } else {
          // Enhanced fallback: try multiple patterns to extract percentage
          const fallbackPatterns = [
            new RegExp(`Câu\\s*${questionNumber}[\\s\\S]*?([\\d.,]+)%`, "i"),
            new RegExp(`${questionNumber}[\\s\\S]*?([\\d.,]+)\\s*%`, "i"),
            new RegExp(
              `Câu\\s*${questionNumber}[\\s\\S]*?Tỷ\\s*lệ[\\s\\S]*?([\\d.,]+)%`,
              "i"
            ),
          ];

          for (const pattern of fallbackPatterns) {
            const match = evaluationResult.match(pattern);
            if (match) {
              percentage = parseFloat(match[1].replace(",", ".")) || 0;
              questionScore = (percentage / 100) * maxScorePerQuestion;
              actualMaxScore = maxScorePerQuestion;
              break;
            }
          }

          // If still no percentage found, try to extract any mention of partial credit
          if (percentage === 0) {
            const partialCreditPatterns = [
              /một\s*phần/i,
              /phần\s*đúng/i,
              /đúng\s*một\s*ít/i,
              /có\s*ý\s*tưởng/i,
              /chưa\s*đầy\s*đủ/i,
            ];

            const questionText = evaluationResult.substring(
              evaluationResult.indexOf(`Câu ${questionNumber}`),
              evaluationResult.indexOf(`Câu ${questionNumber + 1}`) ||
                evaluationResult.length
            );

            for (const pattern of partialCreditPatterns) {
              if (pattern.test(questionText)) {
                percentage = 25; // Give at least 25% for partial understanding
                questionScore = (percentage / 100) * maxScorePerQuestion;
                actualMaxScore = maxScorePerQuestion;
                break;
              }
            }
          }
        }

        // Enhanced status mapping with better partial credit support
        let status: "correct" | "partial" | "incorrect" | "unanswered";

        if (percentage >= 85) {
          status = "correct";
        } else if (percentage >= 15) {
          // Lower threshold for partial credit
          status = "partial";
        } else if (percentage > 0) {
          // Even tiny amounts get partial credit
          status = "partial";
        } else {
          // Check if student provided any answer
          const studentAnswer = writtenAnswers[question.id] || "";
          if (studentAnswer.trim().length > 0) {
            // Give minimal partial credit for attempting to answer
            percentage = Math.max(percentage, 5);
            questionScore = Math.max(
              questionScore,
              (5 / 100) * maxScorePerQuestion
            );
            status = "partial";
          } else {
            status = "unanswered";
          }
        }

        // Ensure score is within valid range and round appropriately
        questionScore = Math.max(0, Math.min(questionScore, actualMaxScore));
        questionScore = Math.round(questionScore * 100) / 100; // Round to 2 decimal places

        // Determine level based on percentage with more generous partial credit
        let level = "Kém";
        if (percentage >= 85) level = "Xuất sắc";
        else if (percentage >= 70) level = "Tốt";
        else if (percentage >= 50) level = "Khá";
        else if (percentage >= 30) level = "Trung bình";
        else if (percentage >= 15) level = "Yếu";
        else if (percentage > 0) level = "Yếu"; // Still give "Yếu" instead of "Kém" for any effort

        return {
          question: question.text,
          answer: writtenAnswers[question.id] || "",
          type: "written",
          questionIndex: questionNumber,
          score: questionScore,
          maxScore: Math.round(actualMaxScore * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
          level,
          status,
          standardAnswer,
          analysis,
          detailsBreakdown,
          calculation,
          feedback: `Điểm: ${questionScore.toFixed(2)}/${actualMaxScore.toFixed(
            2
          )} (${percentage.toFixed(
            1
          )}%)\nTrạng thái: ${level}\n\nĐáp án chuẩn: ${standardAnswer}\n\nPhân tích: ${analysis}\n\nChi tiết chấm điểm:\n${detailsBreakdown}\n\nTính toán: ${calculation}\n\nĐiểm mạnh: ${strengths}\n\nCần cải thiện: ${improvements}\n\nGợi ý: ${suggestions}`,
          strengths,
          improvements,
          suggestions,
          detailedFeedback: evaluationResult,
        };
      });

      // Calculate the actual total score by summing individual question scores
      const calculatedTotalScore = detailedResults.reduce((sum, result) => {
        return sum + (result.score || 0);
      }, 0);

      // Round to 2 decimal places and ensure it doesn't exceed 10
      const finalTotalScore = Math.min(
        Math.round(calculatedTotalScore * 100) / 100,
        10
      );

      // Calculate late submission penalty
      let latePenalty = 0;
      let lateSubmissionNote = "";

      if (exam?.deadline && finalTotalScore > 0) {  // Only apply penalty if score > 0
        const deadline = new Date(exam.deadline);
        const now = new Date();

        if (now > deadline) {
          const minutesLate = Math.floor(
            (now.getTime() - deadline.getTime()) / (60 * 1000)
          );

          if (minutesLate > 0 && minutesLate <= 30) {
            latePenalty = 0.5;
            lateSubmissionNote = `Nộp muộn ${minutesLate} phút, trừ 0.5 điểm.`;
          } else if (minutesLate > 30 && minutesLate <= 60) {
            latePenalty = 2;
            lateSubmissionNote = `Nộp muộn ${minutesLate} phút, trừ 2 điểm.`;
          } else if (minutesLate > 60) {
            latePenalty = finalTotalScore / 2; // Trừ 1/2 số điểm
            const hours = Math.floor(minutesLate / 60);
            const mins = minutesLate % 60;
            lateSubmissionNote = `Nộp muộn ${hours} giờ ${mins} phút, trừ 1/2 số điểm.`;
          }
        }
      }

      // Apply penalty
      const scoreAfterPenalty = Math.max(0, finalTotalScore - latePenalty);
      const finalScoreWithPenalty = Math.round(scoreAfterPenalty * 100) / 100;

      // Enhanced logging for debugging partial credit
      console.log(`AI Suggested Total: ${aiTotalScore}`);
      console.log(`Calculated Total: ${finalTotalScore}`);
      console.log(`Late Penalty: ${latePenalty}`);
      console.log(`Final Score With Penalty: ${finalScoreWithPenalty}`);
      console.log(`Late Submission Note: ${lateSubmissionNote}`);

      setGradingProgress(90);
      setGradingMessage(gradingStages[5]);

      const serverId = exam?.channel?.serverId;

      try {
        const response = await fetch(`/api/exams/${resolvedExamId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: detailedResults,
            answer_data: combinedAnswers, // Add this field to ensure we have answer data
            score: finalScoreWithPenalty,
            examType: "written",
            detailedEvaluation: evaluationResult,
            latePenalty:
              latePenalty > 0
                ? {
                    amount: latePenalty,
                    note: lateSubmissionNote,
                    originalScore: finalTotalScore,
                  }
                : undefined,
            // Include both scores for debugging
            debugInfo: {
              aiSuggestedTotal: aiTotalScore,
              calculatedTotal: finalTotalScore,
              individualScores: detailedResults.map((r) => r.score),
            },
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to save written exam results", errorData);
          throw new Error(errorData?.error || "Could not save results");
        } else {
          if (resolvedExamId) {
            clearCachedQuestions(resolvedExamId);
          }
        }

        const resultData = await response.json();

        clearSession();

        setGradingProgress(100);
        setGradingMessage("Hoàn thành chấm điểm!");

        setTimeout(() => {
          setShowGradingPopup(false);
        }, 1500);

        toast({
          title: "Nộp bài thành công",
          description:
            latePenalty > 0
              ? `Bài kiểm tra đã được chấm điểm chi tiết. ${lateSubmissionNote} Điểm của bạn: ${finalScoreWithPenalty.toFixed(
                  1
                )}/10. Đang chuyển đến trang kết quả.`
              : `Bài kiểm tra đã được chấm điểm chi tiết. Điểm của bạn: ${finalScoreWithPenalty.toFixed(
                  1
                )}/10. Đang chuyển đến trang kết quả.`,
          variant: "default",
        });

        // Navigate to written exam result page after a delay
        setTimeout(() => {
          if (resultData.submissionId) {
            // Navigate to written exam result page specifically
            router.push(
              `/servers/${serverId}/exams/detail/${resolvedExamId}/written-result/${resultData.submissionId}`
            );
          } else {
            // Fallback to general results page
            const channelId = exam?.channel?.id;
            if (serverId && channelId) {
              router.push(
                `/servers/${serverId}/exams/detail/${resolvedExamId}/results?serverId=${serverId}&channelId=${channelId}`
              );
            } else {
              router.push(
                `/servers/${serverId}/exams/detail/${resolvedExamId}/results`
              );
            }
          }
        }, 2000);
      } catch (error) {
        console.error("Error submitting written exam:", error);
        setShowGradingPopup(false);
        toast({
          title: "Lỗi kết nối",
          description: "Không thể kết nối tới máy chủ để lưu kết quả.",
          variant: "destructive",
        });
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting written exam:", error);
      setShowGradingPopup(false);
      toast({
        title: "Lỗi",
        description: "Không thể nộp bài kiểm tra. Vui lòng thử lại.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  // Update progress calculation
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

  // Checking result state
  if (checkingResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Submitted result (adapted to show written exam results)
  if (submittedResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={() => router.push("/exams")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">
            {exam?.name || "Bài kiểm tra"}
          </h1>
          {examFileUrl && (
            <a
              href={examFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 flex items-center"
            >
              <FileText className="h-4 w-4 mr-1" />
              Xem tài liệu đính kèm
            </a>
          )}
        </div>

        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-bold mb-2">
              Kết quả bài kiểm tra tự luận
            </h2>
            <p className="text-muted-foreground mb-4">
              Điểm số của bạn:{" "}
              <span className="text-3xl font-extrabold text-primary">
                {submittedResult.score !== null
                  ? submittedResult.score.toFixed(1)
                  : "N/A"}
                /10
              </span>
            </p>

            <Button
              onClick={() => {
                const serverId = exam?.channel?.serverId;
                const channelId = exam?.channel?.id;
                if (serverId && channelId) {
                  router.push(`/servers/${serverId}/exams/${channelId}`);
                } else {
                  router.push("/exams");
                }
              }}
              className="w-full"
            >
              Quay lại danh sách bài kiểm tra
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Written exam interface
  return (
    <div className="flex flex-col h-full">
      {/* Grading Popup for Written Exam */}
      {showGradingPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Đang nộp bài tự luận</h3>
              <p className="text-muted-foreground mb-6">{gradingMessage}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tiến độ nộp bài</span>
                  <span>{Math.round(gradingProgress)}%</span>
                </div>
                <Progress value={gradingProgress} className="h-3" />
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Vui lòng không đóng trang. Quá trình nộp bài sẽ hoàn thành trong
                giây lát.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          onClick={handleNavigateBack}
          disabled={isProcessing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-lg font-semibold">
          {exam?.name || "Bài kiểm tra tự luận"}
        </h1>
        {examFileUrl && (
          <a
            href={examFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-blue-500 flex items-center ${
              isProcessing ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <FileText className="h-4 w-4 mr-1" />
            Xem tài liệu đính kèm
          </a>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 py-1 px-4 text-xs text-amber-700 dark:text-amber-300 border-b flex items-center justify-between">
        <Calendar className="h-3.5 w-3.5 mr-1" />
        <span>
          Hạn nộp:{" "}
          <ClientOnly fallback="">{formatDeadline(exam?.deadline)}</ClientOnly>
          {exam?.deadline && isDeadlinePassed(exam.deadline) && (
            <span className="text-red-500 font-medium ml-1">[Nộp muộn]</span>
          )}
        </span>
      </div>

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
              questions.length > 10 ? "max-h-[420px]" : ""
            } scrollbar-hide flex justify-center`}
          >
            <div className="grid grid-cols-4 gap-2 pt-2">
              {questions.map((_, index) => (
                <Button
                  key={index}
                  variant={
                    currentQuestionIndex === index ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 ${
                    currentQuestionIndex === index ? "ring-2 ring-primary" : ""
                  }`}
                  disabled={isProcessing}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
          {timeLeft !== null && totalTime !== null && (
            <div className="mt-auto bg-gray-100 dark:bg-gray-800 rounded-md border p-2">
              <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col md:flex-row h-full">
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
                        {questions[currentQuestionIndex] &&
                        writtenAnswers[
                          questions[currentQuestionIndex].id
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
                            questions[currentQuestionIndex].id,
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
                      </p>
                    </div>

                    <div className="md:hidden mt-6 border-t pt-4">
                      {timeLeft !== null && totalTime !== null && (
                        <CountdownTimer
                          timeLeft={timeLeft}
                          totalTime={totalTime}
                        />
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
                    className={`space-y-2 ${
                      questions.length > 40
                        ? "max-h-[420px] overflow-y-auto"
                        : ""
                    }`}
                  >
                    {questions.map((question, index) => (
                      <Button
                        key={index}
                        variant={
                          currentQuestionIndex === index ? "default" : "outline"
                        }
                        className={`w-full justify-start text-left h-auto p-3 ${
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
                        <div className="flex items-center justify-between w-full">
                          <span>Câu {index + 1}</span>
                          {writtenAnswers[question.id]?.trim() && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex justify-center">
                  <Button
                    onClick={handleSubmitExam}
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
                        Nộp bài kiểm tra
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
