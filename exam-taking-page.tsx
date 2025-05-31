"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import {
  processFileWithGemini,
  FileData,
} from "@/lib/gemini_google";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { EssayTakingPage } from "./essay-taking-page";
import { MultiChoiceTakingPage } from "./multi-choice-taking-page";
import ClientOnly from "@/components/ClientOnly";
import { formatDeadline, isDeadlinePassed } from "@/lib/exam-timer";

import { WrittenTakingPage } from "./written-taking-page"; 
// Shared Interfaces
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer?: string;
  passage?: string;
  groupId?: string;
}

export interface SubmittedResult {
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
}

export interface ExamFile {
  name: string;
  url: string;
}

export interface ExamChannel {
  id: string;
  name: string;
  serverId: string;
}

export interface Exam {
  id: string;
  name: string;
  description?: string | null | undefined;
  files?: ExamFile[];
  model?: {
    id: string;
  };
  prompt?: string | null;
  deadline?: string | null;
  channel?: ExamChannel;
  allowReferences?: boolean;
  questionCount?: number;
  shuffleQuestions?: boolean;
}

// Global variable for storing document content
export const globalDocumentStore: {
  examId?: string;
  documentContent?: string;
  documentName?: string;
  documentType?: string;
  documentData?: ArrayBuffer;
} = {};

// LocalStorage key for exam session data
export const EXAM_SESSION_KEY_PREFIX = "exam_session_";

// Helper function to get the storage key for a specific exam
export const getExamStorageKey = (examId: string) =>
  `${EXAM_SESSION_KEY_PREFIX}${examId}`;

// Shared utility functions
export function parseMinutesFromPrompt(prompt?: string | null): number {
  if (!prompt) return 0;
  const match = prompt.match(/(\d+)\s*phút/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

export function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function getTimerClass(timeLeft: number, totalTime: number): string {
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

// Shuffle questions logic
export function shuffleQuestionsLogic(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return questions;

  const groupedQuestions: Question[] = [];
  const individualQuestions: Question[] = [];

  questions.forEach((question) => {
    if (question.passage && question.groupId) {
      groupedQuestions.push(question);
    } else {
      individualQuestions.push(question);
    }
  });

  const shuffledIndividual = [...individualQuestions];
  for (let i = shuffledIndividual.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndividual[i], shuffledIndividual[j]] = [
      shuffledIndividual[j],
      shuffledIndividual[i],
    ];
  }

  const result: Question[] = [];
  let groupedIndex = 0;
  let individualIndex = 0;

  questions.forEach((originalQuestion) => {
    if (originalQuestion.passage && originalQuestion.groupId) {
      result.push(groupedQuestions[groupedIndex]);
      groupedIndex++;
    } else {
      if (individualIndex < shuffledIndividual.length) {
        result.push(shuffledIndividual[individualIndex]);
        individualIndex++;
      }
    }
  });

  return result;
}

export function cleanQuestionsData(questions: Question[]): Question[] {
  const passageMap: { [groupId: string]: string } = {};

  questions.forEach((q) => {
    if (q.groupId && q.passage) {
      passageMap[q.groupId] = passageMap[q.groupId] || q.passage.trim();
    }
  });

  return questions.map((q) => {
    let cleanText = q.text || "";
    let cleanPassage = q.groupId ? passageMap[q.groupId] : q.passage || null;

    if (cleanText && cleanPassage && cleanText.includes(cleanPassage)) {
      cleanText = cleanText.replace(cleanPassage, "").trim();
    }

    cleanText = cleanText
      .replace(/^(Theo đoạn văn (trên|sau|dưới đây),?\s*)/i, "")
      .replace(/^(Dựa vào đoạn văn,?\s*)/i, "")
      .trim();

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
export const useExamSession = (examId?: string) => {
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

// Countdown Timer Component
export const CountdownTimer = ({
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

type ExamType = "multiple-choice" | "essay" | "written";

export const ExamTakingPage = ({ exam }: { exam?: Exam }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Basic state
  const [isLoading, setIsLoading] = useState(true);
  const [examData, setExamData] = useState<Exam | null>(null);
  const [examFileUrl, setExamFileUrl] = useState<string | null>(null);
  const [resolvedExamId, setResolvedExamId] = useState<string | undefined>();

  // Document content state
  const [documentContent, setDocumentContent] = useState<{
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null>(null);

  const [submittedResult, setSubmittedResult] = useState<SubmittedResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Check for existing results
  const [checkingResult, setCheckingResult] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

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

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);

  const { clearSession } = useExamSession(resolvedExamId);
  useEffect(() => {
    if (examType === "written" && examData?.prompt && timeLeft === null) {
      const minutes = parseMinutesFromPrompt(examData.prompt);
      if (minutes > 0) {
        setTimeLeft(minutes * 60);
        setTotalTime(minutes * 60);
      }
    }
  }, [examType, examData, timeLeft]);
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

      setExtractionProgress(50);
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
        - Phân bổ số câu hỏi cho mỗi đoạn văn tương tự như tài liệu gốc (nếu gốc có 2 đoạn văn với 3 và 2 câu hỏi, thì đề mới cũng phải có 2 đoạn văn với 3 và 2 câu hỏi).

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
        "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, giúp chuyển hóa protein thành các amino acid để cơ thể hấp thụ."

      BƯỚC 4: ĐỊNH DẠNG BẮT BUỘC

      **Nếu tài liệu gốc CHỈ chứa câu hỏi liên quan đến đoạn văn:**
        [
          {
            "id": "q1",
            "text": "Theo đoạn văn trên, enzyme trypsin được tiết ra từ đâu?",
            "options": ["A. Tuyến tụy", "B. Dạ dày", "C. Gan", "D. Ruột non"],
            "passage": "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, giúp chuyển hóa protein thành các amino acid để cơ thể hấp thụ.",
            "groupId": "group1"
          },
          {
            "id": "q2",
            "text": "Chức năng chính của enzyme trypsin là gì?",
            "options": ["A. Phân cắt peptide", "B. Tổng hợp protein", "C. Tiêu hóa lipid", "D. Hấp thụ vitamin"],
            "passage": "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, giúp chuyển hóa protein thành các amino acid để cơ thể hấp thụ.",
            "groupId": "group1"
          }
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
            "passage": "Enzyme trypsin được tiết ra từ tuyến tụy và hoạt động trong ruột non. Enzyme này có vai trò quan trọng trong việc phân cắt các liên kết peptide của protein, giúp chuyển hóa protein thành các amino acid để cơ thể hấp thụ.",
            "groupId": "group1"
          }
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
        - LUÔN sử dụng ngôn ngữ giống tài liệu gốc (tài liệu tiếng Việt thì câu hỏi và đoạn văn tiếng Việt, tài liệu tiếng Anh thì câu hỏi và đoạn văn tiếng Anh).
        - LUÔN kiểm tra xem tài liệu gốc có đoạn văn hay không và cấu trúc câu hỏi (chỉ có đoạn văn, hoặc kết hợp).
        - Nếu tài liệu gốc chỉ có câu hỏi liên quan đến đoạn văn, TẤT CẢ câu hỏi mới phải liên quan đến đoạn văn mới, với số lượng đoạn văn và độ dài tương tự.
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
          if (!allowReferences && extractedQuestions.length > questionCount) {
            extractedQuestions = extractedQuestions.slice(0, questionCount);
          }

          const hasWrittenType = extractedQuestions.some(
            (q) => q.type === "written"
          );
          if (hasWrittenType) {
            let processedQuestions = extractedQuestions.map((q) => ({
              ...q,
              options: q.options || [],
            })) as Question[];

            processedQuestions = cleanQuestionsData(processedQuestions);

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
            const validMCQ = extractedQuestions.filter(
              (q) => Array.isArray(q.options) && q.options.length >= 2
            );
            if (validMCQ.length > 0) {
              let processedQuestions = validMCQ as Question[];
              processedQuestions = cleanQuestionsData(processedQuestions);

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
              const allNoOptions = extractedQuestions.every(
                (q) => !Array.isArray(q.options) || q.options.length === 0
              );
              const hasSpecificQuestions = extractedQuestions.every(
                (q) => q.text && q.text.length > 5
              );

              if (allNoOptions && hasSpecificQuestions) {
                let processedQuestions = extractedQuestions.map((q) => ({
                  ...q,
                  options: q.options || [],
                })) as Question[];

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

  // Handle navigation back to exam list
  const handleNavigateBack = () => {
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

  // Loading state
  if (isLoading && !examData) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Checking results state
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

  // Route to specific exam type components
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

  if (examType === "multiple-choice") {
    return (
      <MultiChoiceTakingPage
        examData={examData}
        questions={questions}
        documentContent={documentContent}
        examFileUrl={examFileUrl}
        resolvedExamId={resolvedExamId}
        submittedResult={submittedResult}
        onNavigateBack={handleNavigateBack}
      />
    );
  }
  if (examType === "written") {
    return (
      <WrittenTakingPage
        exam={examData ? {
          ...examData,
          description: examData.description ?? undefined
        } : null}
        questions={questions}
        examFileUrl={examFileUrl}
        documentContent={documentContent}
        timeLeft={timeLeft}
        totalTime={totalTime}
        clearSession={clearSession}
        resolvedExamId={resolvedExamId}
      />
    );
  }

  // Written exam component (placeholder for now)
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" onClick={handleNavigateBack}>
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

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Bài kiểm tra viết trực tiếp</h2>
          <p className="text-muted-foreground mb-4">
            Giao diện cho bài kiểm tra viết sẽ được phát triển sau.
          </p>
          <Button onClick={handleNavigateBack}>
            Quay lại danh sách bài kiểm tra
          </Button>
        </div>
      </div>
    </div>
  );
};