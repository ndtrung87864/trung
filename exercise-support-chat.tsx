"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { sendMessageToGemini } from "@/lib/gemini_google";

// Define more specific interfaces for answers and questions
interface QuestionObject {
  type?: string;
  text?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

interface AnswerObject {
  type?: string;
  question?: string | QuestionObject;
  userAnswer?: string;
  answer?: string;
  correctAnswer?: string;
  status?: string;
  explanation?: string;
  isCorrect?: boolean;
  score?: number;
  maxScore?: number;
  percentage?: number;
  feedback?: string;
  fileUrl?: string;
  evaluation?: string;
  strengths?: string;
  improvements?: string;
  analysis?: string;
}

interface Message {
  content: string;
  role: "user" | "ai";
  timestamp: Date;
}

interface ExerciseSupportChatProps {
  exerciseId: string;
  resultId: string;
  exerciseName: string;
  modelId?: string;
  examData?: {
    exerciseType?: string;
    examName?: string;
    exerciseName?: string;
    score?: number;
    answers?: AnswerObject[];
    createdAt?: string;
    [key: string]: string | number | AnswerObject[] | undefined | unknown;
  };
}

export const ExerciseSupportChat = ({
  exerciseId,
  resultId,
  exerciseName,
  modelId = "gemini-2.0-flash",
  examData,
}: ExerciseSupportChatProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef(false);

  // Get the actual exercise name, using either examData.exerciseName or examData.examName as fallback
  const actualExerciseName = useMemo(() => {
    return examData?.exerciseName || examData?.examName || exerciseName;
  }, [examData, exerciseName]);

  // Define getWelcomeMessage outside of useEffect to fix dependency issues
  const getWelcomeMessage = useMemo(() => {
    return () => {
      let welcomeContent = `Xin chào! Tôi là trợ lý học tập AI. Tôi có thể giúp bạn hiểu rõ hơn về bài tập "${exerciseName}" mà bạn vừa hoàn thành.`;
      
   
      
      if (examData?.exerciseType === 'written' || 
        (examData?.answers && Array.isArray(examData.answers) && 
        examData.answers.some((a) => a.type === 'written'))) {
        welcomeContent += `\n\nĐây là bài tập tự luận với ${Array.isArray(examData.answers) ? examData.answers.length : 0} câu hỏi. Bạn có thể hỏi tôi về:
        - Phân tích chi tiết câu trả lời của bạn
        - Cách cải thiện kỹ thuật viết và diễn đạt
        - Giải thích tiêu chí chấm điểm cho từng câu
        - Gợi ý cách mở rộng và hoàn thiện câu trả lời
        - Phương pháp làm bài tự luận hiệu quả`;
      } else if (examData?.exerciseType === 'essay') {
        welcomeContent += `\n\nĐây là bài tập thực hành. Bạn có thể hỏi tôi về:
        - Giải thích chi tiết câu hỏi hoặc đáp án
        - Phân tích kết quả và feedback
        - Cách cải thiện kỹ năng thực hành`;
      } else {
        welcomeContent += `\n\nBạn có thể hỏi tôi về:
        - Giải thích chi tiết câu hỏi hoặc đáp án
        - Làm sáng tỏ các khái niệm liên quan
        - Gợi ý cách học tập hiệu quả hơn`;
      }

      welcomeContent += `\n\nHãy đặt câu hỏi của bạn!`;

      return {
        content: welcomeContent,
        role: "ai" as const,
        timestamp: new Date()
      };
    };
  }, [actualExerciseName, examData]);

  // Set up initial welcome message
  useEffect(() => {
    if (!initialMessageSent.current) {
      initialMessageSent.current = true;
      
      // Add welcome message
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
      
      // Try to load previous messages from local storage
      const storedMessages = localStorage.getItem(`exercise-support-${exerciseId}-${resultId}`);
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(prevMessages => {
              // Filter out welcome message when adding stored messages
              const filteredPrevMessages = prevMessages.filter(msg => 
                msg.content !== welcomeMessage.content);
              return [...filteredPrevMessages, ...parsedMessages];
            });
          }
        } catch (error) {
          console.error("Error parsing stored messages:", error);
        }
      }
    }
  }, [exerciseId, resultId, getWelcomeMessage]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && initialMessageSent.current) {
      // Skip saving welcome message alone
      const welcomeMessage = getWelcomeMessage();
      if (messages.length === 1 && messages[0].content === welcomeMessage.content) {
        return;
      }
      
      localStorage.setItem(`exercise-support-${exerciseId}-${resultId}`, JSON.stringify(messages));
    }
  }, [messages, exerciseId, resultId, getWelcomeMessage]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Set up custom system prompt based on exercise data
  const getSystemPrompt = () => {
    let prompt = `Bạn là trợ lý giáo dục, giúp học sinh hiểu rõ hơn về bài tập họ vừa làm. Bài tập có tên: "${actualExerciseName}".`;

    // Add comprehensive exercise information with safe access
    if (examData) {
      prompt += `\n\nTHÔNG TIN TỔNG QUAN VỀ BÀI TẬP:
      - Tên bài tập: ${actualExerciseName}
      - Điểm số đạt được: ${Number(examData.score || 0)}/10
      - Loại bài tập: ${examData.exerciseType || "Không xác định"} 
      - Ngày làm bài: ${examData.createdAt ? new Date(examData.createdAt).toLocaleDateString('vi-VN') : 'Không xác định'}`;

      // Handle written exercise type
      if (examData.exerciseType === 'written' || 
        (examData.answers && Array.isArray(examData.answers) && 
        examData.answers.some((a) => 
          a.type === 'written' || 
          (typeof a.question === 'object' && a.question?.type === 'written')))) {
        
        prompt += `\n\nTHÔNG TIN CHI TIẾT VỀ BÀI TỰ LUẬN:`;

        // Add exercise statistics
        const writtenAnswers = Array.isArray(examData.answers) ? examData.answers : [];
        const totalQuestions = writtenAnswers.length;
        const totalScore = writtenAnswers.reduce(
          (sum: number, answer) => sum + (answer.score || 0),
          0
        );
        const averageScore = totalQuestions > 0 ? (totalScore / totalQuestions).toFixed(2) : '0.00';

        prompt += `\n- Tổng số câu hỏi tự luận: ${totalQuestions}
        - Tổng điểm đạt được: ${totalScore.toFixed(2)}/${totalQuestions * (10 / totalQuestions)}
        - Điểm trung bình mỗi câu: ${averageScore}
        - Tỷ lệ hoàn thành: ${Math.round((Number(examData.score || 0) / 10) * 100)}%`;

        prompt += `\n\nCHI TIẾT TỪNG CÂU HỎI VÀ CÂU TRẢ LỜI:`;
        
        writtenAnswers.forEach((answer, index) => {
          const questionScore = answer.score || 0;
          const maxScore = answer.maxScore || (10 / totalQuestions);
          const percentage = answer.percentage || 0;
          const status = answer.status || 'unanswered';
          
          // Handle different question formats
          let questionText: string;
          if (typeof answer.question === 'string') {
            questionText = answer.question;
          } else if (typeof answer.question === 'object' && answer.question !== null) {
            questionText = answer.question.text || `Câu hỏi ${index + 1}`;
          } else {
            questionText = `Câu hỏi ${index + 1}`;
          }

          prompt += `\n\nCÂU ${index + 1}:
          Câu hỏi: ${questionText}
          Câu trả lời của học sinh: ${answer.answer || answer.userAnswer || 'Học sinh chưa trả lời'}
          Điểm số: ${questionScore.toFixed(1)}/${maxScore.toFixed(1)} điểm
          Tỷ lệ hoàn thành: ${percentage}%
          Trạng thái: ${status === 'correct' ? 'Xuất sắc (≥90%)' :
              status === 'partial' ? 'Khá (≥50%)' :
                percentage >= 30 ? 'Trung bình (≥30%)' : 'Yếu (<30%)'}`;

          // Add detailed evaluation if available
          if (answer.evaluation) {
            prompt += `\nĐánh giá chi tiết: ${answer.evaluation}`;
          }

          if (answer.strengths) {
            prompt += `\nĐiểm mạnh: ${answer.strengths}`;
          }

          if (answer.improvements) {
            prompt += `\nĐiểm cần cải thiện: ${answer.improvements}`;
          }

          if (answer.analysis) {
            prompt += `\nPhân tích: ${answer.analysis}`;
          }

          // Add explanation or additional feedback
          if (answer.explanation) {
            prompt += `\nGiải thích: ${answer.explanation}`;
          }

          if (answer.feedback && answer.feedback !== answer.evaluation) {
            prompt += `\nNhận xét bổ sung: ${answer.feedback}`;
          }
        });

        // Add guidance for written exercise support
        prompt += `\n\nHƯỚNG DẪN HỖ TRỢ CHO BÀI TẬP TỰ LUẬN:
        1. Sử dụng thông tin câu hỏi và câu trả lời cụ thể để đưa ra phản hồi chính xác
        2. Giải thích chi tiết về cách cải thiện câu trả lời dựa trên điểm yếu đã được chỉ ra
        3. Phân tích kỹ thuật viết, cách trình bày ý tưởng và logic trong câu trả lời
        4. Đưa ra gợi ý cụ thể về cách mở rộng hoặc hoàn thiện câu trả lời
        5. Giải thích tiêu chí chấm điểm và lý do cho từng mức điểm
        6. Hướng dẫn cách viết câu trả lời hiệu quả hơn cho các câu hỏi tương tự
        7. Khuyến khích học sinh phát triển kỹ năng tư duy phản biện và diễn đạt
        8. Chỉ hỗ trợ hiểu bài và cải thiện, không viết bài hộ học sinh`;
      }
      // Add detailed content for essay type exercises
      else if (examData.exerciseType === 'essay' && Array.isArray(examData.answers) && examData.answers.length > 0) {
        const essayAnswer = examData.answers[0];

        // Add file URLs if available
        if (essayAnswer.fileUrl) {
          prompt += `\n\nBài làm của học sinh:
          - URL bài làm: ${essayAnswer.fileUrl}`;
        }

        // Add feedback if available
        if (essayAnswer.feedback) {
          prompt += `\n\nNhận xét và thang điểm chi tiết:
          ${essayAnswer.feedback}`;
        }
      }
      // For multiple choice exercises
      else if ((examData.exerciseType === 'multiple-choice' || !examData.exerciseType) && Array.isArray(examData.answers)) {
        prompt += `\n\nChi tiết câu hỏi và đáp án:`;

        // Calculate statistics
        const totalQuestions = examData.answers.length;
        const correctCount = examData.answers.filter((a) => 
          a.status === 'correct' || a.isCorrect === true
        ).length;
        const incorrectCount = examData.answers.filter((a) => 
          a.status === 'incorrect' || (a.isCorrect === false && a.userAnswer)
        ).length;
        const unansweredCount = examData.answers.filter((a) => 
          a.status === 'unanswered' || (!a.userAnswer && a.isCorrect !== true)
        ).length;

        // Add statistics
        prompt += `\n\nTHỐNG KÊ KẾT QUẢ:
        - Tổng số câu hỏi: ${totalQuestions}
        - Số câu trả lời đúng: ${correctCount} (${totalQuestions > 0 ? Math.round(correctCount/totalQuestions*100) : 0}%)
        - Số câu trả lời sai: ${incorrectCount} (${totalQuestions > 0 ? Math.round(incorrectCount/totalQuestions*100) : 0}%)
        - Số câu chưa trả lời: ${unansweredCount} (${totalQuestions > 0 ? Math.round(unansweredCount/totalQuestions*100) : 0}%)`;

        prompt += `\n\nCHI TIẾT TỪNG CÂU HỎI:`;

        examData.answers.forEach((answer, index) => {
          let questionText = '';
          let userAnswer = '';
          let correctAnswer = '';
          let explanation = '';
          let status = '';
          
          // Extract data based on different possible structures
          if (typeof answer.question === 'string') {
            questionText = answer.question;
          } else if (typeof answer.question === 'object' && answer.question?.text) {
            questionText = answer.question.text;
          } else {
            questionText = `Câu hỏi ${index + 1}`;
          }
          
          userAnswer = answer.userAnswer || answer.answer || 'Không có đáp án';
          
          if (typeof answer.correctAnswer === 'string') {
            correctAnswer = answer.correctAnswer;
          } else if (typeof answer.question === 'object' && typeof answer.question?.correctAnswer === 'string') {
            correctAnswer = answer.question.correctAnswer;
          } else {
            correctAnswer = 'Không có thông tin';
          }
          
          if (typeof answer.explanation === 'string') {
            explanation = answer.explanation;
          } else if (typeof answer.question === 'object' && typeof answer.question?.explanation === 'string') {
            explanation = answer.question.explanation;
          } else {
            explanation = 'Không có giải thích';
          }
          
          // Determine status based on available fields
          if (answer.status) {
            status = answer.status;
          } else if (typeof answer.isCorrect === 'boolean') {
            status = answer.isCorrect ? 'correct' : 'incorrect';
          } else {
            status = userAnswer === correctAnswer ? 'correct' : 'incorrect';
          }
          
          prompt += `\n\nCâu ${index + 1}: ${questionText}`;
          prompt += `\nĐáp án của học sinh: ${userAnswer}`;
          prompt += `\nĐáp án đúng: ${correctAnswer}`;
          prompt += `\nTrạng thái: ${status === 'correct' ? 'Đúng' : status === 'unanswered' ? 'Chưa trả lời' : 'Sai'}`;
          
          if (explanation && explanation !== 'Không có giải thích') {
            prompt += `\nGiải thích: ${explanation}`;
          }
        });
      }
    } else {
      // Fallback if no exercise data
      prompt += `\n\nKhông có thông tin chi tiết về bài tập. Vui lòng hỏi cụ thể về nội dung bạn muốn hiểu rõ hơn.`;
    }

    // Add general guidelines
    prompt += `\n\nQUY TẮC CHUNG:
    1. CHỈ trả lời các câu hỏi liên quan đến bài tập và học tập
    2. Sử dụng ngôn ngữ thân thiện, dễ hiểu và khuyến khích
    3. Đưa ra giải thích chi tiết và ví dụ cụ thể khi cần thiết
    4. Giúp học sinh hiểu nguyên lý, không chỉ ghi nhớ đáp án
    5. Khuyến khích tư duy phản biện và học tập chủ động
    6. Từ chối trả lời các câu hỏi không liên quan đến học tập
    7. Luôn tôn trọng và hỗ trợ tích cực cho quá trình học tập của học sinh`;

    return prompt;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      content: input.trim(),
      role: "user" as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Format conversation history for the AI
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add current user message to the history
      conversationHistory.push({
        role: "user",
        content: userMessage.content
      });

      // Include conversation history context in the relevance check
      const relevanceCheckPrompt =
        `Bạn là hệ thống kiểm tra tính liên quan của câu hỏi với bài tập "${actualExerciseName}".
        
        THÔNG TIN BÀI TẬP:
        - Tên: ${actualExerciseName}
        - Loại: ${examData?.exerciseType || "Không xác định"}
        - Điểm số: ${examData?.score || 0}/10
        
        LỊCH SỬ TRÒ CHUYỆN:
        ${conversationHistory.map(msg => `${msg.role === 'user' ? 'Học sinh' : 'Trợ lý'}: ${msg.content}`).join('\n\n')}
        
        Xác định xem câu hỏi mới nhất có liên quan đến:
        - Nội dung bài tập này
        - Câu hỏi/đáp án trong bài tập
        - Kỹ thuật viết và diễn đạt (đối với bài tự luận)
        - Cách cải thiện câu trả lời
        - Kiến thức học thuật liên quan
        - Phương pháp học tập và làm bài
        - Tiêu chí chấm điểm
        
        CÁC VẤN ĐỀ KHÔNG ĐƯỢC PHÉP TRẢ LỜI:
        1. Câu hỏi cá nhân không liên quan đến bài tập
        2. Những yêu cầu viết hộ bài, làm hộ bài tập khác
        3. Câu hỏi về chủ đề không liên quan đến học tập
        4. Yêu cầu viết mã, code không liên quan đến bài tập hiện tại
        5. Câu hỏi về chủ đề nhạy cảm, chính trị, giải trí
        6. Câu hỏi về bài tập khác không phải "${actualExerciseName}"
        7. Yêu cầu tạo nội dung không liên quan đến bài tập
        
        Nếu câu hỏi thuộc các chủ đề trên, trả lời "RELEVANT".
        Nếu câu hỏi về chuyện cá nhân, giải trí, hoặc không liên quan học tập, trả lời "IRRELEVANT".
        
        Chỉ trả lời một từ: "RELEVANT" hoặc "IRRELEVANT".`;

      // Use the model specified or fallback to a default
      const effectiveModelId = modelId || 'gemini-2.0-flash';

      const relevanceResponse = await sendMessageToGemini(
        relevanceCheckPrompt,
        effectiveModelId
      );

      // Check if the AI determined the question is irrelevant
      if (relevanceResponse.trim().toUpperCase().includes("IRRELEVANT")) {
        // If off-topic according to AI, create a standard refusal message
        const refusalMessage = {
          content: "Tôi không thể phục vụ mục đích này. Tôi chỉ có thể trả lời các câu hỏi liên quan đến bài tập và kiến thức học tập.",
          role: "ai" as const,
          timestamp: new Date()
        };

        // Add the refusal message and return early
        setMessages(prev => [...prev, refusalMessage]);
        setIsLoading(false);
        return;
      }

      // For on-topic questions, proceed with normal handling
      const systemPrompt = getSystemPrompt() + `\n\nBỐI CẢNH CUỘC TRÒ CHUYỆN:
      ${conversationHistory.slice(0, -1).map((msg, index) =>
        `[${index + 1}] ${msg.role === 'user' ? 'Học sinh' : 'Trợ lý AI'}: ${msg.content}`
      ).join('\n\n')}
      
      Dựa vào:
      1. Thông tin chi tiết về bài tập và kết quả ở trên
      2. Lịch sử cuộc trò chuyện
      3. Ngữ cảnh học tập của học sinh
      
      Hãy trả lời câu hỏi mới nhất một cách mạch lạc, chi tiết và hữu ích. 
      Sử dụng thông tin cụ thể từ bài tập để đưa ra câu trả lời chính xác và có giá trị.`;

      // Format conversation history as a string for the fileName argument (or pass undefined if not needed)
      const conversationHistoryString = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'Học sinh' : 'Trợ lý'}: ${msg.content}`)
        .join('\n\n');

      const aiResponse = await sendMessageToGemini(
        userMessage.content,
        effectiveModelId,
        undefined,
        conversationHistoryString,
        systemPrompt
      );

      const aiMessage = {
        content: aiResponse,
        role: "ai" as const,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      toast({
        title: "Lỗi kết nối",
        description: "Không thể kết nối với trợ lý AI. Vui lòng thử lại sau.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    // Keep only the welcome message
    const welcomeMessage = getWelcomeMessage();
    setMessages([welcomeMessage]);
    // Clear localStorage
    localStorage.removeItem(`exercise-support-${exerciseId}-${resultId}`);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Trợ lý AI</span>
          <div className="flex gap-2">
            <Badge variant="outline" onClick={clearConversation} className="cursor-pointer hover:bg-slate-100">
              Xóa hội thoại
            </Badge>
            <Badge variant="outline">
              {modelId ? modelId.replace('gemini-', 'Gemini ') : 'Gemini AI'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        {/* Messages area with enhanced styling */}
        <div className="flex-1 px-4 py-2 overflow-y-auto scrollbar-hide bg-zinc-50 dark:bg-zinc-900/30">
          <div className="flex flex-col gap-4 pb-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: (props) => (
                        <p className="prose dark:prose-invert max-w-none whitespace-pre-wrap break-words text-sm" {...props} />
                      ),
                      a: (props) => (
                        <a className="text-blue-500 hover:underline" {...props} />
                      ),
                      ul: (props) => (
                        <ul className="list-disc pl-4 my-2" {...props} />
                      ),
                      ol: (props) => (
                        <ol className="list-decimal pl-4 my-2" {...props} />
                      ),
                      li: (props) => (
                        <li className="my-1" {...props} />
                      ),
                      code: (props) => {
                        const { inline, ...rest } = props as { inline?: boolean } & React.HTMLAttributes<HTMLElement>;
                        return inline 
                          ? <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...rest} />
                          : <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto my-2" {...rest} />;
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-bl-sm shadow-sm max-w-[85%]">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">AI đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Enhanced input area */}
        <div className="p-4 flex-shrink-0 bg-white dark:bg-gray-800 border-t">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi về bài tập..."
              className="min-h-[80px] max-h-[120px] pr-12 resize-none overflow-y-auto border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              className="absolute bottom-2 right-2 w-10 h-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700"
              size="icon"
              disabled={isLoading}
            >
              <SendHorizontal size={18} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
