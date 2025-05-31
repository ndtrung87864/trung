"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { MultipleChoiceExerciseTakingPage } from "./multiple-choice-exercise-taking-page";
import { WrittenExerciseTakingPage } from "./written-exercise-taking-page";
import { EssayExerciseTakingPage } from "./essay-exercise-taking-page";
import { Progress } from "@/components/ui/progress";
import {
  processFileWithGemini,
  FileData,
} from "@/lib/gemini_google";

// Giao diện dữ liệu
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
  description?: string;
  files?: ExerciseFile[];
  model?: {
    id: string;
  };
  prompt?: string | null;
  deadline?: string | null;
  channel?: ExerciseChannel;
  allowReferences?: boolean; // Chế độ tạo bài tập mới dựa trên tài liệu
  questionCount?: number;    // Giới hạn số lượng câu hỏi
  shuffleQuestions?: boolean; // Xáo trộn câu hỏi
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
  exerciseName?: string;
  score: number;
  answers: Array<{
    questionId: string;
    answer: string;
    type?: string;
  }>;
  submissionId?: string;
  details?: ExerciseResultDetail[];
  deadline?: string | null; // Add deadline field
  createdAt?: string;
}

// Biến toàn cục lưu trữ nội dung tài liệu
const globalExerciseDocumentStore: {
  exerciseId?: string;
  documentContent?: string;
  documentName?: string;
  documentType?: string;
  documentData?: ArrayBuffer;
} = {};

// Khóa lưu trữ LocalStorage cho phiên làm bài tập
const EXERCISE_SESSION_KEY_PREFIX = "exercise_session_";

// Hàm tạo khóa lưu trữ cho bài tập cụ thể
const getExerciseStorageKey = (exerciseId: string) =>
  `${EXERCISE_SESSION_KEY_PREFIX}${exerciseId}`;

// Add a new storage key prefix for cached questions
const EXERCISE_QUESTIONS_KEY_PREFIX = "exercise_questions_";

// Helper function to get the storage key for cached questions
const getExerciseQuestionsStorageKey = (exerciseId: string) =>
  `${EXERCISE_QUESTIONS_KEY_PREFIX}${exerciseId}`;

const useExerciseSession = (exerciseId?: string) => {
  const saveAnswers = useCallback((answers: { [questionId: string]: string }) => {
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
      console.error("Lỗi khi lưu câu trả lời vào localStorage:", e);
    }
  }, [exerciseId]);

  const saveQuestionIndex = useCallback((index: number) => {
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
      console.error("Lỗi khi lưu chỉ số câu hỏi vào localStorage:", e);
    }
  }, [exerciseId]);

  const loadSession = useCallback(() => {
    if (!exerciseId) return null;
    try {
      const sessionData = JSON.parse(
        localStorage.getItem(getExerciseStorageKey(exerciseId)) || "{}"
      );
      return sessionData;
    } catch (e) {
      console.error("Lỗi khi tải phiên từ localStorage:", e);
      return null;
    }
  }, [exerciseId]);

  const clearSession = useCallback(() => {
    if (!exerciseId) return;
    localStorage.removeItem(getExerciseStorageKey(exerciseId));
  }, [exerciseId]);

  return { saveAnswers, saveQuestionIndex, loadSession, clearSession };
};

// Hàm làm sạch dữ liệu câu hỏi
function cleanQuestionsData(questions: Question[]): Question[] {
  const passageMap: { [groupId: string]: string } = {};
  questions.forEach(q => {
    if (q.groupId && q.passage) {
      passageMap[q.groupId] = passageMap[q.groupId] || q.passage.trim();
    }
  });

  return questions.map(q => {
    let cleanText = q.text || '';
    let cleanPassage = q.groupId ? passageMap[q.groupId] : q.passage || null;

    if (cleanText && cleanPassage && cleanText.includes(cleanPassage)) {
      cleanText = cleanText.replace(cleanPassage, '').trim();
    }

    cleanText = cleanText
      .replace(/^(Theo đoạn văn (trên|sau|dưới đây),?\s*)/i, '')
      .replace(/^(Dựa vào đoạn văn,?\s*)/i, '')
      .trim();

    if (cleanPassage) {
      cleanPassage = cleanPassage
        .replace(/\(\s*đoạn văn giống hệt đoạn văn của q\d+\s*\)/gi, '')
        .trim();
    }

    return {
      id: q.id,
      text: cleanText,
      options: Array.isArray(q.options) ? q.options : [],
      passage: cleanPassage && cleanPassage.length > 0 ? cleanPassage : undefined,
      groupId: q.groupId || undefined,
      correctAnswer: q.correctAnswer,
      type: q.type,
    };
  });
}

// Hàm xáo trộn câu hỏi
function shuffleQuestionsLogic(questions: Question[]): Question[] {
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
    [shuffledIndividual[i], shuffledIndividual[j]] = [shuffledIndividual[j], shuffledIndividual[i]];
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

// Hàm xáo trộn các đáp án trong câu hỏi trắc nghiệm
function shuffleOptionsInQuestions(questions: Question[]): Question[] {
  if (!questions || questions.length === 0) return questions;

  return questions.map((question) => {
    // Chỉ xáo trộn nếu có options và là câu hỏi trắc nghiệm
    if (!question.options || question.options.length <= 1 || question.type === "written") {
      return question;
    }

    // Tạo bản sao của options để xáo trộn
    const shuffledOptions = [...question.options];
    
    // Sử dụng Fisher-Yates shuffle algorithm
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    // Trả về câu hỏi với options đã được xáo trộn
    return {
      ...question,
      options: shuffledOptions
    };
  });
}

// Loại bài tập
type ExerciseType = "multiple-choice" | "essay" | "written";

interface BatchProgress {
  current: number;
  total: number;
}

export const ExerciseTakingPage = ({ exercise }: { exercise?: Exercise }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Trạng thái cơ bản
  const [isLoading, setIsLoading] = useState(true);
  const [exerciseData, setExerciseData] = useState<Exercise | null>(null);
  const [exerciseFileUrl, setExerciseFileUrl] = useState<string | null>(null);
  const [resolvedExerciseId, setResolvedExerciseId] = useState<string | undefined>();

  // Trạng thái nội dung tài liệu
  const [documentContent, setDocumentContent] = useState<{
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  } | null>(null);

  // Trạng thái câu hỏi và kết quả
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<SubmittedResult | null>(null);
  const [checkingResult, setCheckingResult] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [exerciseType, setExerciseType] = useState<ExerciseType | null>(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ current: 0, total: 0 });
  const [questionProgress, setQuestionProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
  const [processingStage, setProcessingStage] = useState<string>("Đang chuẩn bị");

  // Quản lý phiên làm bài
  const {clearSession } = useExerciseSession(resolvedExerciseId);

  // Trích xuất ID bài tập từ URL
  useEffect(() => {
    const segments = pathname?.split("/");
    const idFromPath = segments ? segments[segments.length - 1] : undefined;
    setResolvedExerciseId(idFromPath);
  }, [pathname]);

  // Lấy userId từ API
  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfileId(data?.id || null))
      .catch(() => setProfileId(null));
  }, []);

  // Kiểm tra kết quả hiện có
  useEffect(() => {
    if (!resolvedExerciseId || !profileId) return;
    setCheckingResult(true);

    fetch(`/api/exercise-result?exerciseId=${resolvedExerciseId}&userId=${profileId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API responded with status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && typeof data.score !== "number") {
          try {
            data.score = typeof data.score === "string" ? parseFloat(data.score) : 0;
          } catch (e) {
            console.error("Lỗi phân tích điểm số:", e);
            data.score = 0;
          }
        }

        if (
          data &&
          data.id &&
          data.userId === profileId &&
          data.exerciseId === resolvedExerciseId &&
          data.score !== null &&
          data.score !== undefined &&
          Array.isArray(data.answers)
        ) {
          setSubmittedResult(data);
        } else {
          setSubmittedResult(null);
          console.log("Không tìm thấy kết quả bài tập hợp lệ");
        }
        setCheckingResult(false);
      })
      .catch((error) => {
        console.error("Lỗi khi kiểm tra kết quả bài tập:", error);
        setSubmittedResult(null);
        setCheckingResult(false);
        toast({
          title: "Lỗi kết nối",
          description: "Không thể kiểm tra kết quả bài tập. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      });
  }, [resolvedExerciseId, profileId]);

  // Tải dữ liệu bài tập
  useEffect(() => {
    const loadExerciseData = async () => {
      try {
        setIsLoading(true);

        if (!resolvedExerciseId) return;

        if (
          globalExerciseDocumentStore.exerciseId === resolvedExerciseId &&
          globalExerciseDocumentStore.documentData
        ) {
          console.log("Sử dụng dữ liệu tài liệu đã lưu cho bài tập:", resolvedExerciseId);
          setDocumentContent({
            data: globalExerciseDocumentStore.documentData,
            mimeType: globalExerciseDocumentStore.documentType || "application/pdf",
            name: globalExerciseDocumentStore.documentName || "document.pdf",
          });
        }

        const response = await fetch(`/api/exercises/${resolvedExerciseId}`);
        if (!response.ok) throw new Error(`Không thể tải dữ liệu bài tập: ${response.statusText}`);

        const data = await response.json();
        setExerciseData(data);
        processExerciseFiles(data);
      } catch (error: unknown) {
        console.error("Lỗi khi tải bài tập:", error);
        toast({
          title: "Lỗi",
          description: `Không thể tải bài tập: ${error instanceof Error ? error.message : "Lỗi không xác định"}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedExerciseId) loadExerciseData();
    else if (exercise?.id) setResolvedExerciseId(exercise.id);
  }, [resolvedExerciseId, exercise]);

  // Xử lý tệp bài tập
  const processExerciseFiles = (exerciseData: Exercise) => {
    if (!exerciseData.files || exerciseData.files.length === 0) return;

    const firstFile = exerciseData.files[0];
    let fileUrl = firstFile.url;
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const fileName = fileUrl.split("/").pop();
      fileUrl = fileName ? `/uploads/files/${fileName}` : fileUrl;
    } else if (!fileUrl.startsWith("/uploads/")) {
      fileUrl = "/uploads/files/" + fileUrl.replace(/^\/+/, "");
    }
    const viewableUrl = `/api/files/view?path=${encodeURIComponent(fileUrl)}`;
    setExerciseFileUrl(viewableUrl);

    // Check if we have cached questions for this exercise
    if (resolvedExerciseId) {
      try {
        const cachedQuestionsKey = getExerciseQuestionsStorageKey(resolvedExerciseId);
        const cachedQuestionsJson = localStorage.getItem(cachedQuestionsKey);
        
        if (cachedQuestionsJson) {
          const cachedData = JSON.parse(cachedQuestionsJson);
          if (cachedData && 
              Array.isArray(cachedData.questions) && 
              cachedData.questions.length > 0 &&
              cachedData.exerciseType) {
            console.log(`Using ${cachedData.questions.length} cached questions of type ${cachedData.exerciseType} for exercise: ${resolvedExerciseId}`);
            setQuestions(cachedData.questions);
            setExerciseType(cachedData.exerciseType as ExerciseType);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading cached questions:", error);
        // Continue with extraction if loading cached questions fails
      }
    }

    // If no cached questions, proceed with extraction
    if (
      globalExerciseDocumentStore.exerciseId === exerciseData.id &&
      globalExerciseDocumentStore.documentData
    ) {
      console.log("Sử dụng tài liệu đã lưu để khởi tạo bài tập");
      extractQuestionsFromDocument(exerciseData, firstFile, true);
    } else {
      extractQuestionsFromDocument(exerciseData, firstFile);
    }
  };

  // Create prompt for batch processing
  const createBatchPrompt = (exerciseData: Exercise, questionsInBatch: number, currentBatch: number, totalBatches: number) => {
    // First check if we're processing subsequent batches and need to maintain consistency
    let existingQuestionsType: string | null = null;
    
    // Check for cached questions or previous batch results to determine question type
    if (resolvedExerciseId) {
      try {
        // First check if we have already started generating questions (from questions state)
        if (questions.length > 0) {
          // If we have questions already, check their type
          const hasWritten = questions.some(q => q.type === "written");
          const hasMultipleChoice = questions.some(q => Array.isArray(q.options) && q.options.length > 1);
          
          if (hasWritten && !hasMultipleChoice) {
            console.log("Continuing with written questions based on existing questions");
            existingQuestionsType = "written";
          } else if (!hasWritten && hasMultipleChoice) {
            console.log("Continuing with multiple choice questions based on existing questions");
            existingQuestionsType = "multiple-choice";
          }
        }
        
        // If we don't have type from current session, check cache
        if (!existingQuestionsType) {
          const questionsKey = getExerciseQuestionsStorageKey(resolvedExerciseId);
          const cachedData = JSON.parse(localStorage.getItem(questionsKey) || "{}");
          if (cachedData && cachedData.exerciseType) {
            existingQuestionsType = cachedData.exerciseType;
          }
        }
      } catch (error) {
        console.error("Error checking cached question type:", error);
      }
    }
    
    console.log(`Creating batch ${currentBatch}/${totalBatches} with question type: ${existingQuestionsType || "undetermined"}`);
    
    // If we previously determined this is a written exercise, create written questions
    if (existingQuestionsType === "written") {
      return `
        CHẾ ĐỘ TẠO BÀI TẬP TỰ LUẬN VIẾT DỰA TRÊN TÀI LIỆU - BATCH ${currentBatch}/${totalBatches}

        Đây là batch số ${currentBatch} trong tổng số ${totalBatches} batch để tạo câu hỏi tự luận viết.
        
        Trong batch này, hãy tạo ${questionsInBatch} câu hỏi tự luận viết MỚI KHÁC HOÀN TOÀN so với các câu hỏi trước đó.
        Tạo câu hỏi dựa trên tài liệu tham khảo đính kèm.

        PHÂN LOẠI VÀ YÊU CẦU:
        - Câu hỏi tự luận viết là câu hỏi YÊU CẦU TRẢ LỜI NGẮN GỌN (1-5 từ, một câu, định nghĩa, công thức).
        - Không có lựa chọn đáp án A, B, C, D.
        - Thường có dấu gạch dưới: "___", chỗ trống: "(...)", hoặc ô vuông để điền.
        - Thường có từ khóa: "Điền", "Viết công thức", "Nêu định nghĩa", "Cho biết tên", "Tính giá trị".
        - Đáp án mong đợi: từ đơn, cụm từ ngắn, số, công thức đơn giản.
        - Có thể trả lời trực tiếp bằng văn bản trong ô input.

        ĐỊNH DẠNG BẮT BUỘC:
        Trả về mảng các câu hỏi với định dạng:
        [
          {
            "id": "q${currentBatch}_1",
            "text": "Điền vào chỗ trống: Enzyme là ___",
            "options": [],
            "type": "written",
            "correctAnswer": "Đáp án chuẩn để chấm điểm"
          },
          {
            "id": "q${currentBatch}_2",
            "text": "Viết công thức hóa học của nước:",
            "options": [],
            "type": "written",
            "correctAnswer": "H2O"
          }
        ]

        LƯU Ý: 
        - Đảm bảo ${questionsInBatch} câu hỏi đều KHÁC NHAU và KHÁC với các câu đã tạo ở các batch trước.
        - Sử dụng prefixes id là "q${currentBatch}_" để tránh trùng lặp ID với các batch khác.
        - BẮT BUỘC thêm trường "type": "written" cho mỗi câu hỏi viết để phân biệt với trắc nghiệm.
        - MỖI câu hỏi đều phải có trường "correctAnswer" chứa đáp án chuẩn để chấm điểm.
        - Nội dung câu hỏi phải đơn giản, rõ ràng và phù hợp với nội dung tài liệu.
        - TUYỆT ĐỐI KHÔNG TẠO CÂU HỎI TRẮC NGHIỆM TRONG BATCH NÀY.
      `;
    }
    
    // Now check if first batch should be written based on the document analysis
    if (currentBatch === 1 && !existingQuestionsType) {
      return `
        CHẾ ĐỘ XÁC ĐỊNH LOẠI BÀI TẬP DỰA TRÊN TÀI LIỆU - BATCH ${currentBatch}/${totalBatches}
        
        BƯỚC 1: PHÂN LOẠI LOẠI BÀI TẬP
        Phân tích tài liệu gốc để xác định loại BÀI TẬP phù hợp nhất:

        1. ĐỀ VIẾT TRỰC TIẾP (Written):
          - Dấu hiệu: 
            * Nhiều câu hỏi yêu cầu trả lời ngắn (1-5 từ, một câu, định nghĩa, công thức).
            * Không có lựa chọn đáp án A, B, C, D.
            * Có dấu gạch dưới: "___", chỗ trống: "(...)", hoặc ô vuông để điền.
            * Từ khóa: "Điền", "Viết công thức", "Nêu định nghĩa", "Cho biết tên", "Tính giá trị".
            * Dạng: "Định nghĩa enzyme là gì?", "Công thức tính diện tích = ?".

        2. ĐỀ TRẮC NGHIỆM (Multiple Choice):
          - Dấu hiệu:
            * Nhiều lựa chọn đáp án rõ ràng (A, B, C, D hoặc 1, 2, 3, 4).
            * Mỗi câu hỏi có từ 2-5 lựa chọn, đáp án ngắn gọn.
            * Có thể có đoạn văn liên quan hoặc không.
            * Thường có cụm từ: "Chọn đáp án đúng", "Khoanh tròn", "Chọn phương án".

        Dựa vào phân tích trên, hãy tạo ${questionsInBatch} câu hỏi theo MỘT TRONG HAI loại (written hoặc multiple choice), phải nhất quán cùng một loại cho tất cả câu hỏi.

        BẮT BUỘC:
        - Nếu tạo câu hỏi VIẾT TRỰC TIẾP: thêm trường "type": "written" và trường "correctAnswer" cho mỗi câu.
        - Nếu tạo câu hỏi TRẮC NGHIỆM: thêm trường "options" là mảng các lựa chọn.

        ĐỊNH DẠNG VIẾT TRỰC TIẾP:
        [
          {
            "id": "q${currentBatch}_1",
            "text": "Điền vào chỗ trống: Quang hợp là quá trình ___",
            "options": [],
            "type": "written",
            "correctAnswer": "chuyển hóa năng lượng ánh sáng thành năng lượng hóa học"
          },
          {
            "id": "q${currentBatch}_2",
            "text": "Viết công thức của nước:",
            "options": [],
            "type": "written",
            "correctAnswer": "H2O"
          }
        ]

        ĐỊNH DẠNG TRẮC NGHIỆM:
        [
          {
            "id": "q${currentBatch}_1",
            "text": "Câu hỏi...",
            "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"]
          }
        ]
        
        LƯU Ý: 
        - Chỉ chọn MỘT LOẠI (written hoặc multiple choice) và tạo tất cả ${questionsInBatch} câu hỏi theo cùng loại đó.
        - Nội dung câu hỏi phải phù hợp với tài liệu đính kèm.
      `;
    }
    
    // Default to multiple choice questions
    return `
      CHẾ ĐỘ TẠO BÀI TẬP MỚI DỰA TRÊN TÀI LIỆU THAM KHẢO - BATCH ${currentBatch}/${totalBatches}

      Đây là batch số ${currentBatch} trong tổng số ${totalBatches} batch để tạo câu hỏi trắc nghiệm.
      
      Trong batch này, hãy tạo ${questionsInBatch} câu hỏi trắc nghiệm MỚI KHÁC HOÀN TOÀN so với các câu hỏi trước đó.
      Tạo câu hỏi dựa trên tài liệu tham khảo đính kèm.

      BƯỚC 1: PHÂN TÍCH CẤU TRÚC TÀI LIỆU
        - Đọc hiểu toàn bộ nội dung tài liệu.
        - Xác định xem tài liệu sử dụng ngôn ngữ nào (tiếng Việt, tiếng Anh, v.v.).
        - Xác định xem tài liệu thuộc chủ đề vi mô nào (vd: chiến tranh Tống - Việt, hiệu ứng quang điện,...) hay vĩ mô nào (vd: chiến tranh thế giới thứ 2, cơ học lượng tử,...).
        - Xác định xem tài liệu có chứa ĐOẠN VĂN kèm câu hỏi hay không (đoạn văn không phải câu hỏi).
        - Nếu có đoạn văn: lưu ý số lượng đoạn văn, độ dài mỗi đoạn văn (số từ hoặc số câu), và cách liên kết với câu hỏi.
        - Xác định xem tài liệu có chỉ chứa câu hỏi liên quan đến đoạn văn (tất cả câu hỏi đều có passage và groupId) hay không.

      BƯỚC 2: QUY TẮC TẠO ĐOẠN VĂN VÀ CÂU HỎI
      - Nếu tài liệu gốc CHỈ chứa câu hỏi liên quan đến đoạn văn: Tạo ${questionsInBatch} câu hỏi liên quan đến đoạn văn mới
      - Nếu tài liệu gốc CÓ đoạn văn kèm câu hỏi nhưng CŨNG có câu hỏi không liên quan: Tạo cân đối giữa hai loại, tổng số ${questionsInBatch} câu
      - Nếu tài liệu gốc KHÔNG có đoạn văn: Tạo ${questionsInBatch} câu hỏi đơn lẻ với "passage": null, "groupId": null

      BƯỚC 3: ĐỊNH DẠNG BẮT BUỘC
      Trả về mảng các câu hỏi với định dạng:
      [
        {
          "id": "q${currentBatch}_1",
          "text": "Câu hỏi...",
          "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
          "passage": "Đoạn văn tham khảo nếu có...",
          "groupId": "group${currentBatch}_1" 
        },
        ...
      ]
      
      LƯU Ý: 
      - Đảm bảo ${questionsInBatch} câu hỏi đều KHÁC NHAU và KHÁC với các câu đã tạo ở các batch trước.
      - Sử dụng prefixes id là "q${currentBatch}_" để tránh trùng lặp ID với các batch khác.
      - Nội dung câu hỏi phải đơn giản, rõ ràng và phù hợp với nội dung tài liệu.
      - Đặt số lượng options (đáp án) từ 3-5 tùy theo nội dung câu hỏi.
    `;
  };
  
  // Process questions in multiple batches
  const processQuestionsInBatches = async (exerciseData: Exercise, fileData: FileData, totalQuestionCount: number) => {
    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(totalQuestionCount / BATCH_SIZE);
    let allQuestions: Question[] = [];
    
    setIsExtracting(false);
    setIsLoadingBatches(true);
    setBatchProgress({ current: 0, total: totalBatches });
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      setBatchProgress({ current: batchNum + 1, total: totalBatches });
      
      // Calculate questions to generate in this batch
      const remainingQuestions = totalQuestionCount - allQuestions.length;
      const questionsInThisBatch = Math.min(BATCH_SIZE, remainingQuestions);
      
      setProcessingStage(`Đang tạo đợt câu hỏi ${batchNum + 1}/${totalBatches}`);
      
      // Generate prompt for this batch
      const batchPrompt = createBatchPrompt(exerciseData, questionsInThisBatch, batchNum + 1, totalBatches);
      
      try {
        const effectiveModelId = exerciseData.model?.id || "gemini-2.0-flash";
        const systemPrompt = exerciseData.prompt || undefined;

        // Process with AI
        const batchResult = await processFileWithGemini(
          batchPrompt,
          fileData,
          effectiveModelId,
          systemPrompt
        );
        
        // Parse questions from this batch
        const batchQuestions = extractQuestionsFromResponse(batchResult);
        
        if (Array.isArray(batchQuestions) && batchQuestions.length > 0) {
          // Check for consistency in question types - especially important for first batch
          if (batchNum === 0) {
            // Determine the question type from first batch
            const hasWrittenType = batchQuestions.some(q => q.type === "written");
            const hasMultipleChoice = batchQuestions.some(q => Array.isArray(q.options) && q.options.length > 1);
            
            // Ensure all questions follow the same format
            if (hasWrittenType && !hasMultipleChoice) {
              console.log("First batch detected as written questions, enforcing type");
              // Make sure all have written type
              batchQuestions.forEach(q => {
                q.type = "written";
                if (!q.correctAnswer) q.correctAnswer = "Unknown";
                if (!Array.isArray(q.options)) q.options = [];
              });
            } else if (!hasWrittenType && hasMultipleChoice) {
              console.log("First batch detected as multiple choice questions");
              // Ensure none have written type
              batchQuestions.forEach(q => {
                if (q.type === "written") delete q.type;
              });
            }
          } else if (allQuestions.length > 0) {
            // For subsequent batches, ensure consistency with first batch
            const firstBatchHasWritten = allQuestions.some(q => q.type === "written");
            
            if (firstBatchHasWritten) {
              // Ensure all new questions are written type
              batchQuestions.forEach(q => {
                q.type = "written";
                if (!q.correctAnswer) q.correctAnswer = "Unknown";
                if (!Array.isArray(q.options)) q.options = [];
              });
            } else {
              // Ensure none of new questions have written type
              batchQuestions.forEach(q => {
                if (q.type === "written") delete q.type;
              });
            }
          }
          
          allQuestions = [...allQuestions, ...batchQuestions];
          setQuestions(allQuestions); // Update questions state to help next batch determine type
          setQuestionProgress({ 
            current: allQuestions.length, 
            total: totalQuestionCount 
          });
        } else {
          console.warn(`Batch ${batchNum + 1} returned no valid questions`);
        }
        
        console.log(`Completed batch ${batchNum + 1}/${totalBatches}, total questions: ${allQuestions.length}/${totalQuestionCount}`);
      } catch (error) {
        console.error(`Error processing batch ${batchNum + 1}:`, error);
        toast({
          title: `Lỗi ở batch ${batchNum + 1}`,
          description: "Có lỗi khi tạo câu hỏi, kết quả có thể không đầy đủ",
          variant: "destructive",
        });
      }
    }
    
    setProcessingStage("Đang hoàn thiện bài tập");
    // Process and set final questions
    processExtractedQuestions(allQuestions, exerciseData);
  };

  // Process questions in a single batch
  const processSingleBatch = async (exerciseData: Exercise, fileData: FileData) => {
    const allowReferences = exerciseData.allowReferences === true;
    const questionCount = exerciseData.questionCount || 10;
    
    setProcessingStage(allowReferences ? "Đang tạo câu hỏi mới" : "Đang trích xuất câu hỏi");
    
    // Check if we have any indication that this should be written questions
    let knownQuestionType: string | null = null;
    
    if (resolvedExerciseId) {
      try {
        const questionsKey = getExerciseQuestionsStorageKey(resolvedExerciseId);
        const cachedData = JSON.parse(localStorage.getItem(questionsKey) || "{}");
        if (cachedData && cachedData.exerciseType === "written") {
          console.log("Using cached question type (written) for prompt generation");
          knownQuestionType = "written";
        }
      } catch (error) {
        console.error("Error checking cached question type:", error);
      }
    }
    
    // Select appropriate prompt based on known question type
    const extractionPrompt = 
      knownQuestionType === "written" ? createWrittenPrompt(questionCount) :
      allowReferences ? createReferencePrompt(questionCount) : 
      createExtractionPrompt(questionCount);

    setExtractionProgress(60);

    const effectiveModelId = exerciseData.model?.id || "gemini-2.0-flash";
    const systemPrompt = exerciseData.prompt || undefined;

    setProcessingStage("Đang xử lý tài liệu với AI");
    const extractionResult = await processFileWithGemini(
      extractionPrompt,
      fileData,
      effectiveModelId,
      systemPrompt
    );

    setExtractionProgress(80);
    setProcessingStage("Đang phân tích câu hỏi");
    
    const questions = extractQuestionsFromResponse(extractionResult);
    
    // Force question type consistency if we know what it should be
    if (knownQuestionType === "written" && questions.length > 0) {
      questions.forEach(q => {
        q.type = "written";
        if (!q.correctAnswer) q.correctAnswer = "Unknown";
        if (!Array.isArray(q.options)) q.options = [];
      });
    }
    
    if (questions.length > 0) {
      setQuestionProgress({ 
        current: questions.length, 
        total: questionCount 
      });
    }
    
    setProcessingStage("Đang hoàn thiện bài tập");
    setExtractionProgress(90);
    processExtractedQuestions(questions, exerciseData);
  };
  
  // New function specifically for written prompts
  const createWrittenPrompt = (questionCount: number) => {
    return `
      CHẾ ĐỘ TẠO BÀI TẬP TỰ LUẬN VIẾT DỰA TRÊN TÀI LIỆU

      PHÂN LOẠI VÀ YÊU CẦU:
      - Câu hỏi tự luận viết là câu hỏi YÊU CẦU TRẢ LỜI NGẮN GỌN (1-5 từ, một câu, định nghĩa, công thức).
      - Không có lựa chọn đáp án A, B, C, D.
      - Thường có dấu gạch dưới: "___", chỗ trống: "(...)", hoặc ô vuông để điền.
      - Thường có từ khóa: "Điền", "Viết công thức", "Nêu định nghĩa", "Cho biết tên", "Tính giá trị".
      - Đáp án mong đợi: từ đơn, cụm từ ngắn, số, công thức đơn giản.
      - Có thể trả lời trực tiếp bằng văn bản trong ô input.
      
      BƯỚC 1: PHÂN TÍCH TÀI LIỆU
      - Đọc hiểu toàn bộ nội dung tài liệu đính kèm.
      - Xác định các khái niệm chính, định nghĩa, công thức, thuật ngữ quan trọng.
      - Xác định ngôn ngữ chính của tài liệu (tiếng Việt, tiếng Anh, v.v.).
      
      BƯỚC 2: TẠO CÂU HỎI
      - Tạo CHÍNH XÁC ${Math.min(questionCount, 20)} câu hỏi tự luận viết từ tài liệu.
      - Câu hỏi phải đơn giản, rõ ràng và có thể trả lời bằng từ đơn hoặc câu ngắn.
      - Phân bổ câu hỏi đều khắp nội dung tài liệu, không tập trung một chỗ.
      - Mỗi câu hỏi phải có một đáp án chuẩn rõ ràng.
      
      BƯỚC 3: ĐỊNH DẠNG BẮT BUỘC
      Trả về mảng các câu hỏi với định dạng:
      [
        {
          "id": "q1",
          "text": "Điền vào chỗ trống: Quang hợp là quá trình ___",
          "options": [],
          "type": "written",
          "correctAnswer": "chuyển hóa năng lượng ánh sáng thành năng lượng hóa học"
        },
        {
          "id": "q2",
          "text": "Viết công thức của nước:",
          "options": [],
          "type": "written",
          "correctAnswer": "H2O"
        }
      ]
      
      LƯU Ý:
      - BẮT BUỘC thêm trường "type": "written" cho mỗi câu hỏi để phân biệt với trắc nghiệm.
      - BẮT BUỘC để options là mảng rỗng [] cho tất cả câu hỏi.
      - MỖI câu hỏi PHẢI có trường "correctAnswer" chứa đáp án chuẩn để chấm điểm.
      - TUYỆT ĐỐI KHÔNG tạo câu hỏi trắc nghiệm trong đề này.
    `;
  };

  // Extract questions from AI response
  const extractQuestionsFromResponse = (response: string): Question[] => {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;

      let extractedQuestions;
      try {
        extractedQuestions = JSON.parse(jsonString);
      } catch {
        console.log("Không thể phân tích JSON, coi như bài tập thực hành");
        return [];
      }

      if (Array.isArray(extractedQuestions) && extractedQuestions.length > 0) {
        return cleanQuestionsData(extractedQuestions);
      }
    } catch (err) {
      console.error("Không thể phân tích câu hỏi đã trích xuất:", err);
    }
    return [];
  };
  
  // Process extracted questions and set state - add better question type detection
  const processExtractedQuestions = (questions: Question[], exerciseData: Exercise) => {
    let processedQuestions = questions;
    
    if (!exerciseData.allowReferences && exerciseData?.questionCount && processedQuestions.length > exerciseData.questionCount) {
      processedQuestions = processedQuestions.slice(0, exerciseData.questionCount);
    }
    
    if (exerciseData?.shuffleQuestions) {
      processedQuestions = shuffleQuestionsLogic(processedQuestions);
      // Only shuffle options for multiple choice questions, not for written questions
      const multipleChoiceQuestions = processedQuestions.filter(q => !q.type || q.type !== "written");
      if (multipleChoiceQuestions.length > 0) {
        processedQuestions = shuffleOptionsInQuestions(processedQuestions);
      }
    }

    // Detect question types with more emphasis on type field
    const hasExplicitWrittenType = processedQuestions.some(q => q.type === "written");
    const hasMultipleChoice = processedQuestions.filter(q => Array.isArray(q.options) && q.options.length >= 2).length > 0;
    
    // If we have mixed question types, prioritize the explicit type markers
    let exerciseType: ExerciseType;
    
    if (hasExplicitWrittenType) {
      // If any questions have explicit written type, make all of them written
      console.log("Setting exercise type to written based on type field");
      exerciseType = "written";
      // Ensure all questions have written type for consistency
      processedQuestions.forEach(q => {
        if (q.type !== "written") q.type = "written";
        if (!q.correctAnswer) q.correctAnswer = "Unknown";
      });
    } else if (hasMultipleChoice) {
      console.log("Setting exercise type to multiple-choice based on options");
      exerciseType = "multiple-choice";
      // Remove any type fields for consistency
      processedQuestions.forEach(q => {
        if (q.type === "written") delete q.type;
      });
    } else {
      // Fallback to essay if no clear question type
      console.log("Setting exercise type to essay as fallback");
      exerciseType = "essay";
    }

    // Save questions to localStorage with type information for future visits
    if (resolvedExerciseId && processedQuestions.length > 0) {
      try {
        const questionsKey = getExerciseQuestionsStorageKey(resolvedExerciseId);
        const dataToStore = {
          questions: processedQuestions,
          exerciseType: exerciseType,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(questionsKey, JSON.stringify(dataToStore));
        console.log(`Cached ${processedQuestions.length} questions of type ${exerciseType} for exercise ${resolvedExerciseId}`);
      } catch (error) {
        console.error("Error caching questions:", error);
      }
    }

    setQuestions(processedQuestions);
    setExerciseType(exerciseType);
  };
  
  // Trích xuất hoặc tạo câu hỏi từ tài liệu
  const extractQuestionsFromDocument = async (
    exerciseData: Exercise,
    preAttachedFile?: ExerciseFile,
    useCachedDocument = false
  ) => {
    try {
      setIsExtracting(true);
      setProcessingStage("Đang khởi tạo tài liệu");
      setExtractionProgress(5);

      if (!preAttachedFile) {
        toast({
          title: "Lỗi",
          description: "Không có tài liệu đính kèm cho bài tập này",
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
      setProcessingStage("Đang tải dữ liệu tài liệu");
      setExtractionProgress(10);

      if (
        useCachedDocument &&
        globalExerciseDocumentStore.exerciseId === exerciseData.id &&
        globalExerciseDocumentStore.documentData
      ) {
        console.log("Sử dụng dữ liệu tài liệu đã lưu");
        setProcessingStage("Đang chuẩn bị dữ liệu từ bộ nhớ đệm");
        setExtractionProgress(30);
        fileData = {
          mimeType: globalExerciseDocumentStore.documentType || "application/pdf",
          data: globalExerciseDocumentStore.documentData,
          fileName: preAttachedFile.name,
        };
        setDocumentContent({
          data: globalExerciseDocumentStore.documentData,
          mimeType: globalExerciseDocumentStore.documentType || "application/pdf",
          name: preAttachedFile.name,
        });
      } else {
        setProcessingStage("Đang tải nội dung tài liệu");
        setExtractionProgress(20);
        const response = await fetch(fileViewUrl);
        if (!response.ok) throw new Error(`Không thể tải nội dung tệp: ${response.statusText}`);

        setExtractionProgress(30);
        const fileBlob = await response.blob();
        setExtractionProgress(35);
        setProcessingStage("Đang xử lý dữ liệu tài liệu");
        const fileArrayBuffer = await fileBlob.arrayBuffer();
        setExtractionProgress(40);

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

        globalExerciseDocumentStore.exerciseId = exerciseData.id;
        globalExerciseDocumentStore.documentContent = "loaded";
        globalExerciseDocumentStore.documentName = preAttachedFile.name;
        globalExerciseDocumentStore.documentType = fileBlob.type || "application/octet-stream";
        globalExerciseDocumentStore.documentData = fileArrayBuffer;
      }
      
      setExtractionProgress(50);
      setProcessingStage("Đang phân tích tài liệu");

      const allowReferences = exerciseData.allowReferences === true;
      const questionCount = exerciseData.questionCount || 10;
      setQuestionProgress({ current: 0, total: questionCount });

      console.log("🔍 DEBUG: Exercise configuration:", {
        allowReferences: exerciseData.allowReferences,
        resolvedAllowReferences: allowReferences,
        questionCount: exerciseData.questionCount,
        resolvedQuestionCount: questionCount,
        exerciseData: exerciseData
      });

      // Decide if we need batch processing - for both multiple choice AND written questions
      if (questionCount > 20) {
        setProcessingStage("Đang chuẩn bị tạo câu hỏi theo đợt");
        await processQuestionsInBatches(exerciseData, fileData, questionCount);
      } else {
        setProcessingStage("Đang tạo câu hỏi");
        await processSingleBatch(exerciseData, fileData);
      }

    } catch (err) {
      console.error("Lỗi khi trích xuất câu hỏi:", err);
      toast({
        title: "Lỗi",
        description: "Không thể trích xuất câu hỏi từ tài liệu",
        variant: "destructive",
      });
      setExerciseType("essay");
    } finally {
      setExtractionProgress(100);
      setProcessingStage("Hoàn tất");
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionProgress(0);
        setIsLoadingBatches(false);
        setBatchProgress({ current: 0, total: 0 });
        setQuestionProgress({ current: 0, total: 0 });
        setProcessingStage("Đang chuẩn bị");
      }, 500);
    }
  };

  // Create reference-based prompt (updated to better handle written questions)
  const createReferencePrompt = (questionCount: number) => {
    return `
      CHẾ ĐỘ TẠO BÀI TẬP MỚI DỰA TRÊN TÀI LIỆU THAM KHẢO

      BƯỚC 1: PHÂN LOẠI LOẠI BÀI TẬP 
      Phân tích tài liệu gốc để xác định loại BÀI TẬP dựa trên các tiêu chí sau (ưu tiên theo thứ tự):

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
        - Nếu không khớp với bất kỳ loại đề nào, trả về lỗi: "Không thể xác định loại BÀI TẬP từ tài liệu gốc."

      BƯỚC 2: TẠO BÀI TẬP MỚI CÙNG LOẠI
      Dựa trên loại BÀI TẬP được xác định, tạo BÀI TẬP mới cùng loại với nội dung khác nhưng cùng chủ đề và độ khó:

      A. NẾU LÀ ĐỀ TRẮC NGHIỆM:
      BƯỚC 1: PHÂN TÍCH CẤU TRÚC TÀI LIỆU
        - Đọc hiểu toàn bộ nội dung tài liệu.
        - Xác định xem tài liệu sử dụng ngôn ngữ nào (tiếng Việt, tiếng Anh, v.v.).
        - Xác định xem tài liệu thuộc chủ đề vi mô nào (vd: chiến tranh Tống - Việt, hiệu ứng quang điện,...) hay vĩ mô nào (vd: chiến tranh thế giới thứ 2, cơ học lượng tử,...).
        - Xác định xem tài liệu có chứa ĐOẠN VĂN kèm câu hỏi hay không (đoạn văn không phải câu hỏi).
        - Nếu có đoạn văn: lưu ý số lượng đoạn văn, độ dài mỗi đoạn văn (số từ hoặc số câu), và cách liên kết với câu hỏi.
        - Xác định xem tài liệu có chỉ chứa câu hỏi liên quan đến đoạn văn (tất cả câu hỏi đều có passage và groupId) hay không.

      BƯỚC 2: QUY TẮC TẠO ĐOẠN VĂN VÀ CÂU HỎI
      - Nếu tài liệu gốc CHỈ chứa câu hỏi liên quan đến đoạn văn: Tạo ${Math.min(questionCount, 20)} câu hỏi liên quan đến đoạn văn mới
      - Nếu tài liệu gốc CÓ đoạn văn kèm câu hỏi nhưng CŨNG có câu hỏi không liên quan: Tạo cân đối giữa hai loại, tổng số ${Math.min(questionCount, 20)} câu
      - Nếu tài liệu gốc KHÔNG có đoạn văn: Tạo ${Math.min(questionCount, 20)} câu hỏi đơn lẻ với "passage": null, "groupId": null

      BƯỚC 3: ĐỊNH DẠNG BẮT BUỘC
      Trả về mảng các câu hỏi với định dạng:
      [
        {
          "id": "q1",
          "text": "Câu hỏi...",
          "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
          "passage": "Đoạn văn tham khảo nếu có...",
          "groupId": "group1" 
        },
        ...
      ]
      
      LƯU Ý: 
      - Đảm bảo ${Math.min(questionCount, 20)} câu hỏi đều KHÁC NHAU và KHÁC với các câu đã tạo ở các batch trước.
      - Sử dụng prefixes id là "q1" để tránh trùng lặp ID với các batch khác.
      - Nội dung câu hỏi phải đơn giản, rõ ràng và phù hợp với nội dung tài liệu.
      - Đặt số lượng options (đáp án) từ 3-5 tùy theo nội dung câu hỏi.
    `;
  };
  
  // Create extraction prompt (updated to better handle written questions)
  const createExtractionPrompt = (questionCount: number) => {
    return `
      CHẾ ĐỘ TRÍCH XUẤT TỪ TÀI LIỆU CÓ SẴN

      BƯỚC 1: PHÂN LOẠI LOẠI BÀI TẬP 
      Phân tích tài liệu gốc để xác định loại BÀI TẬP dựa trên các tiêu chí sau (ưu tiên theo thứ tự):

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
        - Nếu không khớp với bất kỳ loại đề nào, trả về lỗi: "Không thể xác định loại BÀI TẬP từ tài liệu gốc."

      BƯỚC 2: TRÍCH XUẤT CÂU HỎI
        - Nếu tài liệu có ít hơn ${Math.min(questionCount, 20)} câu hỏi: trích xuất TẤT CẢ câu hỏi có sẵn.
        - Nếu tài liệu có từ ${Math.min(questionCount, 20)} câu hỏi trở lên: trích xuất CHÍNH XÁC ${Math.min(questionCount, 20)} câu hỏi đầu tiên.
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
              "type": "written",
              "correctAnswer": "Đáp án gợi ý để chấm điểm (trích xuất từ đáp án có sẵn nếu có)"
            }
          ]
        - BẮT BUỘC thêm trường "type": "written" cho mỗi câu hỏi viết để phân biệt với trắc nghiệm.
        - Cố gắng trích xuất correctAnswer nếu có sẵn trong tài liệu để hỗ trợ việc chấm điểm.

      C. NẾU LÀ ĐỀ TỰ LUẬN THỰC HÀNH:
        - Trả về mảng rỗng vì tự luận không hiển thị câu hỏi cụ thể.
        - Định dạng: []      
        
      BƯỚC 4: QUY TẮC CHUNG
        - Ngôn ngữ đồng nhất với tài liệu gốc.
        - Đảm bảo đoạn văn (nếu có) được gán đúng groupId cho trắc nghiệm.
    `;
  };

  // Logic hiển thị
  if (isLoading || checkingResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
        <LoadingSpinner />
        <h2 className="text-lg font-medium">{processingStage}</h2>
        <div className="w-full max-w-md">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">{extractionProgress}%</span>
            <span className="text-sm font-medium text-muted-foreground">Đang xử lý tài liệu</span>
          </div>
          <Progress value={extractionProgress} max={100} className="h-2" />
        </div>
        <p className="text-sm text-muted-foreground">Vui lòng đợi trong giây lát</p>
      </div>
    );
  }
  
  if (isLoadingBatches) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <LoadingSpinner />
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
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            Vui lòng không đóng trang hoặc tải lại trang.
          </p>
        </div>
      </div>
    );
  }

  if (submittedResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={() => router.push("/exercises")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-lg font-semibold">{exerciseData?.name || "Bài tập"}</h1>
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
              Điểm số của bạn: <span className="text-3xl font-extrabold">
                {submittedResult.score !== null ? submittedResult.score.toFixed(1) : "N/A"}
              </span>
            </p>
            <Button onClick={() => router.push("/exercises")}>
              Quay lại danh sách bài tập
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (exerciseType === "multiple-choice") {
    return (
      <MultipleChoiceExerciseTakingPage
        exercise={exerciseData}
        questions={questions}
        exerciseFileUrl={exerciseFileUrl}
        documentContent={documentContent}
        timeLeft={null}
        totalTime={null}
        clearSession={clearSession}
        resolvedExerciseId={resolvedExerciseId}
        isLoadingBatches={isLoadingBatches}
        batchProgress={batchProgress}
        questionProgress={questionProgress}
        processingStage={processingStage}
      />
    );
  }

  if (exerciseType === "written") {
    return (
      <WrittenExerciseTakingPage
        exercise={exerciseData || null}
        questions={questions}
        exerciseFileUrl={exerciseFileUrl}
        documentContent={documentContent}
        timeLeft={null}
        totalTime={null}
        clearSession={clearSession}
        resolvedExerciseId={resolvedExerciseId}
      />
    );
  }

  if (exerciseType === "essay") {
    return (
      <EssayExerciseTakingPage
        exercise={exerciseData || undefined}
        exerciseFileUrl={exerciseFileUrl}
        documentContent={documentContent}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner />
    </div>
  );
};