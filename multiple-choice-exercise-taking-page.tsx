"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, Send, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendMessageToGemini } from "@/lib/gemini_google";

// Global variable for storing document content
const globalDocumentStore: {
  exerciseId?: string;
  documentContent?: string;
  documentData?: ArrayBuffer;
} = {};

// Interfaces
interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string;
  passage?: string;
  groupId?: string;
  type?: string;
}

interface ExerciseFile {
  name: string;
  url: string;
}

interface ExerciseChannel {
  id: string;
  name: string;
  serverId: string;
}

interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  files?: ExerciseFile[];
  model?: {
    id: string;
  };
  prompt?: string | null;
  deadline?: string | null;
  channel?: ExerciseChannel;
}

interface ExerciseResultDetail {
  question: Question;
  userAnswer: string | null;
  correctAnswer: string;
  status: string;
  explanation: string;
}

interface SubmittedResult {
  id: string;
  userId: string;
  exerciseId: string;
  score: number;
  answers: Array<{
    questionId: string;
    answer: string;
    type?: string;
  }>;
  submissionId?: string;
  details?: ExerciseResultDetail[];
}

// LocalStorage key for exercise session data
const EXERCISE_SESSION_KEY_PREFIX = "exercise_session_";

// Helper function to get the storage key for a specific exercise
const getExerciseStorageKey = (exerciseId: string) =>
  `${EXERCISE_SESSION_KEY_PREFIX}${exerciseId}`;

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
            userAnswers: answers,
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
    if (stage >= stages.length - 1) return;

    const timer = setTimeout(() => {
      setStage((prev) => prev + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [stage, stages.length]);

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

export const MultipleChoiceExerciseTakingPage = ({
  exercise,
  questions: initialQuestions,
  exerciseFileUrl,
  documentContent,
  timeLeft: initialTimeLeft,
  totalTime: initialTotalTime,
  clearSession,
  resolvedExerciseId,
  isLoadingBatches = false,
  batchProgress = { current: 0, total: 0 },
  questionProgress = { current: 0, total: 0 },
  processingStage = "Đang chuẩn bị bài làm"
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
  isLoadingBatches?: boolean;
  batchProgress?: { current: number, total: number };
  questionProgress?: { current: number, total: number };
  processingStage?: string;
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  const [isExerciseFinished, setIsExerciseFinished] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [questionsState] =
    useState<Question[]>(initialQuestions);
  const [isExtracting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(initialTimeLeft);
  const [totalTime, setTotalTime] = useState<number | null>(initialTotalTime);
  const [submittedResult, setSubmittedResult] =
    useState<SubmittedResult | null>(null);
  const [checkingResult, setCheckingResult] = useState(true);
  const [isNavigateDialogOpen, setIsNavigateDialogOpen] = useState(false);

  // Add state to track if we have checked for custom timer
  const [checkedCustomTimer, setCheckedCustomTimer] = useState(false);
  
  // Get URL search params for timer
  useEffect(() => {
    if (!resolvedExerciseId || checkedCustomTimer || checkingResult) return;
    
    try {
      // Check URL for timer parameter first
      const searchParams = new URLSearchParams(window.location.search);
      const timerParam = searchParams.get('timer');
      
      if (timerParam) {
        const minutes = parseInt(timerParam, 10);
        if (!isNaN(minutes) && minutes > 0) {
          console.log("[EXERCISE_TIMER] Found timer in URL:", minutes, "minutes");
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
          setCheckedCustomTimer(true);
          return;
        }
      }
      
      // If no URL param, check localStorage
      if (typeof window !== 'undefined') {
        const timersKey = "exercise_custom_timers";
        const savedTimers = JSON.parse(localStorage.getItem(timersKey) || "{}");
        
        if (savedTimers[resolvedExerciseId]) {
          const minutes = savedTimers[resolvedExerciseId];
          console.log("[EXERCISE_TIMER] Found timer in localStorage:", minutes, "minutes");
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
      
      setCheckedCustomTimer(true);
    } catch (error) {
      console.error("[EXERCISE_TIMER] Error checking custom timer:", error);
      setCheckedCustomTimer(true);
    }
  }, [resolvedExerciseId, checkingResult, checkedCustomTimer]);

  const questionsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { saveAnswers, saveTimerState, saveQuestionIndex, loadSession } =
    useExerciseSession(resolvedExerciseId);

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
    if (!resolvedExerciseId || !profileId) return;
    setCheckingResult(true);

    // Đảm bảo URL API đúng
    const checkUrl = `/api/exercise-result?exerciseId=${resolvedExerciseId}&userId=${profileId}`;

    fetch(checkUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {

        if (!data) {
          setSubmittedResult(null);
          setCheckingResult(false);
          return;
        }

        // Kiểm tra và parse data.score nếu cần
        if (typeof data.score !== "number") {
          try {
            if (typeof data.score === "string") {
              data.score = parseFloat(data.score);
            } else if (data.score && typeof data.score === "object") {
              data.score = parseFloat(data.score.toString());
            }
          } catch (e) {
            console.error("[CHECK] Error parsing score:", e);
            data.score = 0;
          }
        }

        if (
          data &&
          data.id &&
          data.userId === profileId &&
          data.exerciseId === resolvedExerciseId
        ) {
          setSubmittedResult(data);
        } else {
          setSubmittedResult(null);
        }
        setCheckingResult(false);
      })
      .catch((error) => {
        console.error("[CHECK] Error checking exercise results:", error);
        setSubmittedResult(null);
        setCheckingResult(false);
      });
  }, [resolvedExerciseId, profileId]);

  // Session restoration and timer setup
  useEffect(() => {
    if (
      !resolvedExerciseId ||
      checkingResult ||
      submittedResult ||
      !questionsState.length
    )
      return;

    try {
      const savedSession = loadSession();
      if (savedSession && Object.keys(savedSession).length > 0) {
        setIsRestoringSession(true);

        if (
          savedSession.userAnswers &&
          Object.keys(savedSession.userAnswers).length > 0
        ) {
          setUserAnswers(savedSession.userAnswers);
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
        } else if (exercise?.prompt) {
          const minutes = parseMinutesFromPrompt(exercise.prompt);
          if (minutes > 0) {
            setTimeLeft(minutes * 60);
            setTotalTime(minutes * 60);
          }
        }

        setIsRestoringSession(false);
      } else if (exercise?.prompt) {
        const minutes = parseMinutesFromPrompt(exercise.prompt);
        if (minutes > 0) {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    } catch (error) {
      console.error("Error restoring exercise session:", error);
      setIsRestoringSession(false);

      if (exercise?.prompt) {
        const minutes = parseMinutesFromPrompt(exercise.prompt);
        if (minutes > 0 && timeLeft === null) {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    }
  }, [
    resolvedExerciseId,
    checkingResult,
    submittedResult,
    questionsState.length,
    exercise,
    loadSession,
    timeLeft,
  ]);

  // Save answers when they change
  useEffect(() => {
    if (
      isRestoringSession ||
      isExerciseFinished ||
      !resolvedExerciseId ||
      !questionsState.length
    )
      return;
    saveAnswers(userAnswers);
  }, [
    userAnswers,
    isRestoringSession,
    isExerciseFinished,
    resolvedExerciseId,
    questionsState.length,
    saveAnswers,
  ]);

  // Save question index when it changes
  useEffect(() => {
    if (
      isRestoringSession ||
      isExerciseFinished ||
      !resolvedExerciseId ||
      !questionsState.length
    )
      return;
    saveQuestionIndex(currentQuestionIndex);
  }, [
    currentQuestionIndex,
    isRestoringSession,
    isExerciseFinished,
    resolvedExerciseId,
    questionsState.length,
    saveQuestionIndex,
  ]);

  // Save timer state periodically
  useEffect(() => {
    if (
      isRestoringSession ||
      isExerciseFinished ||
      timeLeft === null ||
      totalTime === null ||
      !resolvedExerciseId
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
    isExerciseFinished,
    resolvedExerciseId,
    saveTimerState,
  ]);

  // Timer countdown
  useEffect(() => {
    if (
      timeLeft === null ||
      isExerciseFinished ||
      isExtracting ||
      checkingResult ||
      isProcessing
    )
      return;

    if (timeLeft <= 0) {
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
  }, [
    timeLeft,
    isExerciseFinished,
    isExtracting,
    checkingResult,
    isProcessing,
  ]);

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
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
      if (questionsState.length === 0) {
        toast({
          title: "Không thể nộp bài",
          description: "Không có câu hỏi nào trong bài tập",
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsProcessing(false);
        return;
      }


      // Tạo tóm tắt giống exam trắc nghiệm
      const summary = questionsState
        .map((q) => {
          const selectedAnswer = userAnswers[q.id] || "Không trả lời";
          return `Câu hỏi: ${
            q.text
          }\nLựa chọn của học sinh: ${selectedAnswer}\nCác lựa chọn: ${q.options.join(
            ", "
          )}\n${q.passage ? `Đoạn văn: ${q.passage}\n` : ""}`;
        })
        .join("\n\n");

      const evaluationPrompt = `
        Đánh giá bài làm kiểm tra sau và cho điểm theo thang 10 điểm:
        
        ${summary}
        
        Hãy đánh giá điểm số người dùng ở TẤT CẢ các câu hỏi trong tài liệu, kể cả những câu người dùng chưa trả lời.
        Với mỗi câu, hãy cung cấp đáp án đúng bên dưới đáp án của người dùng và giải thích ngắn gọn, có tham khảo đoạn văn nếu có.
        
        Đánh giá CHÍNH XÁC mỗi câu trả lời:
        - Đúng: Khi đáp án của người dùng HOÀN TOÀN GIỐNG với đáp án đúng
        - Sai: Khi đáp án của người dùng KHÁC với đáp án đúng
        - Chưa trả lời: Khi người dùng không chọn đáp án nào
        
        Điểm số sẽ được tính dựa trên số câu trả lời đúng chia cho TỔNG SỐ câu hỏi trong tài liệu rồi nhân với thang điểm 10.
        
        Phản hồi của bạn cần bắt đầu với "ĐIỂM SỐ: [số điểm]/10" và sau đó là đánh giá chi tiết cho từng câu hỏi.
        Mỗi câu đánh giá theo format:
        "Câu [số thứ tự]: [Đúng/Sai/Chưa trả lời] - [Đáp án đúng: (chỉ ra đáp án đúng đầy đủ)] - [Giải thích]"
      `;

      // Safely create fileData object if documentContent exists
      let documentForEvaluation = undefined;
      if (documentContent && documentContent.data) {
        documentForEvaluation = {
          mimeType: documentContent.mimeType,
          data: documentContent.data
        };
      }
      
      const modelId = exercise?.model?.id || "gemini-2.0-flash";

      try {
        // Get evaluation result
        const evaluationResult = await sendMessageToGemini(
          evaluationPrompt,
          modelId,
          documentForEvaluation,
          documentContent?.name || undefined,
          exercise?.prompt || undefined
        );

        // Extract score from evaluation result
        const scoreMatch = evaluationResult.match(
          /ĐIỂM SỐ:\s*(\d+([.,]\d+)?)\/10/
        );

        let extractedScore = 0;
        if (scoreMatch && scoreMatch[1]) {
          extractedScore = parseFloat(scoreMatch[1].replace(",", "."));
        }

        // Process results for each question
        const results = [];
        for (let index = 0; index < questionsState.length; index++) {
          const question = questionsState[index];
          const questionNumber = index + 1;

          const resultRegex = new RegExp(
            `Câu\\s*${questionNumber}:\\s*(Đúng|Sai|Chưa trả lời)\\s*-\\s*Đáp án đúng:\\s*(.+?)\\s*-\\s*(.+?)(?=Câu\\s*\\d+:|$)`,
            "s"
          );

          const matchResult = evaluationResult.match(resultRegex);

          let status = "unanswered";
          let isCorrect = false;
          let explanation = "Không có đánh giá chi tiết";
          let correctAnswer = "";

          if (matchResult) {
            correctAnswer = matchResult[2]?.trim() || "";
            explanation = matchResult[3]?.trim() || "Không có giải thích";

            const userAnswer = userAnswers[question.id] || null;

            if (!userAnswer) {
              status = "unanswered";
              isCorrect = false;            } else {
              // Cải thiện logic so sánh đáp án
              const normalizeAnswer = (answer: string): string => {
                return answer.trim().toLowerCase().replace(/\s+/g, " ");
              };
                // Extract letter option (A, B, C, D) if that's the format
              const extractOption = (answer: string): string | null => {
                const optionMatch = answer.match(/^([A-Za-z])[\.:\)\s]?/);
                return optionMatch ? optionMatch[1].toUpperCase() : null;
              };
              
              // Get just the content without prefix
              const getContentOnly = (answer: string): string => {
                return answer.replace(/^[A-Za-z][\.\:\)\s]+/i, "").trim().toLowerCase();
              };

              const userAnswerNormalized = normalizeAnswer(userAnswer);
              const correctAnswerNormalized = normalizeAnswer(correctAnswer);
              
              // Get option letter (A,B,C,D) if available
              const userOption = extractOption(userAnswer);
              const correctOption = extractOption(correctAnswer);
                // Get content without option prefix
              const userContent = getContentOnly(userAnswer);
              const correctContent = getContentOnly(correctAnswer);
              
              
              // Logic for comparing answers - multiple ways to match
              if (
                // Direct full match after normalization
                userAnswerNormalized === correctAnswerNormalized ||
                // Option letter match (e.g., both are "C")
                (userOption && correctOption && userOption === correctOption) ||
                // Content match without option prefix
                (userContent && correctContent && userContent === correctContent) ||
                // User answer is fully contained in correct answer or vice versa
                userAnswerNormalized.includes(correctAnswerNormalized) ||
                correctAnswerNormalized.includes(userAnswerNormalized)
              ) {
                status = "correct";
                isCorrect = true;
              } else {
                status = "incorrect";
                isCorrect = false;
              }
            }

            if (!explanation.includes(correctAnswer)) {
              explanation = `Đáp án đúng: ${correctAnswer}. ${explanation}`;
            }
          } else {
            const userAnswer = userAnswers[question.id] || null;
            if (!userAnswer) {
              status = "unanswered";
            } else {
              status = "incorrect";
            }
            isCorrect = false;
          }

          // Create result for this question with full question object
          results.push({
            question: {
              id: question.id,
              text: question.text,
              options: question.options,
              passage: question.passage,
              groupId: question.groupId,
            },
            userAnswer: userAnswers[question.id] || null,
            isCorrect,
            explanation,
            status,
          });
        }

        const correctCount = results.filter(
          (r) => r.status === "correct"
        ).length;   
        const calculatedScore =
          (correctCount / questionsState.length) * 10;
        // Use extracted score from AI if available, otherwise use calculated score
        const finalScore = extractedScore > 0 ? extractedScore : calculatedScore;

        const serverId = exercise?.channel?.serverId;

        // Prepare submission data with proper structure
        const submissionData = {
          answers: userAnswers,
          score: finalScore,
          exerciseType: "multiple-choice",
          details: results.map((r) => ({
            question: r.question,
            userAnswer: r.userAnswer,
            correctAnswer:
              r.explanation?.match(/Đáp án đúng: (.+?)\./)?.[1] || "",
            status: r.status,
            explanation: r.explanation,
          })),
        };

        if (!resolvedExerciseId) {
          throw new Error("Missing exercise ID");
        }


        // Submit to API
        const response = await fetch(
          `/api/exercises/${resolvedExerciseId}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(submissionData),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || "Unknown error" };
          }

          throw new Error(
            errorData?.error ||
              `Server responded with status ${response.status}`
          );
        }

        const resultData = await response.json();

        if (globalDocumentStore.exerciseId === resolvedExerciseId) {
          globalDocumentStore.documentContent = undefined;
          globalDocumentStore.documentData = undefined;
        }

        clearSession();

        toast({
          title: "Nộp bài thành công",
          description:
            "Bài làm của bạn đã được ghi nhận. Đang chuyển đến trang kết quả.",
          variant: "default",
        });

        if (resultData.submissionId) {
          router.push(
            `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/result/${resultData.submissionId}`
          );
        } else {
          const channelId = exercise?.channel?.id;
          const serverId = exercise?.channel?.serverId;
          if (serverId && channelId) {
            router.push(
              `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/results?serverId=${serverId}&channelId=${channelId}`
            );
          } else {
            router.push(
              `/servers/${serverId}/exercises/detail/${resolvedExerciseId}/results`
            );
          }
        }
      } catch (apiError) {
        console.error("Error in API submission:", apiError);
        toast({
          title: "Lỗi kết nối",
          description: `Không thể kết nối tới máy chủ để lưu kết quả: ${
            apiError instanceof Error ? apiError.message : "Unknown error"
          }`,
          variant: "destructive",
        });
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting exercise:", error);
      toast({
        title: "Lỗi",
        description: "Không thể nộp bài. Vui lòng thử lại sau.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  // Handle navigation back with confirmation
  const handleNavigateBack = () => {
    // If there are answered questions and not finished, show confirmation dialog
    if (!isExerciseFinished && Object.keys(userAnswers).length > 0) {
      setIsNavigateDialogOpen(true);
    } else {
      proceedWithNavigation();
    }
  };

  // Proceed with navigation after confirmation
  const proceedWithNavigation = () => {
    setIsNavigateDialogOpen(false);
    
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

  // Format deadline display
  const formatDeadline = (deadline: string | null | undefined): { text: string, isOverdue: boolean } | null => {
    if (!deadline) return null;
    
    try {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      const isOverdue = now > deadlineDate;
      
      const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      } as Intl.DateTimeFormatOptions;
      
      const formattedDate = new Date(deadline).toLocaleString('vi-VN', options);
      
      return {
        text: formattedDate,
        isOverdue
      };
    } catch (e) {
      console.error("Error formatting deadline:", e);
      return null;
    }
  };

  // Calculate progress
  const answeredCount = Object.keys(userAnswers).length;
  const completionPercentage =
    questionsState.length > 0
      ? Math.round((answeredCount / questionsState.length) * 100)
      : 0; // Determine if current question has a passage
  const currentQuestion = questionsState[currentQuestionIndex];
  const hasPassage = currentQuestion?.passage && currentQuestion?.groupId;

  if (checkingResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (submittedResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">
            {exercise?.name || "Bài tập"}
          </h1>
          {exerciseFileUrl && (
            <a
              href={exerciseFileUrl}
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
            <h2 className="text-xl font-bold mb-2">Kết quả bài tập</h2>
            <p className="text-muted-foreground mb-4">
              Điểm số của bạn:{" "}
              <span className="text-3xl font-extrabold">
                {submittedResult.score !== null
                  ? submittedResult.score.toFixed(1)
                  : "N/A"}
              </span>
            </p>
            <Button onClick={handleNavigateBack}>
              Quay lại danh sách bài tập
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render a batch loading overlay when questions are being loaded in batches
  if (isLoadingBatches) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-4">{processingStage}</h3>
          
          <div className="space-y-4">
            {/* Batch Progress */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Đợt câu hỏi</span>
                <span className="text-sm font-medium">{batchProgress.current}/{batchProgress.total}</span>
              </div>
              <Progress
                value={(batchProgress.current * 100) / batchProgress.total}
                className="mb-2 h-2"
              />
              <p className="text-xs text-muted-foreground">
                {Math.round((batchProgress.current * 100) / batchProgress.total)}% đợt hoàn thành
              </p>
            </div>
            
            {/* Question Progress */}
            {questionProgress.total > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Câu hỏi</span>
                  <span className="text-sm font-medium">{questionProgress.current}/{questionProgress.total}</span>
                </div>
                <Progress
                  value={(questionProgress.current * 100) / questionProgress.total}
                  className="mb-2 h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round((questionProgress.current * 100) / questionProgress.total)}% câu hỏi hoàn thành
                </p>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            Quá trình tạo câu hỏi có thể mất vài phút. Vui lòng không đóng trang hoặc tải lại trang.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isProcessing && <ProcessingOverlay />}

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
          <a
            href={exerciseFileUrl}
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

      {/* Add deadline display */}
      {exercise?.deadline && (
        <div className="px-4 py-2 border-b bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className={`text-sm font-medium ${formatDeadline(exercise.deadline)?.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {formatDeadline(exercise.deadline)?.isOverdue ? 'Hạn nộp: ' : 'Hạn nộp: '}
              {formatDeadline(exercise.deadline)?.text}
              {formatDeadline(exercise.deadline)?.isOverdue ? '[Nộp muộn] ' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-b">
        <div className="flex justify-between items-center mb-1 text-sm">
          <span>
            Tiến độ: {answeredCount}/{questionsState.length} câu
          </span>
          <span>{completionPercentage}%</span>
        </div>
        <Progress value={completionPercentage} max={100} className="h-2" />
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full">
        {/* Question navigator sidebar - Update to hide scrollbar */}
        <div className="hidden md:block w-64 border-r p-4 flex flex-col h-full">
          <h3 className="font-medium mb-3">Câu hỏi</h3>
          
          {/* Scrollable question navigator with hidden scrollbar */}
          <div className={`overflow-y-auto mb-4 ${questionsState.length > 40 ? 'max-h-[420px]' : ''} scrollbar-hide`}>
            <div className="grid grid-cols-4 gap-2 pt-2">
              {questionsState.map((_, index) => (
                <Button
                  key={index}
                  variant={
                    userAnswers[questionsState[index].id]
                      ? "default"
                      : "outline"
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
                        Câu hỏi {currentQuestionIndex + 1}/
                        {questionsState.length}
                      </CardTitle>
                      <Badge variant="outline">
                        {userAnswers[questionsState[currentQuestionIndex]?.id]
                          ? "Đã trả lời"
                          : "Chưa trả lời"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg mb-6">
                      {questionsState[currentQuestionIndex]?.text}
                    </p>

                    {/* Multiple Choice Options */}
                    {questionsState[currentQuestionIndex]?.options && (
                      <div className="space-y-3">
                        {questionsState[currentQuestionIndex]?.options.map(
                          (option, index) => (
                            <div
                              key={index}
                              className={`flex items-center space-x-2 border p-3 rounded-md ${
                                isProcessing
                                  ? "opacity-70 cursor-not-allowed"
                                  : "hover:bg-muted cursor-pointer"
                              }`}
                              onClick={() =>
                                !isProcessing &&
                                handleAnswerSelect(
                                  questionsState[currentQuestionIndex].id,
                                  option
                                )
                              }
                            >
                              <input
                                type="radio"
                                id={`option-${index}`}
                                checked={
                                  userAnswers[
                                    questionsState[currentQuestionIndex].id
                                  ] === option
                                }
                                onChange={() =>
                                  !isProcessing &&
                                  handleAnswerSelect(
                                    questionsState[currentQuestionIndex].id,
                                    option
                                  )
                                }
                                className="w-4 h-4"
                                disabled={isProcessing}
                              />
                              <Label
                                htmlFor={`option-${index}`}
                                className={`flex-1 ${
                                  isProcessing
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                {option}
                              </Label>
                            </div>
                          )
                        )}
                      </div>
                    )}

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
                      onClick={() =>
                        setCurrentQuestionIndex(
                          Math.max(0, currentQuestionIndex - 1)
                        )
                      }
                      disabled={currentQuestionIndex === 0 || isProcessing}
                    >
                      Câu trước
                    </Button>

                    <Button
                      onClick={() =>
                        setCurrentQuestionIndex(
                          Math.min(
                            questionsState.length - 1,
                            currentQuestionIndex + 1
                          )
                        )
                      }
                      disabled={
                        currentQuestionIndex === questionsState.length - 1 ||
                        isProcessing
                      }
                    >
                      Câu tiếp
                    </Button>
                  </CardFooter>
                </Card>

                {/* Mobile question navigator - Update to hide scrollbar */}
                <div className="md:hidden mb-6">
                  <h3 className="font-medium mb-3">Câu hỏi</h3>
                  <div className={`overflow-y-auto ${questionsState.length > 40 ? 'max-h-[240px]' : ''} scrollbar-hide`}>
                    <div className="grid grid-cols-5 gap-2">
                      {questionsState.map((_, index) => (
                        <Button
                          key={index}
                          variant={
                            userAnswers[questionsState[index].id]
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`w-10 h-10 ${
                            currentQuestionIndex === index
                              ? "ring-2 ring-primary"
                              : ""
                          }`}
                          disabled={isProcessing}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

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
          </div>{" "}
          {/* Passage area (right) */}
          {hasPassage && (
            <div className="md:w-1/2 border-l p-4 bg-gray-50 dark:bg-gray-800">
              <div className="h-full overflow-y-auto scrollbar-hide">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle>Đoạn văn tham khảo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {(() => {
                        const lastPassage =
                          questionsState.filter((q) => q.passage).slice(-1)[0]
                            ?.passage || "";
                        return lastPassage;
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <Dialog open={isNavigateDialogOpen} onOpenChange={setIsNavigateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thoát khỏi bài làm?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn thoát khỏi bài làm? Tiến độ làm bài sẽ được lưu lại để bạn có thể quay lại sau.
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
