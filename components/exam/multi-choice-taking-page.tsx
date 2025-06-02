"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, Calendar, Send } from "lucide-react";
import { sendMessageToGemini, FileData } from "@/lib/gemini_google";
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
import ClientOnly from "@/components/ClientOnly";
import { formatDeadline, isDeadlinePassed } from "@/lib/exam-timer";
import { clearCachedQuestions } from './exam-taking-page';
// Import shared types and utilities
import {
  Question,
  Exam,
  useExamSession,
  parseMinutesFromPrompt,
  CountdownTimer,
  globalDocumentStore,
} from "./exam-taking-page";

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

interface MultiChoiceTakingPageProps {
  examData: Exam | null;
  questions: Question[];
  documentContent: {
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null;
  examFileUrl: string | null;
  resolvedExamId: string | undefined;
  submittedResult: SubmittedResult | null;
  onNavigateBack: () => void;
}

export const MultiChoiceTakingPage = ({
  examData,
  questions,
  documentContent,
  examFileUrl,
  resolvedExamId,
  submittedResult,
  onNavigateBack,
}: MultiChoiceTakingPageProps) => {
  const router = useRouter();

  // State for multiple choice exam
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{
    [questionId: string]: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExamFinished, setIsExamFinished] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const questionsEndRef = useRef<HTMLDivElement>(null);
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

  // Get userId from API
  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfileId(data?.id || null))
      .catch(() => setProfileId(null));
  }, []);

  // Session restoration and timer setup
  useEffect(() => {
    if (!resolvedExamId || submittedResult || !questions.length) return;

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
  }, [resolvedExamId, submittedResult, questions.length, examData, loadSession, timeLeft]);

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
    if (timeLeft === null || isExamFinished || isProcessing) return;

    // When timer reaches zero, trigger submission
    if (timeLeft <= 0) {
      // Use setTimeout to avoid potential render issues and ensure handleSubmitExam is called after the current render cycle
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
  }, [timeLeft, isExamFinished, isProcessing]);

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({
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

  // Jump to a specific question
  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
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

      // Clear any pending timer to prevent timer tick during submission
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

      // Determine if this is an automatic submission due to time expiring
      const isAutoSubmit = timeLeft !== null && timeLeft <= 0;
      
      if (isAutoSubmit) {
        toast({
          title: "Hết thời gian làm bài",
          description: "Bài kiểm tra của bạn đã được tự động nộp.",
          variant: "default",
        });
      }

      // Ensure there's at least an empty answer for each question to prevent API errors
      const defaultAnswers: { [questionId: string]: string } = {};
      questions.forEach(q => {
        if (!userAnswers[q.id]) {
          defaultAnswers[q.id] = "";
        }
      });
      const combinedAnswers = { ...defaultAnswers, ...userAnswers };

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
        Nếu không có câu nào đúng thì cho điểm 0.
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
          
          // Fix the logic that determines answer correctness
          // Instead of trying to normalize and compare ourselves, trust the AI's evaluation
          const aiResult = matchResult[1]?.trim();
          const userAnswer = userAnswers[question.id] || null;

          if (!userAnswer) {
            status = "unanswered";
            isCorrect = false;
          } else {
            // Trust the AI's evaluation result instead of our own comparison
            if (aiResult === "Đúng") {
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

      // Calculate late submission penalty
      let latePenalty = 0;
      let lateSubmissionNote = "";

      if (examData?.deadline && finalScore > 0) {  // Only apply penalty if score > 0
        const deadline = new Date(examData.deadline);
        const now = new Date();
        
        if (now > deadline) {
          const minutesLate = Math.floor((now.getTime() - deadline.getTime()) / (60 * 1000));
          
          if (minutesLate > 0 && minutesLate <= 30) {
            latePenalty = 0.5;
            lateSubmissionNote = `Nộp muộn ${minutesLate} phút, trừ 0.5 điểm.`;
          } else if (minutesLate > 30 && minutesLate <= 60) {
            latePenalty = 2;
            lateSubmissionNote = `Nộp muộn ${minutesLate} phút, trừ 2 điểm.`;
          } else if (minutesLate > 60) {
            latePenalty = finalScore / 2; // Trừ 1/2 số điểm
            const hours = Math.floor(minutesLate / 60);
            const mins = minutesLate % 60;
            lateSubmissionNote = `Nộp muộn ${hours} giờ ${mins} phút, trừ 1/2 số điểm.`;
          }
        }
      }

      // Apply penalty
      const scoreAfterPenalty = Math.max(0, finalScore - latePenalty);
      const finalScoreWithPenalty = Math.round(scoreAfterPenalty * 10) / 10;

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
              answers: combinedAnswers, // Send the combined answers with defaults
              score: finalScoreWithPenalty,
              details: results.map((r) => ({
                question: r.question,
                userAnswer: r.userAnswer,
                correctAnswer:
                  r.explanation?.match(/Đáp án đúng: (.+?)\./)?.[1] || "",
                status: r.status,
                explanation: r.explanation,
                latePenalty: lateSubmissionNote || undefined,
              })),
              latePenalty: latePenalty > 0 ? {
                amount: latePenalty,
                note: lateSubmissionNote,
                originalScore: finalScore
              } : undefined,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Failed to save exam results to server", errorData);
            throw new Error(errorData?.error || "Could not save results");
          }else{
            if (resolvedExamId) {
              clearCachedQuestions(resolvedExamId);
            }
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
              latePenalty > 0 
                ? `Bài làm của bạn đã được ghi nhận. ${lateSubmissionNote} Đang chuyển đến trang kết quả.`
                : "Bài làm của bạn đã được ghi nhận. Đang chuyển đến trang kết quả.",
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

  // Processing overlay component
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

  // If already submitted, show result
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

  // Determine if current question has a passage
  const currentQuestion = questions[currentQuestionIndex];
  const hasPassage =
    currentQuestion?.passage && currentQuestion.passage.trim().length > 0;

  // Calculate progress
  const completionPercentage =
    questions.length > 0
      ? Math.round((Object.keys(userAnswers).length / questions.length) * 100)
      : 0;

  // Main multiple choice exam interface
  return (
    <div className="flex flex-col h-full">
      {isProcessing && <ProcessingOverlay />}

      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          onClick={onNavigateBack}
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
        <Calendar className="h-3.5 w-3.5 mr-1" />
        <span>
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
            Tiến độ: {Object.keys(userAnswers).length}/{questions.length} câu
          </span>
          <span>{completionPercentage}%</span>
        </div>
        <Progress value={completionPercentage} max={100} className="h-2" />
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full">
        {/* Question navigator sidebar */}
        <div className="hidden md:block w-64 border-r p-4 flex flex-col h-full">
          <h3 className="font-medium mb-3">Câu hỏi</h3>
          <div className={`overflow-y-auto mb-4 ${questions.length > 40 ? 'max-h-[420px]' : ''} scrollbar-hide flex justify-center`}>
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
                        {userAnswers[questions[currentQuestionIndex]?.id]
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
                    {questions[currentQuestionIndex]?.options && (
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
                  <h3 className="font-medium mb-3">Câu hỏi</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((_, index) => (
                      <Button
                        key={index}
                        variant={
                          userAnswers[questions[index].id]
                            ? "default"
                            : "outline"
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