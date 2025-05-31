"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, Calendar, Send } from "lucide-react";
import {
  processFileWithGemini,
  FileData,
  sendMessageToGemini,
} from "@/lib/gemini_google";
import { usePathname } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { EssayTakingPage } from "./essay-taking-page";
import ClientOnly from "@/components/ClientOnly";
import { formatDeadline, isDeadlinePassed } from "@/lib/exam-timer";
import { Textarea } from "@/components/ui/textarea";

// Interfaces
interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string;
  passage?: string; // New field for passage content
  groupId?: string; // New field to group questions with the same passage
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
  description?: string | null | undefined; // Updated to match the page component
  files?: ExamFile[];
  model?: {
    id: string;
  };
  prompt?: string | null;
  deadline?: string | null;
  channel?: ExamChannel;
  allowReferences?: boolean;
  questionCount?: number;
  shuffleQuestions?: boolean; // Add shuffle questions field
}

interface QuestionResult {
  question: Question;
  userAnswer: string | null;
  isCorrect: boolean;
  explanation?: string;
  status: "correct" | "incorrect" | "unanswered";
}

interface ExamResultDetail {
  question: Question;
  userAnswer: string | null;
  correctAnswer: string;
  status: string;
  explanation: string;
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

// Global variable for storing document content
const globalDocumentStore: {
  examId?: string;
  documentContent?: string;
  documentName?: string;
  documentType?: string;
  documentData?: ArrayBuffer;
} = {};

// Add a LocalStorage key for exam session data
const EXAM_SESSION_KEY_PREFIX = "exam_session_";

// Helper function to get the storage key for a specific exam
const getExamStorageKey = (examId: string) =>
  `${EXAM_SESSION_KEY_PREFIX}${examId}`;

// Thêm hàm chuyển đổi prompt sang số phút
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

// Thêm hàm lấy className cho đồng hồ đếm ngược
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

// Shuffle questions logic - only shuffle questions without passages/groupId
function shuffleQuestionsLogic(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return questions;

  // Separate questions into grouped (with passages) and individual questions
  const groupedQuestions: Question[] = [];
  const individualQuestions: Question[] = [];

  questions.forEach((question) => {
    if (question.passage && question.groupId) {
      // This question has a passage and belongs to a group - don't shuffle
      groupedQuestions.push(question);
    } else {
      // This is an individual question - can be shuffled
      individualQuestions.push(question);
    }
  });

  // Shuffle individual questions using Fisher-Yates algorithm
  const shuffledIndividual = [...individualQuestions];
  for (let i = shuffledIndividual.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndividual[i], shuffledIndividual[j]] = [
      shuffledIndividual[j],
      shuffledIndividual[i],
    ];
  }

  // Combine back: keep grouped questions in their original positions
  // and intersperse shuffled individual questions
  const result: Question[] = [];
  let groupedIndex = 0;
  let individualIndex = 0;

  questions.forEach((originalQuestion) => {
    if (originalQuestion.passage && originalQuestion.groupId) {
      // Keep grouped question in its position
      result.push(groupedQuestions[groupedIndex]);
      groupedIndex++;
    } else {
      // Replace with shuffled individual question
      if (individualIndex < shuffledIndividual.length) {
        result.push(shuffledIndividual[individualIndex]);
        individualIndex++;
      }
    }
  });

  return result;
}

function cleanQuestionsData(questions: Question[]): Question[] {
  // Tạo bản đồ để lưu trữ các đoạn văn theo groupId
  const passageMap: { [groupId: string]: string } = {};

  // Lần đầu tiên, thu thập đoạn văn cho mỗi groupId
  questions.forEach((q) => {
    if (q.groupId && q.passage) {
      passageMap[q.groupId] = passageMap[q.groupId] || q.passage.trim();
    }
  });

  return questions.map((q) => {
    let cleanText = q.text || "";
    let cleanPassage = q.groupId ? passageMap[q.groupId] : q.passage || null;

    // Loại bỏ đoạn văn bị trùng lặp trong text
    if (cleanText && cleanPassage && cleanText.includes(cleanPassage)) {
      cleanText = cleanText.replace(cleanPassage, "").trim();
    }

    // Loại bỏ các cụm từ không cần thiết
    cleanText = cleanText
      .replace(/^(Theo đoạn văn (trên|sau|dưới đây),?\s*)/i, "")
      .replace(/^(Dựa vào đoạn văn,?\s*)/i, "")
      .trim();

    // Làm sạch passage, nhưng không xóa nếu nó thuộc về groupId
    if (cleanPassage) {
      cleanPassage = cleanPassage
        .replace(/\(\s*đoạn văn giống hệt đoạn văn của q\d+\s*\)/gi, "")
        .trim();
    }

    return {
      id: q.id,
      text: cleanText,
      options: Array.isArray(q.options) ? q.options : [],
      passage:
        cleanPassage && cleanPassage.length > 0 ? cleanPassage : undefined,
      groupId: q.groupId || undefined,
      correctAnswer: q.correctAnswer,
    };
  });
}
// Custom hook to manage exam session data
const useExamSession = (examId?: string) => {
  // Store and retrieve user answers
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
            userAnswers: answers,
            lastUpdated: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.error("Error saving answers to localStorage:", e);
      }
    },
    [examId]
  );

  // Save timer state
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

  // Save current question index
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

  // Load session data
  const loadSession = useCallback(() => {
    if (!examId) return null;
    try {
      const sessionData = JSON.parse(
        localStorage.getItem(getExamStorageKey(examId)) || "{}"
      );

      // Calculate remaining time if expiresAt exists
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

  // Clear session data
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

// Update the CountdownTimer component to use a horizontal layout
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

// thêm vào union type
type ExamType = "multiple-choice" | "essay" | "written";

export const ExamTakingPage = ({ exam }: { exam?: Exam }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Basic state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [examData, setExamData] = useState<Exam | null>(null);
  const [examFileUrl, setExamFileUrl] = useState<string | null>(null);
  const [resolvedExamId, setResolvedExamId] = useState<string | undefined>();

  // Document content state
  const [documentContent, setDocumentContent] = useState<{
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null>(null);

  // Questions and answers state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  // State for submitted result
  const [submittedResult, setSubmittedResult] =
    useState<SubmittedResult | null>(null);
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Thời gian làm bài (giây)
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Thời gian tổng cộng (giây)
  const [totalTime, setTotalTime] = useState<number | null>(null);

  // Refs
  const questionsEndRef = useRef<HTMLDivElement>(null);
  const [checkingResult, setCheckingResult] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Session persist handlers
  const {
    saveAnswers,
    saveTimerState,
    saveQuestionIndex,
    loadSession,
    clearSession,
  } = useExamSession(resolvedExamId);

  // Track if this is a restore from saved session
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Add a state for exam type
  const [examType, setExamType] = useState<ExamType | null>(null);

  // Removed unused isClient state

  // Thêm state cho written exam
  const [writtenAnswers, setWrittenAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  const [showGradingPopup, setShowGradingPopup] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingMessage, setGradingMessage] = useState("");

  // Grading stages for written exam
  const gradingStages = [
    "Đang thu thập bài làm của bạn...",
    "Đang phân tích từng câu hỏi...",
    "Đang xác định tiêu chí chấm điểm...",
    "Đang đánh giá độ chính xác câu trả lời...",
    "Đang tính toán điểm số theo tỷ lệ...",
    "Đang tạo nhận xét chi tiết...",
    "Đang hoàn thiện kết quả...",
  ];

  // Đánh dấu khi component đã render ở client
  // Removed unused client-side rendering effect
  // Get userId from API
  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfileId(data?.id || null))
      .catch(() => setProfileId(null));
  }, []);

  // Extract exam ID from URL path
  useEffect(() => {
    const segments = pathname?.split("/");
    const idFromPath = segments ? segments[segments.length - 1] : undefined;
    setResolvedExamId(idFromPath);
  }, [pathname]);

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

  // Merge the session restoration and timer setup useEffects
  useEffect(() => {
    if (!resolvedExamId || isLoading || submittedResult || !questions.length)
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
        } else if (examData?.prompt) {
          const minutes = parseMinutesFromPrompt(examData.prompt);
          if (minutes > 0) {
            setTimeLeft(minutes * 60);
            setTotalTime(minutes * 60);
          }
        }

        setIsRestoringSession(false);
      } else if (examData?.prompt) {
        const minutes = parseMinutesFromPrompt(examData.prompt);
        if (minutes > 0) {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    } catch (error) {
      console.error("Error restoring exam session:", error);
      setIsRestoringSession(false);

      if (examData?.prompt) {
        const minutes = parseMinutesFromPrompt(examData.prompt);
        if (minutes > 0 && timeLeft === null) {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    }
  }, [
    resolvedExamId,
    isLoading,
    submittedResult,
    questions.length,
    examData,
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
    saveAnswers(userAnswers);
  }, [
    userAnswers,
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

  // Add beforeunload event listener to warn user when leaving page
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

  // Load exam data
  useEffect(() => {
    const loadExamData = async () => {
      try {
        setIsLoading(true);

        if (!resolvedExamId) {
          return;
        }

        if (
          globalDocumentStore.examId === resolvedExamId &&
          globalDocumentStore.documentData
        ) {
          console.log("Using cached document data for exam:", resolvedExamId);

          if (globalDocumentStore.documentData) {
            setDocumentContent({
              data: globalDocumentStore.documentData,
              mimeType: globalDocumentStore.documentType || "application/pdf",
              name: globalDocumentStore.documentName || "document.pdf",
            });
          }
        }

        const response = await fetch(`/api/exams/${resolvedExamId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch exam data: ${response.statusText}`);
        }

        const data = await response.json();
        setExamData(data);
        processExamFiles(data);
      } catch (error: unknown) {
        console.error("Error loading exam:", error);
        toast({
          title: "Error",
          description: `Failed to load exam: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedExamId) {
      loadExamData();
    } else if (exam?.id) {
      setResolvedExamId(exam.id);
    }
  }, [resolvedExamId, exam]);

  // Set up timer based on exam data
  useEffect(() => {
    if (examData?.prompt && timeLeft === null) {
      const minutes = parseMinutesFromPrompt(examData.prompt);
      if (minutes > 0) {
        const savedSession = loadSession();
        if (savedSession?.timeLeft) {
          setTimeLeft(savedSession.timeLeft);
          setTotalTime(savedSession.totalTime || minutes * 60);
        } else {
          setTimeLeft(minutes * 60);
          setTotalTime(minutes * 60);
        }
      }
    }
  }, [examData, timeLeft, loadSession]);

  // Timer countdown
  useEffect(() => {
    if (
      timeLeft === null ||
      isExamFinished ||
      isExtracting ||
      isLoading ||
      isProcessing
    )
      return;

    if (timeLeft <= 0) {
      handleSubmitExam();
      return;
    }

    timerRef.current = setTimeout(
      () => setTimeLeft((prev) => (prev !== null ? prev - 1 : null)),
      1000
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isExamFinished, isExtracting, isLoading, isProcessing]);

  // Process exam files
  const processExamFiles = (examData: Exam) => {
    if (!examData.files || examData.files.length === 0) {
      return;
    }

    const firstFile = examData.files[0];

    let fileUrl = firstFile.url;
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const fileName = fileUrl.split("/").pop();
      fileUrl = fileName ? `/uploads/files/${fileName}` : fileUrl;
    } else if (!fileUrl.startsWith("/uploads/")) {
      fileUrl = "/uploads/files/" + fileUrl.replace(/^\/+/, "");
    }
    const viewableUrl = `/api/files/view?path=${encodeURIComponent(fileUrl)}`;
    setExamFileUrl(viewableUrl);

    if (
      globalDocumentStore.examId === examData.id &&
      globalDocumentStore.documentData
    ) {
      console.log("Using cached document for exam initialization");
      extractQuestionsFromDocument(examData, firstFile, true);
    } else {
      extractQuestionsFromDocument(examData, firstFile);
    }
  };

  // Extract questions from document
  const extractQuestionsFromDocument = async (
    examData: Exam,
    preAttachedFile?: ExamFile,
    useCachedDocument = false
  ) => {
    try {
      setIsExtracting(true);
      setExtractionProgress(10);

      if (!preAttachedFile) {
        toast({
          title: "Error",
          description: "No document attached to this exam",
          variant: "destructive",
        });
        setIsExtracting(false);
        return;
      }

      let fileUrl = preAttachedFile.url;
      if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        const fileName = fileUrl.split("/").pop();
        fileUrl = fileName ? `/uploads/files/${fileName}` : fileUrl;
      } else if (!fileUrl.startsWith("/uploads/")) {
        fileUrl = "/uploads/files/" + fileUrl.replace(/^\/+/, "");
      }
      const fileViewUrl = `/api/files/view?path=${encodeURIComponent(fileUrl)}`;

      let fileData: FileData;

      if (
        useCachedDocument &&
        globalDocumentStore.examId === examData.id &&
        globalDocumentStore.documentData
      ) {
        console.log("Using cached document data");
        setExtractionProgress(30);

        fileData = {
          mimeType: globalDocumentStore.documentType || "application/pdf",
          data: globalDocumentStore.documentData,
          fileName: preAttachedFile.name,
        };

        setDocumentContent({
          data: globalDocumentStore.documentData,
          mimeType: globalDocumentStore.documentType || "application/pdf",
          name: preAttachedFile.name,
        });
      } else {
        setExtractionProgress(20);
        const response = await fetch(fileViewUrl);
        if (!response.ok) {
          throw new Error(`Không thể tải nội dung tệp: ${response.statusText}`);
        }

        setExtractionProgress(40);
        const fileBlob = await response.blob();
        const fileArrayBuffer = await fileBlob.arrayBuffer();

        fileData = {
          mimeType: fileBlob.type || "application/octet-stream",
          data: fileArrayBuffer,
          fileName: preAttachedFile.name,
        };

        setDocumentContent({
          data: fileArrayBuffer,
          mimeType: fileBlob.type || "application/octet-stream",
          name: preAttachedFile.name,
        });

        globalDocumentStore.examId = examData.id;
        globalDocumentStore.documentContent = "loaded";
        globalDocumentStore.documentName = preAttachedFile.name;
        globalDocumentStore.documentType =
          fileBlob.type || "application/octet-stream";
        globalDocumentStore.documentData = fileArrayBuffer;
      }
      setExtractionProgress(50); // Check if this exam allows references (allowReferences = true)
      const allowReferences = examData.allowReferences === true;
      const questionCount = examData.questionCount || 10;

      const extractionPrompt = allowReferences
        ? `
      CHẾ ĐỘ TẠO ĐỀ THI MỚI DỰA TRÊN TÀI LIỆU THAM KHẢO

      BƯỚC 1: PHÂN LOẠI LOẠI ĐỀ THI
      Phân tích tài liệu gốc để xác định loại đề thi dựa trên các tiêu chí sau (ưu tiên theo thứ tự):

      1. ĐỀ TỰ LUẬN THỰC HÀNH (Essay):
        - Dấu hiệu:
          * Từ khóa lập trình: "xây dựng hệ thống", "viết chương trình", "tạo ứng dụng", "lập trình".
          * Từ khóa thiết kế: "thiết kế cơ sở dữ liệu", "xây dựng website", "phát triển".
          * Từ khóa phân tích: "phân tích chi tiết", "trình bày đầy đủ", "giải thích sâu".
          * Yêu cầu phức tạp: "bao gồm", "cho phép", "xử lý quá trình", "chức năng".
          * Dạng: "Xây dựng hệ thống...", "Phân tích và thiết kế...", "Viết bài luận...".
          * Đáp án mong đợi: file code, tài liệu, hình ảnh, dự án hoàn chỉnh.
          * KHÔNG THỂ trả lời trực tiếp bằng văn bản, cần nộp file đính kèm.
        - Nếu tài liệu chứa các dấu hiệu trên, xác định là TỰ LUẬN THỰC HÀNH.

      2. ĐỀ VIẾT TRỰC TIẾP (Written):
        - Dấu hiệu:
          * Có danh sách câu hỏi yêu cầu trả lời ngắn (1-3 từ, 1 câu, định nghĩa, công thức).
          * Không có lựa chọn đáp án A, B, C, D.
          * Có dấu gạch dưới: "___", chỗ trống: "(...)", hoặc ô vuông để điền.
          * Từ khóa: "Điền", "Viết công thức", "Nêu định nghĩa", "Cho biết tên", "Tính giá trị", "định nghĩa ngắn gọn", "công thức", "kết quả số", "tên thuật ngữ".
          * Dạng: "Định nghĩa enzyme là gì?", "Công thức tính diện tích = ?".
          * Đáp án mong đợi: từ đơn, cụm từ ngắn, số, công thức đơn giản.
          * CÓ THỂ trả lời trực tiếp bằng văn bản trong ô input.
        - Nếu tài liệu chứa các dấu hiệu trên và KHÔNG có dấu hiệu tự luận, xác định là VIẾT TRỰC TIẾP.

      3. ĐỀ TRẮC NGHIỆM:
        - Dấu hiệu:
          * Có danh sách câu hỏi với nhiều lựa chọn đáp án rõ ràng (A, B, C, D hoặc 1, 2, 3, 4).
          * Mỗi câu hỏi có từ 2-5 lựa chọn, đáp án ngắn gọn, cụ thể.
          * Có thể có đoạn văn liên quan (passage) hoặc không.
          * Thường có cụm từ: "Chọn đáp án đúng", "Khoanh tròn", "Chọn phương án".
        - Nếu tài liệu chứa các dấu hiệu trên và KHÔNG có dấu hiệu tự luận hoặc viết trực tiếp, xác định là TRẮC NGHIỆM.

      4. TRƯỜNG HỢP KHÔNG XÁC ĐỊNH:
        - Nếu không khớp với bất kỳ loại đề nào, trả về lỗi: "Không thể xác định loại đề thi từ tài liệu gốc."

      BƯỚC 2: TẠO ĐỀ THI MỚI CÙNG LOẠI
      Dựa trên loại đề thi được xác định, tạo đề thi mới cùng loại với nội dung khác nhưng cùng chủ đề và độ khó:

      A. NẾU LÀ ĐỀ TRẮC NGHIỆM:
      BƯỚC 1: PHÂN TÍCH CẤU TRÚC TÀI LIỆU
        - Đọc hiểu toàn bộ nội dung tài liệu.
        - Xác định xem tài liệu sử dụng ngôn ngữ nào (tiếng Việt, tiếng Anh, v.v.).
        - Xác định xem tài liệu thuộc chủ đề vi mô nào (vd: chiến tranh Tống - Việt, hiệu ứng quang điện,...) hay vĩ mô nào (vd: chiến tranh thế giới thứ 2, cơ học lượng tử,...).
        - Xác định xem tài liệu có chứa ĐOẠN VĂN kèm câu hỏi hay không (đoạn văn không phải câu hỏi).
        - Nếu có đoạn văn: lưu ý số lượng đoạn văn, độ dài mỗi đoạn văn (số từ hoặc số câu), và cách liên kết với câu hỏi.
        - **Xác định xem tài liệu có chỉ chứa câu hỏi liên quan đến đoạn văn (tất cả câu hỏi đều có passage và groupId) hay không.**

      BƯỚC 2: QUY TẮC TẠO ĐOẠN VĂN VÀ CÂU HỎI

      **TRƯỜNG HỢP 1: Tài liệu gốc CHỈ chứa câu hỏi liên quan đến đoạn văn (tất cả câu hỏi có passage và groupId)**
        - BẮT BUỘC tạo số lượng đoạn văn mới bằng số lượng đoạn văn trong tài liệu gốc.
        - Mỗi đoạn văn mới phải:
          * Cùng ngôn ngữ với tài liệu gốc.
          * Có độ dài tương đương hoặc dài hơn đoạn văn gốc (dựa trên số từ hoặc số câu).
          * Cùng chủ đề nhưng khác hoàn toàn về nội dung cụ thể.
          * Được gán một groupId duy nhất cho các câu hỏi liên quan.
        - TẤT CẢ ${questionCount} câu hỏi phải liên quan đến các đoạn văn mới, không tạo câu hỏi đơn lẻ (passage: null).
        - Mỗi câu hỏi phải tham chiếu trực tiếp đến đoạn văn ("Theo đoạn văn trên...").
        - Phân bổ số câu hỏi cho mỗi đoạn văn tương tự như tài liệu gốc (nếu gốc có 2 đoạn văn với 3 và 2 câu hỏi, thì đề mới cũng phải có 2 đoạn văn với 3 và 2 câu hỏi, hoặc tương tự).

      **TRƯỜNG HỢP 2: Tài liệu gốc CÓ đoạn văn kèm câu hỏi nhưng CŨNG có câu hỏi không liên quan đến đoạn văn**
        - Tạo đoạn văn mới cho các câu hỏi liên quan đến đoạn văn:
          * Cùng ngôn ngữ với tài liệu gốc.
          * Có độ dài tương đương hoặc dài hơn đoạn văn gốc.
          * Cùng chủ đề nhưng khác hoàn toàn về nội dung cụ thể.
          * Gán một groupId duy nhất cho các câu hỏi liên quan.
        - Tạo câu hỏi đơn lẻ (passage: null, groupId: null) cho các câu hỏi không liên quan đến đoạn văn.
        - Tỷ lệ câu hỏi có đoạn văn và không có đoạn văn phải tương tự tài liệu gốc.
        - Tổng số câu hỏi vẫn phải là ${questionCount}.

      **TRƯỜNG HỢP 3: Tài liệu gốc KHÔNG có đoạn văn**
        - Tạo ${questionCount} câu hỏi đơn lẻ với "passage": null, "groupId": null.
        - Câu hỏi phải cùng ngôn ngữ với tài liệu gốc.

      BƯỚC 3: VÍ DỤ CỤ THỂ

      Nếu tài liệu gốc có 2 đoạn văn, mỗi đoạn 50 từ, với 3 câu hỏi cho đoạn 1 và 2 câu hỏi cho đoạn 2:
      - Tạo 2 đoạn văn mới, mỗi đoạn ≥ 50 từ, cùng chủ đề nhưng nội dung khác.
      - Tạo 5 câu hỏi: 3 câu hỏi cho đoạn văn 1 (groupId: "group1"), 2 câu hỏi cho đoạn văn 2 (groupId: "group2").
      - Ví dụ đoạn văn gốc:
        "Enzyme pepsin được sản xuất trong dạ dày và có chức năng phân giải protein thành các polypeptide nhỏ hơn trong môi trường axit."
      - Tạo đoạn văn mới:
        "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, biến đổi chúng thành các amino acid để cơ thể hấp thụ."

      BƯỚC 4: ĐỊNH DẠNG BẮT BUỘC

      **Nếu tài liệu gốc CHỈ chứa câu hỏi liên quan đến đoạn văn:**
        [
          {
            "id": "q1",
            "text": "Theo đoạn văn trên, enzyme trypsin được tiết ra từ đâu?",
            "options": ["A. Tuyến tụy", "B. Dạ dày", "C. Gan", "D. Ruột non"],
            "passage": "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, biến đổi chúng thành các amino acid để cơ thể hấp thụ.",
            "groupId": "group1"
          },
          {
            "id": "q2",
            "text": "Chức năng chính của enzyme trypsin là gì?",
            "options": ["A. Phân cắt peptide", "B. Tổng hợp protein", "C. Tiêu hóa lipid", "D. Hấp thụ vitamin"],
            "passage": "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, biến đổi chúng thành các amino acid để cơ thể hấp thụ.",
            "groupId": "group1"
          },
          ...
        ]

      **Nếu tài liệu gốc có cả câu hỏi kèm đoạn văn và không kèm đoạn văn:**
        [
          {
            "id": "q1",
            "text": "Công thức của axit sunfuric là gì?",
            "options": ["A. H2SO4", "B. HCl", "C. HNO3", "D. H2CO3"],
            "passage": null,
            "groupId": null
          },
          {
            "id": "q2",
            "text": "Theo đoạn văn trên, enzyme trypsin được tiết ra từ đâu?",
            "options": ["A. Tuyến tụy", "B. Dạ dày", "C. Gan", "D. Ruột non"],
            "passage": "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, biến đổi chúng thành các amino acid để cơ thể hấp thụ.",
            "groupId": "group1"
          },
          ...
        ]

      **Nếu tài liệu gốc KHÔNG có đoạn văn:**
        [
          {
            "id": "q1",
            "text": "Công thức phân tử của nước là gì?",
            "options": ["A. H2O", "B. H2O2", "C. HO2", "D. H3O"],
            "passage": null,
            "groupId": null
          }
        ]

      QUAN TRỌNG:
        - LUÔN sử dụng ngôn ngữ giống tài liệu gốc (tài liệu tiếng Việt thì câu hỏi và đoạn văn tiếng Việt, tài liệu tiếng Anh thì câu hỏi và đoạn văn tiếng Anh,...).
        - LUÔN kiểm tra xem tài liệu gốc có đoạn văn hay không và cấu trúc câu hỏi (chỉ có đoạn văn, hoặc kết hợp).
        - Nếu tài liệu gốc chỉ có câu hỏi liên quan đến đoạn văn, TẤT CẢ câu hỏi mới phải liên quan đến đoạn văn mới, với số lượng đoạn văn và độ dài tương đương hoặc dài hơn.
        - Nếu tài liệu gốc có cả câu hỏi kèm đoạn văn và không kèm đoạn văn, giữ nguyên tỷ lệ tương tự.
        - Đoạn văn mới phải hoàn toàn khác biệt về nội dung cụ thể nhưng cùng chủ đề.
        - Câu hỏi liên quan đến đoạn văn phải tham chiếu trực tiếp ("Theo đoạn văn trên...").
        - Tạo CHÍNH XÁC ${questionCount} câu hỏi.

      B. NẾU LÀ ĐỀ VIẾT TRỰC TIẾP:
        - Phân tích chủ đề và kiến thức từ tài liệu gốc.
        - Tạo ${questionCount} câu hỏi viết mới yêu cầu trả lời ngắn gọn (1-3 từ, công thức, định nghĩa).
        - Sử dụng từ khóa: "Điền", "Nêu", "Cho biết", "Tính", hoặc dấu gạch dưới/chỗ trống.
        - Định dạng:
          [
            {
              "id": "q1",
              "text": "Điền vào chỗ trống: Khái niệm mới về ___",
              "options": [],
              "type": "written"
            }
          ]

      C. NẾU LÀ ĐỀ TỰ LUẬN THỰC HÀNH:
        - Phân tích yêu cầu phức tạp từ tài liệu gốc.
        - Tạo yêu cầu tự luận mới với độ phức tạp tương tự (lập trình, thiết kế, phân tích).
        - Trả về mảng rỗng vì tự luận không hiển thị câu hỏi cụ thể.
        - Định dạng: []

      BƯỚC 3: QUY TẮC CHUNG
        - Tạo chính xác ${questionCount} câu hỏi (trừ tự luận).
        - Nội dung mới phải khác tài liệu gốc nhưng cùng chủ đề và độ khó.
        - Ngôn ngữ đồng nhất với tài liệu gốc.
        - Đảm bảo đoạn văn (nếu có) được gán đúng groupId cho trắc nghiệm.
    `
        : `
      CHẾ ĐỘ TRÍCH XUẤT TỪ TÀI LIỆU CÓ SẴN

      BƯỚC 1: PHÂN LOẠI LOẠI ĐỀ THI
      Phân tích tài liệu gốc để xác định loại đề thi dựa trên các tiêu chí sau (ưu tiên theo thứ tự):

      1. ĐỀ TỰ LUẬN THỰC HÀNH (Essay):
        - Dấu hiệu:
          * Từ khóa lập trình: "xây dựng hệ thống", "viết chương trình", "tạo ứng dụng", "lập trình".
          * Từ khóa thiết kế: "thiết kế cơ sở dữ liệu", "xây dựng website", "phát triển".
          * Từ khóa phân tích: "phân tích chi tiết", "trình bày đầy đủ", "giải thích sâu".
          * Yêu cầu phức tạp: "bao gồm", "cho phép", "xử lý quá trình", "chức năng".
          * Dạng: "Xây dựng hệ thống...", "Phân tích và thiết kế...", "Viết bài luận...".
          * Đáp án mong đợi: file code, tài liệu, hình ảnh, dự án hoàn chỉnh.
          * KHÔNG THỂ trả lời trực tiếp bằng văn bản, cần nộp file đính kèm.
        - Nếu tài liệu chứa các dấu hiệu trên, xác định là TỰ LUẬN THỰC HÀNH.

      2. ĐỀ VIẾT TRỰC TIẾP (Written):
        - Dấu hiệu:
          * Có danh sách câu hỏi yêu cầu trả lời ngắn (1-3 từ, 1 câu, định nghĩa, công thức).
          * Không có lựa chọn đáp án A, B, C, D.
          * Có dấu gạch dưới: "___", chỗ trống: "(...)", hoặc ô vuông để điền.
          * Từ khóa: "Điền", "Viết công thức", "Nêu định nghĩa", "Cho biết tên", "Tính giá trị", "định nghĩa ngắn gọn", "công thức", "kết quả số", "tên thuật ngữ".
          * Dạng: "Định nghĩa enzyme là gì?", "Công thức tính diện tích = ?".
          * Đáp án mong đợi: từ đơn, cụm từ ngắn, số, công thức đơn giản.
          * CÓ THỂ trả lời trực tiếp bằng văn bản trong ô input.
        - Nếu tài liệu chứa các dấu hiệu trên và KHÔNG có dấu hiệu tự luận, xác định là VIẾT TRỰC TIẾP.

      3. ĐỀ TRẮC NGHIỆM:
        - Dấu hiệu:
          * Có danh sách câu hỏi với nhiều lựa chọn đáp án rõ ràng (A, B, C, D hoặc 1, 2, 3, 4).
          * Mỗi câu hỏi có từ 2-5 lựa chọn, đáp án ngắn gọn, cụ thể.
          * Có thể có đoạn văn liên quan (passage) hoặc không.
          * Thường có cụm từ: "Chọn đáp án đúng", "Khoanh tròn", "Chọn phương án".
        - Nếu tài liệu chứa các dấu hiệu trên và KHÔNG có dấu hiệu tự luận hoặc viết trực tiếp, xác định là TRẮC NGHIỆM.

      4. TRƯỜNG HỢP KHÔNG XÁC ĐỊNH:
        - Nếu không khớp với bất kỳ loại đề nào, trả về lỗi: "Không thể xác định loại đề thi từ tài liệu gốc."

      BƯỚC 2: TRÍCH XUẤT CÂU HỎI
        - Nếu tài liệu có ít hơn ${questionCount} câu hỏi: trích xuất TẤT CẢ câu hỏi có sẵn.
        - Nếu tài liệu có từ ${questionCount} câu hỏi trở lên: trích xuất CHÍNH XÁC ${questionCount} câu hỏi đầu tiên.
        - KHÔNG tạo câu hỏi mới, chỉ trích xuất từ tài liệu gốc.

      BƯỚC 3: ĐỊNH DẠNG KẾT QUẢ
      A. NẾU LÀ ĐỀ TRẮC NGHIỆM:
        - Trích xuất câu hỏi và các lựa chọn (A, B, C, D hoặc 1, 2, 3, 4).
        - Nếu có đoạn văn, gán vào trường "passage" và gán "groupId" duy nhất cho các câu hỏi cùng đoạn văn.
        - Định dạng:
          [
            {
              "id": "q1",
              "text": "Thủ đô của Việt Nam là gì?",
              "options": ["A. Hà Nội", "B. Hồ Chí Minh", "C. Đà Nẵng", "D. Hải Phòng"],
              "passage": null,
              "groupId": null
            }
          ]

      B. NẾU LÀ ĐỀ VIẾT TRỰC TIẾP:
        - Trích xuất câu hỏi yêu cầu trả lời ngắn gọn.
        - Định dạng:
          [
            {
              "id": "q1",
              "text": "Điền vào chỗ trống: Enzyme là ___",
              "options": [],
              "type": "written"
            }
          ]

      C. NẾU LÀ ĐỀ TỰ LUẬN THỰC HÀNH:
        - Trả về mảng rỗng vì tự luận không hiển thị câu hỏi cụ thể.
        - Định dạng: []

      BƯỚC 4: QUY TẮC CHUNG
        - Ngôn ngữ đồng nhất với tài liệu gốc.
        - Đảm bảo đoạn văn (nếu có) được gán đúng groupId cho trắc nghiệm.
    `;

      setExtractionProgress(70);

      const effectiveModelId = examData.model?.id || "gemini-2.0-flash";
      const systemPrompt = examData.prompt || undefined;

      const extractionResult = await processFileWithGemini(
        extractionPrompt,
        fileData,
        effectiveModelId,
        systemPrompt
      );
      setExtractionProgress(90);

      try {
        const jsonMatch = extractionResult.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : extractionResult;

        let extractedQuestions;
        try {
          extractedQuestions = JSON.parse(jsonString);
        } catch {
          console.log("Failed to parse JSON, considering as essay exam");
          extractedQuestions = [];
        }
        if (
          Array.isArray(extractedQuestions) &&
          extractedQuestions.length > 0
        ) {
          // Limit questions to questionCount when in extraction mode (allowReferences = false)
          if (!allowReferences && extractedQuestions.length > questionCount) {
            extractedQuestions = extractedQuestions.slice(0, questionCount);
            console.log(
              `Extracted questions limited to ${questionCount} as requested`
            );
          }

          console.log(
            `Processing ${extractedQuestions.length} questions (questionCount: ${questionCount}, allowReferences: ${allowReferences})`
          );

          // Step 1: Check if explicitly marked as written exam
          const hasWrittenType = extractedQuestions.some(
            (q) => q.type === "written"
          );
          if (hasWrittenType) {
            // This is explicitly a written exam
            let processedQuestions = extractedQuestions.map((q) => ({
              ...q,
              options: q.options || [],
            })) as Question[];

            // Clean questions data to ensure proper separation of text and passage
            processedQuestions = cleanQuestionsData(processedQuestions);

            // Apply shuffle logic for written exam if enabled
            if (examData?.shuffleQuestions) {
              processedQuestions = shuffleQuestionsLogic(processedQuestions);
            }

            setQuestions(processedQuestions);
            setExamType("written");
            toast({
              title: "Bài kiểm tra viết trực tiếp",
              description: "Nhập câu trả lời vào ô bên dưới mỗi câu hỏi.",
              variant: "default",
            });
          } else {
            // Step 2: Check for multiple choice questions (with or without passages)
            const validMCQ = extractedQuestions.filter(
              (q) => Array.isArray(q.options) && q.options.length >= 2
            );
            if (validMCQ.length > 0) {
              // This is a multiple choice exam (may include passages)
              let processedQuestions = validMCQ as Question[];

              // Clean questions data to ensure proper separation of text and passage
              processedQuestions = cleanQuestionsData(processedQuestions);

              // Apply shuffle logic for multiple choice exam if enabled
              if (examData?.shuffleQuestions) {
                processedQuestions = shuffleQuestionsLogic(processedQuestions);
              }

              setQuestions(processedQuestions);
              setExamType("multiple-choice");

              const hasPassages = validMCQ.some(
                (q) => q.passage && q.passage.trim().length > 0
              );

              toast({
                title: "Bài kiểm tra trắc nghiệm",
                description: hasPassages
                  ? "Đọc kỹ đoạn văn và chọn đáp án đúng cho mỗi câu hỏi."
                  : "Chọn đáp án đúng cho mỗi câu hỏi.",
                variant: "default",
              });
            } else {
              // Step 3: Check if it's a written exam without explicit type
              const allNoOptions = extractedQuestions.every(
                (q) => !Array.isArray(q.options) || q.options.length === 0
              );
              const hasSpecificQuestions = extractedQuestions.every(
                (q) => q.text && q.text.length > 5
              );

              if (allNoOptions && hasSpecificQuestions) {
                // This is a written exam
                let processedQuestions = extractedQuestions.map((q) => ({
                  ...q,
                  options: q.options || [],
                })) as Question[];

                // Apply shuffle logic for written exam if enabled
                if (examData?.shuffleQuestions) {
                  processedQuestions =
                    shuffleQuestionsLogic(processedQuestions);
                }

                setQuestions(processedQuestions);
                setExamType("written");
                toast({
                  title: "Bài kiểm tra viết trực tiếp",
                  description: "Nhập câu trả lời vào ô bên dưới mỗi câu hỏi.",
                  variant: "default",
                });
              } else {
                // Default to essay exam
                setExamType("essay");
                toast({
                  title: "Bài kiểm tra tự luận",
                  description:
                    "Đề bài đã được hiển thị. Vui lòng làm bài và nộp file bài làm của bạn.",
                  variant: "default",
                });
              }
            }
          }
        } else {
          setExamType("essay");
          toast({
            title: "Bài kiểm tra tự luận",
            description:
              "Đề bài đã được hiển thị. Vui lòng làm bài và nộp file bài làm của bạn.",
            variant: "default",
          });
        }
      } catch (err) {
        console.error("Failed to parse extracted questions:", err);
        console.log("Raw extraction result:", extractionResult);
        setExamType("essay");
      }
    } catch (err) {
      console.error("Error extracting questions:", err);
      toast({
        title: "Error",
        description: "Failed to extract questions from document",
        variant: "destructive",
      });
      setExamType("essay");
    } finally {
      setExtractionProgress(100);
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionProgress(0);
      }, 500);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Handle written answer change
  const handleWrittenAnswerChange = (questionId: string, value: string) => {
    setWrittenAnswers((prev) => ({
      ...prev,
      [questionId]: value,
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

  // Jump to a specific question
  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
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

    const channelId = examData?.channel?.id;
    const serverId = examData?.channel?.serverId;

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
      setIsSubmitting(true);
      setIsProcessing(true);
      setIsExamFinished(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (resolvedExamId) {
        clearSession();
      }

      if (questions.length === 0) {
        toast({
          title: "Không thể nộp bài",
          description: "Không có câu hỏi nào trong bài kiểm tra",
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsProcessing(false);
        return;
      }

      const summary = questions
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

      let documentForEvaluation: FileData | undefined = undefined;
      if (documentContent && documentContent.data) {
        documentForEvaluation = {
          mimeType: documentContent.mimeType,
          data: documentContent.data,
          fileName: documentContent.name,
        };
      }

      const modelId = examData?.model?.id || "gemini-2.0-flash";
      const evaluationResult = await sendMessageToGemini(
        evaluationPrompt,
        modelId,
        documentForEvaluation,
        documentContent?.name,
        examData?.prompt || undefined
      );

      let extractedScore = 0;
      const scoreMatch = evaluationResult.match(
        /ĐIỂM SỐ:\s*(\d+([.,]\d+)?)\/10/
      );
      if (scoreMatch && scoreMatch[1]) {
        extractedScore = parseFloat(scoreMatch[1].replace(",", "."));
      }

      const results: QuestionResult[] = [];

      questions.forEach((question, index) => {
        const questionNumber = index + 1;
        const resultRegex = new RegExp(
          `Câu\\s*${questionNumber}:\\s*(Đúng|Sai|Chưa trả lời)\\s*-\\s*Đáp án đúng:\\s*(.+?)\\s*-\\s*(.+?)(?=Câu\\s*\\d+:|$)`,
          "s"
        );
        const matchResult = evaluationResult.match(resultRegex);

        let status: "correct" | "incorrect" | "unanswered" = "unanswered";
        let isCorrect = false;
        let explanation = "Không có đánh giá chi tiết";
        let correctAnswer = "";

        if (matchResult) {
          correctAnswer = matchResult[2]?.trim() || "";
          explanation = matchResult[3]?.trim() || "Không có giải thích";

          const userAnswer = userAnswers[question.id] || null;

          if (!userAnswer) {
            status = "unanswered";
            isCorrect = false;
          } else {
            // Cải thiện logic so sánh đáp án
            const normalizeAnswer = (answer: string) => {
              return answer.trim().toLowerCase().replace(/\s+/g, " ");
            };

            // So sánh trực tiếp đáp án đã chọn với đáp án đúng
            const userAnswerNormalized = normalizeAnswer(userAnswer);
            const correctAnswerNormalized = normalizeAnswer(correctAnswer);

            // Kiểm tra exact match trước
            if (userAnswerNormalized === correctAnswerNormalized) {
              status = "correct";
              isCorrect = true;
            } else {
              // Kiểm tra nếu đáp án đúng có chứa prefix (A., B., C., D.)
              const correctAnswerWithoutPrefix = correctAnswer
                .replace(/^[A-Z][\.\:\)\s]+/i, "")
                .trim();
              const userAnswerWithoutPrefix = userAnswer
                .replace(/^[A-Z][\.\:\)\s]+/i, "")
                .trim();

              // So sánh prefix (A, B, C, D)
              const userPrefix = userAnswer
                .match(/^([A-Z])/i)?.[1]
                ?.toUpperCase();
              const correctPrefix = correctAnswer
                .match(/^([A-Z])/i)?.[1]
                ?.toUpperCase();

              if (userPrefix && correctPrefix && userPrefix === correctPrefix) {
                status = "correct";
                isCorrect = true;
              } else if (
                normalizeAnswer(userAnswerWithoutPrefix) ===
                normalizeAnswer(correctAnswerWithoutPrefix)
              ) {
                // Chỉ so sánh nội dung nếu không có prefix hoặc prefix khác nhau
                status = "correct";
                isCorrect = true;
              } else {
                status = "incorrect";
                isCorrect = false;
              }
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

        results.push({
          question,
          userAnswer: userAnswers[question.id] || null,
          isCorrect,
          explanation,
          status,
        });
      });

      const correctCount = results.filter((r) => r.status === "correct").length;
      const calculatedScore =
        Math.round((correctCount / questions.length) * 10 * 10) / 10;
      const finalScore = Math.max(extractedScore, calculatedScore);

      const serverId = examData?.channel?.serverId;

      try {
        const checkResponse = await fetch(
          `/api/exam-result?examId=${resolvedExamId}&userId=${profileId}`
        );

        if (!checkResponse.ok) {
          throw new Error(
            `Error checking existing results: ${checkResponse.statusText}`
          );
        }

        const existingResult = await checkResponse.json();

        if (!existingResult || !existingResult.id) {
          const response = await fetch(`/api/exams/${resolvedExamId}/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers: userAnswers,
              score: finalScore,
              details: results.map((r) => ({
                question: r.question,
                userAnswer: r.userAnswer,
                correctAnswer:
                  r.explanation?.match(/Đáp án đúng: (.+?)\./)?.[1] || "",
                status: r.status,
                explanation: r.explanation,
              })),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Failed to save exam results to server", errorData);
            throw new Error(errorData?.error || "Could not save results");
          }

          const resultData = await response.json();

          if (globalDocumentStore.examId === resolvedExamId) {
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
              `/servers/${serverId}/exams/detail/${resolvedExamId}/result/${resultData.submissionId}`
            );
          } else {
            const channelId = examData?.channel?.id;
            const serverId = examData?.channel?.serverId;
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
        } else {
          console.log(
            "Exam result already exists, redirecting to results page"
          );
          toast({
            title: "Bài kiểm tra đã được nộp",
            description:
              "Bạn đã nộp bài kiểm tra này trước đây. Đang chuyển đến kết quả của bạn.",
            variant: "default",
          });
          router.push(
            `/servers/${serverId}/exams/detail/${resolvedExamId}/result/${existingResult.id}`
          );
        }
      } catch (error) {
        console.error("Error submitting exam to server:", error);
        toast({
          title: "Lỗi kết nối",
          description: "Không thể kết nối tới máy chủ để lưu kết quả.",
          variant: "destructive",
        });
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast({
        title: "Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };
  // Submit exam for grading (for written exams)
  const handleSubmitWrittenExam = async () => {
    try {
      setIsSubmitting(true);
      setIsProcessing(true);
      setIsExamFinished(true);
      setShowGradingPopup(true);
      setGradingProgress(0);
      setGradingMessage(gradingStages[0]);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (resolvedExamId) {
        clearSession();
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

      // Update grading progress
      setGradingProgress(20);
      setGradingMessage(gradingStages[1]);

      // Create answers array for written exam
      const writtenAnswersArray = questions.map((question, index) => ({
        question: question.text,
        answer: writtenAnswers[question.id] || "",
        type: "written",
        questionIndex: index + 1,
      }));

      setGradingProgress(40);
      setGradingMessage(gradingStages[2]);

      // Create detailed grading prompt for written answers
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
        - Tên bài kiểm tra: ${examData?.name || "Bài kiểm tra tự luận"}
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

      const modelId = examData?.model?.id || "gemini-2.0-flash";
      const evaluationResult = await sendMessageToGemini(
        gradingPrompt,
        modelId,
        undefined,
        undefined,
        examData?.prompt || undefined
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

      // Enhanced logging for debugging partial credit
      console.log(`AI Suggested Total: ${aiTotalScore}`);
      console.log(`Calculated Total: ${finalTotalScore}`);
      console.log(
        "Individual question scores:",
        detailedResults.map((r) => ({
          question: r.questionIndex,
          score: r.score,
          maxScore: r.maxScore,
          percentage: r.percentage,
          status: r.status,
          hasAnswer:
            (writtenAnswers[questions[r.questionIndex - 1]?.id] || "").trim()
              .length > 0,
        }))
      );

      setGradingProgress(90);
      setGradingMessage(gradingStages[5]);

      const serverId = examData?.channel?.serverId;

      try {
        const response = await fetch(`/api/exams/${resolvedExamId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: detailedResults,
            score: finalTotalScore, // Use calculated total score instead of AI total
            examType: "written",
            detailedEvaluation: evaluationResult,
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
          description: `Bài kiểm tra đã được chấm điểm chi tiết. Điểm của bạn: ${finalTotalScore.toFixed(
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
            const channelId = examData?.channel?.id;
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

  // Calculate progress for written exam
  const writtenAnsweredCount = Object.values(writtenAnswers).filter(
    (answer) => answer.trim() !== ""
  ).length;
  const writtenCompletionPercentage =
    questions.length > 0
      ? Math.round((writtenAnsweredCount / questions.length) * 100)
      : 0;

  // Update progress calculation based on exam type
  const finalAnsweredCount =
    examType === "written"
      ? writtenAnsweredCount
      : Object.keys(userAnswers).length;
  const finalCompletionPercentage =
    examType === "written"
      ? writtenCompletionPercentage
      : questions.length > 0
      ? Math.round((Object.keys(userAnswers).length / questions.length) * 100)
      : 0;

  // Add a processing overlay component
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

    // Don't show general processing overlay for written exams
    if (examType === "written") {
      return null;
    }

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

  // Loading state
  if (isLoading && !examData) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Nếu đang kiểm tra kết quả, hiển thị loading
  if (checkingResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Extracting questions state
  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
        <LoadingSpinner />
        <h2 className="text-lg font-medium">
          Đang trích xuất câu hỏi từ tài liệu...
        </h2>
        <Progress value={extractionProgress} max={100} className="w-64 h-2" />
        <p className="text-sm text-muted-foreground">
          Vui lòng đợi trong giây lát
        </p>
      </div>
    );
  }

  // If it's an essay exam, render the essay exam interface
  if (examType === "essay") {
    return (
      <EssayTakingPage
        exam={
          examData
            ? {
                ...examData,
                description: examData.description ?? undefined,
                channel: examData.channel
                  ? {
                      server: examData.channel.serverId
                        ? { id: examData.channel.serverId }
                        : undefined,
                    }
                  : undefined,
              }
            : undefined
        }
        documentContent={documentContent}
        examFileUrl={examFileUrl}
      />
    );
  }

  // Nếu đã có kết quả, hiển thị điểm và chi tiết
  if (submittedResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={() => router.push("/exams")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">
            {examData?.name || "Bài kiểm tra"}
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
            <h2 className="text-xl font-bold mb-2">Kết quả bài kiểm tra</h2>
            <p className="text-muted-foreground mb-4">
              Điểm số của bạn:{" "}
              <span className="text-3xl font-extrabold">
                {submittedResult.score !== null
                  ? submittedResult.score.toFixed(1)
                  : "N/A"}
              </span>
            </p>

            {submittedResult.details && submittedResult.details.length > 0 && (
              <div className="text-left mb-4">
                {submittedResult.details.map(
                  (detail: ExamResultDetail, index: number) => (
                    <div
                      key={index}
                      className="p-4 border rounded-md bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Câu {index + 1}:</span>
                        <Badge
                          variant={
                            detail.status === "correct"
                              ? "success"
                              : "destructive"
                          }
                        >
                          {detail.status === "correct" ? "Đúng" : "Sai"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Đáp án đúng:</span>{" "}
                        {detail.correctAnswer}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Giải thích:</span>{" "}
                        {detail.explanation}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <Button onClick={() => router.push("/exams")}>
              Quay lại danh sách bài kiểm tra
            </Button>
          </div>
        </div>
      </div>
    );
  }
  // Determine if current question has a passage and if it should be displayed
  const currentQuestion = questions[currentQuestionIndex];
  const hasPassage =
    currentQuestion?.passage && currentQuestion.passage.trim().length > 0;

  // Main exam interface
  return (
    <div className="flex flex-col h-full">
      {isProcessing && <ProcessingOverlay />}

      {/* Grading Popup for Written Exam */}
      {showGradingPopup && examType === "written" && (
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
          {examData?.name || "Bài kiểm tra"}
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
        <Calendar className="h-3.5 w-3.5 mr-1" />        <span>
          Hạn nộp:
          <ClientOnly fallback="">
            {formatDeadline(examData?.deadline)}
            {examData?.deadline && isDeadlinePassed(examData.deadline) && (
              <span className="text-red-500 font-medium ml-1">[Nộp muộn]</span>
            )}
          </ClientOnly>
        </span>
      </div>

      <div className="px-4 py-2 border-b">
        <div className="flex justify-between items-center mb-1 text-sm">
          <span>
            Tiến độ: {finalAnsweredCount}/{questions.length} câu
          </span>
          <span>{finalCompletionPercentage}%</span>
        </div>
        <Progress value={finalCompletionPercentage} max={100} className="h-2" />
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full">
        {/* Question navigator sidebar for written exam */}
        {examType === "written" && (
          <div className="hidden md:block w-64 border-r p-4 flex flex-col h-full">
            <h3 className="font-medium mb-3">Danh sách câu hỏi</h3>
            <div className="space-y-2 overflow-y-auto mb-4">
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
            {timeLeft !== null && totalTime !== null && (
              <div className="mt-auto bg-gray-100 dark:bg-gray-800 rounded-md border p-2">
                <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />
              </div>
            )}
          </div>
        )}

        {/* Regular question navigator for multiple choice */}
        {examType === "multiple-choice" && (
          <div className="hidden md:block w-64 border-r p-4 flex flex-col h-full">
            <h3 className="font-medium mb-3">Câu hỏi</h3>
            <div className="overflow-y-auto mb-4 scrollbar-hide flex justify-center">
              <div className="grid grid-cols-4 gap-2 pt-2">
                {questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={
                      userAnswers[questions[index].id] ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleJumpToQuestion(index)}
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
            {timeLeft !== null && totalTime !== null && (
              <div className="mt-auto bg-gray-100 dark:bg-gray-800 rounded-md border p-2">
                <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />
              </div>
            )}
          </div>
        )}

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
                        {examType === "written"
                          ? writtenAnswers[
                              questions[currentQuestionIndex]?.id
                            ]?.trim()
                            ? "Đã trả lời"
                            : "Chưa trả lời"
                          : userAnswers[questions[currentQuestionIndex]?.id]
                          ? "Đã trả lời"
                          : "Chưa trả lời"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg mb-6">
                      {questions[currentQuestionIndex]?.text}
                    </p>

                    {/* Multiple Choice Options */}
                    {examType === "multiple-choice" &&
                      questions[currentQuestionIndex]?.options && (
                        <div className="space-y-3">
                          {questions[currentQuestionIndex]?.options.map(
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
                                    questions[currentQuestionIndex].id,
                                    option
                                  )
                                }
                              >
                                <input
                                  type="radio"
                                  id={`option-${index}`}
                                  checked={
                                    userAnswers[
                                      questions[currentQuestionIndex].id
                                    ] === option
                                  }
                                  onChange={() =>
                                    !isProcessing &&
                                    handleAnswerSelect(
                                      questions[currentQuestionIndex].id,
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

                    {/* Written Answer Input */}
                    {examType === "written" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Câu trả lời của bạn:
                        </label>
                        <Textarea
                          value={
                            writtenAnswers[
                              questions[currentQuestionIndex]?.id
                            ] || ""
                          }
                          onChange={(e) =>
                            handleWrittenAnswerChange(
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
                        </p>
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
                  <h3 className="font-medium mb-3">
                    {examType === "written" ? "Danh sách câu hỏi" : "Câu hỏi"}
                  </h3>
                  <div
                    className={
                      examType === "written"
                        ? "space-y-2"
                        : "grid grid-cols-5 gap-2"
                    }
                  >
                    {questions.map((question, index) => (
                      <Button
                        key={index}
                        variant={
                          examType === "written"
                            ? currentQuestionIndex === index
                              ? "default"
                              : "outline"
                            : userAnswers[questions[index].id]
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          examType === "written"
                            ? setCurrentQuestionIndex(index)
                            : handleJumpToQuestion(index)
                        }
                        className={
                          examType === "written"
                            ? `w-full justify-start text-left h-auto p-3 ${
                                writtenAnswers[question.id]?.trim()
                                  ? "border-green-500"
                                  : ""
                              } ${
                                currentQuestionIndex === index
                                  ? "ring-2 ring-primary"
                                  : ""
                              }`
                            : `w-10 h-10 ${
                                currentQuestionIndex === index
                                  ? "ring-2 ring-primary"
                                  : ""
                              }`
                        }
                        disabled={isProcessing}
                      >
                        {examType === "written" ? (
                          <div className="flex items-center justify-between w-full">
                            <span>Câu {index + 1}</span>
                            {writtenAnswers[question.id]?.trim() && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        ) : (
                          index + 1
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex justify-center">
                  <Button
                    onClick={
                      examType === "written"
                        ? handleSubmitWrittenExam
                        : handleSubmitExam
                    }
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
          )}        </div>
      </div>
    </div>
  );
};