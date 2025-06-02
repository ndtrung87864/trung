"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { sendMessageToGemini } from "@/lib/gemini_google";

interface ExamSupportChatProps {
  examId: string;
  examName: string;
  modelId: string;
  examData: {
    examType?: string;
    isEssayType?: boolean;
    score?: number;
    duration?: string;
    createdAt?: string | Date;
    answers?: Array<{
      type?: string;
      score?: number;
      maxScore?: number;
      percentage?: number;
      status?: string;
      question?: {
        type?: string;
        text?: string;
        options?: string[];
        correctAnswer?: string;
        explanation?: string;
      };
      answer?: string;
      evaluation?: string;
      strengths?: string;
      improvements?: string;
      analysis?: string;
      feedback?: string;
      userAnswer?: string;
      fileUrl?: string;
      examFileUrl?: string;
      explanation?: string;
    }>;
    examFileUrl?: string;
  };
}


export const ExamSupportChat = ({ 
  examName, 
  modelId,
  examData
}: ExamSupportChatProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ content: string; role: "user" | "ai"; timestamp: Date }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getWelcomeMessage = () => {
      let welcomeContent = `Xin chào! Tôi là trợ lý học tập AI. Tôi có thể giúp bạn hiểu rõ hơn về bài kiểm tra "${examName}" mà bạn vừa hoàn thành.`;

      // Customize welcome message based on exam type
      if (examData?.examType === 'written' || (examData?.answers && Array.isArray(examData.answers) && examData.answers.some((a: { type?: string }) => a.type === 'written'))) {
        welcomeContent += `\n\nĐây là bài kiểm tra tự luận với ${Array.isArray(examData.answers) ? examData.answers.length : 0} câu hỏi. Bạn có thể hỏi tôi về:
        - Phân tích chi tiết câu trả lời của bạn
        - Cách cải thiện kỹ thuật viết và diễn đạt
        - Giải thích tiêu chí chấm điểm cho từng câu
        - Gợi ý cách mở rộng và hoàn thiện câu trả lời
        - Phương pháp làm bài tự luận hiệu quả`;
      } else if (examData?.isEssayType) {
        welcomeContent += `\n\nĐây là bài kiểm tra thực hành. Bạn có thể hỏi tôi về:
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
      return welcomeContent;
    };

    const welcomeMessage = {
      content: getWelcomeMessage(),
      role: "ai" as const,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [examName, examData]);

  // Set up custom system prompt based on exam data
  const getSystemPrompt = () => {
    let prompt = `Bạn là trợ lý giáo dục, giúp học sinh hiểu rõ hơn về bài kiểm tra họ vừa làm. Bài kiểm tra có tên: "${examName}".`;

    // Add comprehensive exam information
    if (examData) {
      prompt += `\n\nTHÔNG TIN TỔNG QUAN VỀ BÀI KIỂM TRA:
      - Tên bài kiểm tra: ${examName}
      - Điểm số đạt được: ${Number(examData.score)}/10
      - Loại bài kiểm tra: ${examData.isEssayType ? 'Tự luận/Thực hành' : examData.examType === 'written' ? 'Tự luận viết' : 'Trắc nghiệm'}
      - Thời gian làm bài: ${examData.duration || 'Không giới hạn'}
      - Ngày làm bài: ${examData.createdAt ? new Date(examData.createdAt).toLocaleDateString('vi-VN') : 'Không xác định'}`;

      // Handle written exam type (tự luận viết)
      if (examData.examType === 'written' 
        || (examData.answers && Array.isArray(examData.answers) 
        && examData.answers.some((a: {
          type?: string;
          question?: { type?: string };
        }) => a.type === 'written' || (a.question && a.question.type === 'written')))) {
        prompt += `\n\nTHÔNG TIN CHI TIẾT VỀ BÀI TỰ LUẬN VIẾT:`;

        // Add exam statistics
        const writtenAnswers = Array.isArray(examData.answers) ? examData.answers : [];
        const totalQuestions = writtenAnswers.length;
        const totalScore = writtenAnswers.reduce(
          (sum: number, answer: { score?: number }) => sum + (answer.score || 0),
          0
        );
        const averageScore = totalQuestions > 0 ? (totalScore / totalQuestions).toFixed(2) : '0.00';

        prompt += `\n- Tổng số câu hỏi tự luận: ${totalQuestions}
        - Tổng điểm đạt được: ${totalScore.toFixed(2)}/${totalQuestions * (10 / totalQuestions)}
        - Điểm trung bình mỗi câu: ${averageScore}
        - Tỷ lệ hoàn thành: ${Math.round((Number(examData.score) / 10) * 100)}%`;

        prompt += `\n\nCHI TIẾT TỪNG CÂU HỎI VÀ CÂU TRẢ LỜI:`;
        
        type WrittenAnswer = {
          type?: string;
          score?: number;
          maxScore?: number;
          percentage?: number;
          status?: string;
          question?: {
            type?: string;
            text?: string;
            options?: string[];
            correctAnswer?: string;
            explanation?: string;
          };
          answer?: string;
          evaluation?: string;
          strengths?: string;
          improvements?: string;
          analysis?: string;
          feedback?: string;
          userAnswer?: string;
          fileUrl?: string;
          examFileUrl?: string;
          explanation?: string;
        };

        writtenAnswers.forEach((answer: WrittenAnswer, index: number) => {
          const questionScore = answer.score || 0;
          const maxScore = answer.maxScore || (10 / totalQuestions);
          const percentage = answer.percentage || 0;
          const status = answer.status || 'unanswered';

          prompt += `\n\nCÂU ${index + 1}:
          Câu hỏi: ${answer.question || 'Không có thông tin câu hỏi'}
          Câu trả lời của học sinh: ${answer.answer || 'Học sinh chưa trả lời'}
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

          // Add any additional feedback
          if (answer.feedback && answer.feedback !== answer.evaluation) {
            prompt += `\nNhận xét bổ sung: ${answer.feedback}`;
          }
        });

        // Add guidance for written exam support
        prompt += `\n\nHƯỚNG DẪN HỖ TRỢ CHO BÀI TỰ LUẬN VIẾT:
        1. Sử dụng thông tin câu hỏi và câu trả lời cụ thể để đưa ra phản hồi chính xác
        2. Giải thích chi tiết về cách cải thiện câu trả lời dựa trên điểm yếu đã được chỉ ra
        3. Phân tích kỹ thuật viết, cách trình bày ý tưởng và logic trong câu trả lời
        4. Đưa ra gợi ý cụ thể về cách mở rộng hoặc hoàn thiện câu trả lời
        5. Giải thích tiêu chí chấm điểm và lý do cho từng mức điểm
        6. Hướng dẫn cách viết câu trả lời hiệu quả hơn cho các câu hỏi tương tự
        7. Khuyến khích học sinh phát triển kỹ năng tư duy phản biện và diễn đạt
        8. Chỉ hỗ trợ hiểu bài và cải thiện, không viết bài hộ học sinh`;

      }
      // Add detailed exam content and results for essay type
      else if (examData.isEssayType && Array.isArray(examData.answers) && examData.answers.length > 0) {
        const essayAnswer = examData.answers[0];

        // Add file URLs if available
        if (essayAnswer.fileUrl) {
          prompt += `\n\nBài làm tự luận của học sinh:
          - URL bài làm: ${essayAnswer.fileUrl}`;
        }

        // Add exam file URL if available (may be in different locations depending on your data structure)
        if (essayAnswer.examFileUrl) {
          prompt += `\n- URL đề bài: ${essayAnswer.examFileUrl}`;
        } else if (examData.examFileUrl) {
          prompt += `\n- URL đề bài: ${examData.examFileUrl}`;
        }

        // Extract detailed scoring from feedback if available
        if (essayAnswer.feedback) {
          prompt += `\n\nNhận xét và thang điểm chi tiết:`;

          // Add the raw feedback first
          prompt += `\n\nNhận xét gốc:
          ${essayAnswer.feedback}`;

          // Extract and restructure the strengths with points
          prompt += `\n\nChi tiết điểm cộng:`;

          // Parse strengths and point values from feedback if available
          try {
            // Extract strengths section
            const strengthsMatch = essayAnswer.feedback.match(/(?:ĐIỂM MẠNH|ĐIỂM TÍCH CỰC|ƯU ĐIỂM):([\s\S]*?)(?=ĐIỂM YẾU|NHƯỢC ĐIỂM|ĐIỂM HẠN CHẾ|NHẬN XÉT|$)/i);
            if (strengthsMatch && strengthsMatch[1]) {
              const strengthsText = strengthsMatch[1].trim();
              const strengthItems = strengthsText.split(/[-•*]/).map(item => item.trim()).filter(item => item);
              
              strengthItems.forEach((item) => {
                // Try to extract point values using regex
                // const pointMatch = item.match(/\(\+?(\d+([.,]\d+)?)\s*(?:điểm)?\)/i);
                // const points = pointMatch ? parseFloat(pointMatch[1].replace(',', '.')) : 0;
                
                prompt += `\n- ${item}`;
              });

            }

            const weaknessesMatch = essayAnswer.feedback.match(/(?:ĐIỂM YẾU|NHƯỢC ĐIỂM|ĐIỂM HẠN CHẾ):([\s\S]*?)(?=NHẬN XÉT|$)/i);
            if (weaknessesMatch && weaknessesMatch[1]) {
              const weaknessesText = weaknessesMatch[1].trim();
              const weaknessItems = weaknessesText.split(/[-•*]/).map(item => item.trim()).filter(item => item);
              
              weaknessItems.forEach((item) => {
                // Try to extract point values using regex
                // const pointMatch = item.match(/\(-(\d+([.,]\d+)?)\s*(?:điểm)?\)/i);
                // const points = pointMatch ? parseFloat(pointMatch[1].replace(',', '.')) : 0;
                
                prompt += `\n- ${item}`;
              });

            }

            // Add calculated final score
            const finalScore = Number(examData.score) / 10;
            prompt += `\n\nĐiểm cuối cùng: ${finalScore.toFixed(1)}/10 điểm`;

          } catch (e) {
            console.error("Error parsing feedback for scoring details:", e);
            // If parsing fails, still include the raw feedback
            prompt += `\n(Không thể phân tích chi tiết điểm)`;
          }
        }
      }
      // For multiple choice exams, add validation for potential matching answer errors
      else if (!examData.isEssayType && Array.isArray(examData.answers) && examData.answers.length > 0) {
        prompt += `\n\nĐề bài đầy đủ:`;
        examData.answers.forEach((answer: {
          type?: string;
          score?: number;
          maxScore?: number;
          percentage?: number;
          status?: string;
          question?: {
            type?: string;
            text?: string;
            options?: string[];
            correctAnswer?: string;
            explanation?: string;
          };
          answer?: string;
          evaluation?: string;
          strengths?: string;
          improvements?: string;
          analysis?: string;
          feedback?: string;
          userAnswer?: string;
          fileUrl?: string;
          examFileUrl?: string;
          explanation?: string;
        }, index: number) => {
          if (answer.question?.text) {
            prompt += `\nCâu ${index + 1}: ${answer.question.text}`;
            // Include options if available
            if (Array.isArray(answer.question.options)) {
              answer.question.options.forEach((option: string, optIndex: number) => {
                prompt += `\n  ${String.fromCharCode(65 + optIndex)}. ${option}`;
              });
            }
            prompt += '\n';
          }
        });

        // Add information about specific questions if available
        prompt += `\n\nChi tiết câu hỏi và đáp án:`;
        examData.answers.forEach((answer: {
          type?: string;
          score?: number;
          maxScore?: number;
          percentage?: number;
          status?: string;
          question?: {
            type?: string;
            text?: string;
            options?: string[];
            correctAnswer?: string;
            explanation?: string;
          };
          answer?: string;
          evaluation?: string;
          strengths?: string;
          improvements?: string;
          analysis?: string;
          feedback?: string;
          userAnswer?: string;
          fileUrl?: string;
          examFileUrl?: string;
          explanation?: string;
        }, index: number) => {
          if (answer.question?.text) {
            prompt += `\nCâu ${index + 1}: ${answer.question.text}`;
            prompt += `\nĐáp án của học sinh: ${answer.userAnswer || "Không trả lời"}`;

            // Add correct answer info for validation
            if (answer.question.correctAnswer) {
              prompt += `\nĐáp án đúng: ${answer.question.correctAnswer}`;
            }

            // Check for potential error in grading: answer matches but marked incorrect
            let potentialError = false;
            if (answer.status === 'incorrect' && answer.userAnswer && answer.question.correctAnswer) {
              // Normalize both answers for comparison (trim, lowercase)
              const normalizedUserAnswer = answer.userAnswer.trim().toLowerCase();
              const normalizedCorrectAnswer = answer.question.correctAnswer.trim().toLowerCase();

              // Check if the answers match despite being marked incorrect
              if (normalizedUserAnswer === normalizedCorrectAnswer ||
                // Also check for letter/number format differences (e.g., "A" vs "1", "A." vs "A")
                normalizedUserAnswer.replace(/[^a-z0-9]/g, '') === normalizedCorrectAnswer.replace(/[^a-z0-9]/g, '')) {
                potentialError = true;
                prompt += `\nCHÚ Ý: Đáp án của học sinh dường như đúng nhưng bị đánh dấu là sai. 
                Hãy kiểm tra kĩ xem lựa chọn của học sinh có trùng với đáp án đúng không, nếu có sửa lại thành đúng .`;
              }
            }

            prompt += `\nTrạng thái: ${answer.status === 'correct'
              ? 'Đúng' : answer.status === 'incorrect' ? 'Sai' + (potentialError
                ? ' (Có thể lỗi chấm điểm)' : '') : 'Chưa trả lời'}`;

            if (answer.explanation) {
              prompt += `\nGiải thích: ${answer.explanation}`;
            }
            prompt += '\n';
          }
        });

        // Add a section on potential grading issues if any were found
        const potentialErrorAnswers = examData.answers.filter((answer: {
          type?: string;
          score?: number;
          maxScore?: number;
          percentage?: number;
          status?: string;
          question?: {
            type?: string;
            text?: string;
            options?: string[];
            correctAnswer?: string;
            explanation?: string;
          };
          answer?: string;
          evaluation?: string;
          strengths?: string;
          improvements?: string;
          analysis?: string;
          feedback?: string;
          userAnswer?: string;
          fileUrl?: string;
          examFileUrl?: string;
          explanation?: string;
        }) => {
          if (answer.status === 'incorrect' && answer.userAnswer && answer.question?.correctAnswer) {
            const normalizedUserAnswer = answer.userAnswer.trim().toLowerCase();
            const normalizedCorrectAnswer = answer.question.correctAnswer.trim().toLowerCase();
            return normalizedUserAnswer === normalizedCorrectAnswer ||
              normalizedUserAnswer.replace(/[^a-z0-9]/g, '') === normalizedCorrectAnswer.replace(/[^a-z0-9]/g, '');
          }
          return false;
        });

        if (potentialErrorAnswers.length > 0) {
          prompt += `\n\nLƯU Ý VỀ LỖI CHẤM ĐIỂM: Có ${potentialErrorAnswers.length} câu hỏi có thể đã bị chấm sai. Học sinh có thể đã chọn đáp án đúng nhưng hệ thống đã đánh dấu là sai. Hãy đặc biệt chú ý đến những câu này khi học sinh hỏi và giải thích rõ cho họ.`;
        }
      }
    } else {
      // Fallback if no exam data
      prompt += `\n\nKhông có thông tin chi tiết về bài kiểm tra. Vui lòng hỏi cụ thể về nội dung bạn muốn hiểu rõ hơn.`;
    }

    // Add general guidelines
    prompt += `\n\nQUY TẮC CHUNG:
    1. CHỈ trả lời các câu hỏi liên quan đến bài kiểm tra và học tập
    2. Sử dụng ngôn ngữ thân thiện, dễ hiểu và khuyến khích
    3. Đưa ra giải thích chi tiết và ví dụ cụ thể khi cần thiết
    4. Giúp học sinh hiểu nguyên lý, không chỉ ghi nhớ đáp án
    5. Khuyến khích tư duy phản biện và học tập chủ động
    6. Từ chối trả lời các câu hỏi không liên quan đến học tập
    7. Luôn tôn trọng và hỗ trợ tích cực cho quá trình học tập của học sinh
    8. Khi phân tích câu trả lời tự luận, tập trung vào nội dung, cách diễn đạt và logic trình bày`;

    return prompt;
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
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
      // Use the appropriate model ID or fallback to a default
      const effectiveModelId = modelId || 'gemini-2.0-flash';

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
        `Bạn là hệ thống kiểm tra tính liên quan của câu hỏi với bài kiểm tra "${examName}".
        
        THÔNG TIN BÀI KIỂM TRA:
        - Tên: ${examName}
        - Loại: ${examData?.isEssayType ? 'Tự luận/Thực hành' :
          examData?.examType === 'written' ? 'Tự luận viết' : 'Trắc nghiệm'}
        - Điểm số: ${examData?.score || 0}/10
        ${examData?.examType === 'written' 
        || (examData?.answers && Array.isArray(examData.answers)
         && examData.answers.some((a: {
          type?: string;
          question?: { type?: string };
        })  => a.type === 'written')) ? 
          `- Số câu tự luận: ${Array.isArray(examData.answers) ? examData.answers.length : 0}` : ''}
        
        LỊCH SỬ TRÒ CHUYỆN:
        ${conversationHistory.map(msg => `${msg.role === 'user' ? 'Học sinh' : 'Trợ lý'}: ${msg.content}`).join('\n\n')}
        
        Xác định xem câu hỏi mới nhất có liên quan đến:
        - Nội dung bài kiểm tra này
        - Câu hỏi/đáp án trong bài kiểm tra
        - Kỹ thuật viết và diễn đạt (đối với bài tự luận)
        - Cách cải thiện câu trả lời
        - Kiến thức học thuật liên quan
        - Phương pháp học tập và làm bài
        - Tiêu chí chấm điểm
        
        Nếu câu hỏi thuộc các chủ đề trên, trả lời "RELEVANT".
        Nếu câu hỏi về chuyện cá nhân, giải trí, hoặc không liên quan học tập, trả lời "IRRELEVANT".
        
        Chỉ trả lời một từ: "RELEVANT" hoặc "IRRELEVANT".`;

      const relevanceResponse = await sendMessageToGemini(
        relevanceCheckPrompt,
        effectiveModelId
      );

      // Check if the AI determined the question is irrelevant
      if (relevanceResponse.trim().toUpperCase().includes("IRRELEVANT")) {
        // If off-topic according to AI, create a standard refusal message
        const refusalMessage = {
          content: "Tôi không thể phục vụ mục đích này. Tôi chỉ có thể trả lời các câu hỏi liên quan đến bài kiểm tra và kiến thức học tập.",
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
      1. Thông tin chi tiết về bài kiểm tra và kết quả ở trên
      2. Lịch sử cuộc trò chuyện
      3. Ngữ cảnh học tập của học sinh
      
      Hãy trả lời câu hỏi mới nhất một cách mạch lạc, chi tiết và hữu ích. 
      Sử dụng thông tin cụ thể từ bài kiểm tra để đưa ra câu trả lời chính xác và có giá trị.`;

      // Send message to Gemini with conversation history
      // Format conversation history as a string for the fileName argument (or pass undefined if not needed)
      const conversationHistoryString = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'Học sinh' : 'Trợ lý'}: ${msg.content}`)
        .join('\n\n');

      const aiResponse = await sendMessageToGemini(
        userMessage.content,
        effectiveModelId,
        undefined,
        conversationHistoryString, // Pass as string, or undefined if not needed
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Trợ lý AI</span>
          <Badge variant="outline">
            {modelId ? modelId.replace('gemini-', 'Gemini ') : 'Gemini AI'}
          </Badge>
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
              placeholder="Nhập câu hỏi về bài kiểm tra..."
              className="min-h-[80px] max-h-[120px] pr-12 resize-none overflow-y-auto border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
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

export default ExamSupportChat;
