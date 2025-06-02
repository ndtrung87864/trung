"use client";

import React, { useEffect, useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Paperclip, File, X, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { 
  sendMessageToGemini, 
  FileData, 
  startNewChat, 
  changeModel,
  processFileWithGemini,
  initializeAgentWithPrompt
} from "@/lib/gemini_google";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExamChatProps {
    exam: {
        id: string;
        name: string;
        description: string | null;
        prompt: string | null;
        model: {
            id: string;
            name: string;
        };
        files?: {
            id: string;
            name: string;
            url: string;
        }[];
    };
    serverId: string;
    profileId: string;
    fieldId?: string;
}

type Sender = "user" | "bot" | "system";

interface Message {
    text: string;
    sender: Sender;
    timestamp: Date;
}

interface ExamSession {
    id: string;
    examId: string;
    profileId: string;
    messages: Message[];
    modelId: string;
    fieldId?: string;
    startTime: Date;
    status: "ongoing" | "completed";
    score?: number;
}

const SUPPORTED_FILE_TYPES = {
    "application/pdf": "PDF",
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/heic": "HEIC",
    "text/plain": "TXT",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ExamChat: React.FC<ExamChatProps> = ({ exam, serverId, profileId, fieldId }) => {
    const [session, setSession] = useState<ExamSession | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentFile, setCurrentFile] = useState<{ name: string; size: number; type: string; data: FileData } | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fieldId_Props = fieldId;;

    // Initialize exam session
    useEffect(() => {
        const loadOrCreateSession = async () => {
            try {
                // Kiểm tra nếu đã có phiên làm bài
                const response = await axios.get(`/api/exam-sessions?examId=${exam.id}&profileId=${profileId}`);

                if (response.data && response.data.length > 0) {
                    // Nếu có phiên làm bài cũ, load lên
                    const existingSession = response.data[0];
                    setSession({
                        ...existingSession,
                        messages: JSON.parse(existingSession.messages),
                        startTime: new Date(existingSession.startTime),
                    });
                } else {
                    // Nếu không, tạo phiên mới
                    await initializeExam();
                }

                setIsInitializing(false);
            } catch (error) {
                console.error("Failed to load exam session:", error);
                // Nếu API chưa có, tạo mới local session
                await initializeExam();
                setIsInitializing(false);
            }
        };

        loadOrCreateSession();
    }, [exam.id, profileId]);

    // Initialize new exam
    const initializeExam = async () => {
        try {
            const startTime = new Date();
            const modelId = exam.model.id;
            const fieldId = fieldId_Props;

            // Khởi tạo chat mới với Gemini
            startNewChat(modelId);

            // Tạo message đầu tiên với prompt của exam
            const systemMessage: Message = {
                text: `Bài thi: ${exam.name}${exam.description ? `\n\n${exam.description}` : ''}`,
                sender: "system",
                timestamp: startTime,
            };

            // Tạo session mới
            const newSession: ExamSession = {
                id: Date.now().toString(),
                examId: exam.id,
                profileId: profileId,
                messages: [systemMessage],
                modelId: modelId,
                fieldId: fieldId,
                startTime,
                status: "ongoing"
            };

            // Load file đầu tiên nếu có
            if (exam.files && exam.files.length > 0) {
                const fileMessage = await loadExamFile(exam.files[0]);
                if (fileMessage) {
                    newSession.messages.push(fileMessage);
                }
            }

            // Hiển thị message chào mừng từ AI sử dụng Gemini
            try {
                let welcomeMessage = "";
                
                // Sử dụng prompt từ exam nếu có
                if (exam.prompt) {
                    welcomeMessage = await initializeAgentWithPrompt(exam.prompt);
                } else {
                    // Hoặc sử dụng message đơn giản nếu không có prompt
                    welcomeMessage = await sendMessageToGemini(
                        "Chào mừng bạn đến với bài thi. Tôi là trợ lý AI và sẽ hỗ trợ bạn.",
                        modelId
                    );
                }

                // Thêm phản hồi từ Gemini vào messages
                if (welcomeMessage) {
                    newSession.messages.push({
                        text: welcomeMessage,
                        sender: "bot",
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                console.error("Failed to get AI welcome message:", error);
                // Thêm message mặc định nếu không gọi được API
                newSession.messages.push({
                    text: "Xin chào! Tôi sẽ hỗ trợ bạn trong bài thi này. Hãy đọc kỹ đề bài và gửi câu trả lời của bạn.",
                    sender: "bot",
                    timestamp: new Date()
                });
            }

            setSession(newSession);

            // Lưu session vào database
            try {
                await saveExamSession(newSession);
            } catch (error) {
                console.error("Failed to save exam session:", error);
            }

            return newSession;
        } catch (error) {
            console.error("Failed to initialize exam:", error);
            return null;
        }
    };

    // Load exam file
    const loadExamFile = async (file: { name: string; url: string }): Promise<Message | null> => {
        try {
            const response = await axios.get(`/api/files/view?path=${encodeURIComponent(file.url)}`, {
                responseType: 'blob'
            });
            const fileData = response.data;

            // Get the file mimetype based on file extension
            const getMimeType = (url: string) => {
                const extension = url.split('.').pop()?.toLowerCase();
                const mimeTypes: Record<string, string> = {
                    'pdf': 'application/pdf',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'txt': 'text/plain',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'webp': 'image/webp',
                    'heic': 'image/heic'
                };
                return mimeTypes[extension || ''] || 'application/octet-stream';
            };

            // Convert blob to ArrayBuffer for Gemini processing
            const arrayBuffer = await fileData.arrayBuffer();
            
            // Create FileData object for Gemini
            const fileDataForGemini: FileData = {
                mimeType: getMimeType(file.url),
                data: arrayBuffer
            };

            // Thông báo file đã được tải
            return {
                text: `Tài liệu bài thi đã được tải: ${file.name}`,
                sender: "system",
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Failed to load exam file:', error);
            return {
                text: `Lỗi khi tải tài liệu: ${file.name}. Vui lòng thử lại.`,
                sender: "system",
                timestamp: new Date()
            };
        }
    };

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);

        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];

        // Check file type
        if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
            setFileError(`Không hỗ trợ loại file ${file.type}. Hỗ trợ: PDF, JPEG, PNG, WEBP, HEIC, TXT, DOCX`);
            return;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            setFileError(`File quá lớn. Tối đa 20MB, file của bạn là ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
            return;
        }

        // Process file
        setUploadProgress(10);

        const reader = new FileReader();

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 90);
                setUploadProgress(progress);
            }
        };

        reader.onload = () => {
            setUploadProgress(100);

            const fileData: FileData = {
                mimeType: file.type,
                data: reader.result as string | ArrayBuffer,
            };

            setCurrentFile({
                name: file.name,
                size: file.size,
                type: file.type,
                data: fileData,
            });

            // Reset upload progress after a while
            setTimeout(() => setUploadProgress(0), 1000);
        };

        reader.onerror = () => {
            setFileError("Lỗi khi đọc file. Vui lòng thử lại.");
            setUploadProgress(0);
        };

        reader.readAsArrayBuffer(file);
    };

    // Clear file
    const clearFile = () => {
        setCurrentFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setFileError(null);
    };

    // Send answer using Gemini
    const sendAnswer = async () => {
        if (!input.trim() && !currentFile) return;
        if (!session || session.status !== "ongoing") return;

        const userMessage: Message = {
            text: currentFile
                ? `${input.trim() || 'Phân tích tài liệu này cho bài thi'} [File: ${currentFile.name}]`
                : input.trim(),
            sender: "user",
            timestamp: new Date()
        };

        const updatedSessionWithUserMsg = {
            ...session,
            messages: [...session.messages, userMessage],
        };

        setSession(updatedSessionWithUserMsg);
        setInput("");
        setIsLoading(true);

        // Scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        try {
            let response;
            
            // Use appropriate Gemini function based on whether we have a file or not
            if (currentFile) {
                // Use processFileWithGemini for file processing
                response = await processFileWithGemini(
                    input.trim() || 'Phân tích tài liệu này cho bài thi',
                    currentFile.data,
                    session.modelId
                );
            } else {
                // Use sendMessageToGemini for text-only messages
                response = await sendMessageToGemini(
                    input.trim(),
                    session.modelId
                );
            }

            // Clear file after sending
            const fileToMention = currentFile;
            setCurrentFile(null);

            // Create bot message from response
            const botMessage: Message = {
                text: response || "Tôi đã nhận được câu trả lời của bạn.",
                sender: "bot",
                timestamp: new Date()
            };

            // Update session with bot message
            const finalUpdatedSession = {
                ...updatedSessionWithUserMsg,
                messages: [...updatedSessionWithUserMsg.messages, botMessage],
            };

            setSession(finalUpdatedSession);
            await saveExamSession(finalUpdatedSession);
        } catch (error) {
            console.error("Failed to evaluate answer:", error);

            // Add error message
            const errorMessage: Message = {
                text: "Có lỗi xảy ra khi xử lý câu trả lời. Vui lòng thử lại.",
                sender: "system",
                timestamp: new Date()
            };

            const sessionWithError = {
                ...updatedSessionWithUserMsg,
                messages: [...updatedSessionWithUserMsg.messages, errorMessage]
            };

            setSession(sessionWithError);
            await saveExamSession(sessionWithError);
        } finally {
            setIsLoading(false);

            // Scroll to bottom again after new message
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    };

    // Auto scroll when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [session?.messages]);

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) {
            return bytes + ' bytes';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Exam header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-[10px] border-b shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xl font-medium">{exam.name}</p>
                        {exam.description && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{exam.description}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {session?.status === "ongoing" ? "Đang làm bài..." : "Bài thi đã kết thúc"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-4">
                {isInitializing ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                            <p>Đang tải bài thi...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {session?.messages.map((msg, idx) => (
                            <div key={idx} className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"
                                }`}>
                                <div className={`p-4 rounded-xl max-w-[80%] ${msg.sender === "user"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : msg.sender === "system"
                                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800"
                                            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm"
                                    }`}>
                                    <ReactMarkdown
                                        components={{
                                            p: ({ node, ...props }) => <p className="prose-p:m-0" {...props} />,
                                            h1: ({ node, ...props }) => <h1 className="prose-headings:mb-2" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="prose-headings:mb-2" {...props} />,
                                            // Add other elements as needed
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start mb-4">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm w-[60%] animate-pulse">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </ScrollArea>

            {/* Input area */}
            <div className="bg-white dark:bg-gray-800 p-4 border-t">
                {/* File upload progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mb-2">
                        <Progress value={uploadProgress} className="h-1" />
                    </div>
                )}

                {/* File error */}
                {fileError && (
                    <div className="mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                        {fileError}
                    </div>
                )}

                {/* File preview */}
                {currentFile && (
                    <div className="mb-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                            <File size={16} className="text-blue-500" />
                            <div className="overflow-hidden">
                                <div className="truncate max-w-[240px]">{currentFile.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {SUPPORTED_FILE_TYPES[currentFile.type as keyof typeof SUPPORTED_FILE_TYPES]} • {formatFileSize(currentFile.size)}
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={clearFile}
                        >
                            <X size={14} />
                        </Button>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.docx"
                />

                {session?.status === "ongoing" ? (
                    <div className="relative">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={currentFile
                                ? "Nhập câu trả lời về tài liệu này..."
                                : "Nhập câu trả lời của bạn..."}
                            className="min-h-[100px] pr-24 resize-none rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || !session}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                                    e.preventDefault();
                                    sendAnswer();
                                }
                            }}
                        />
                        <div className="absolute bottom-2 right-14">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-8 h-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                                            size="icon"
                                            type="button"
                                            disabled={isLoading}
                                            variant="ghost"
                                        >
                                            <Paperclip size={16} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Tải lên tài liệu</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Button
                            onClick={sendAnswer}
                            className="absolute bottom-2 right-2"
                            disabled={isLoading || (!input.trim() && !currentFile)}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <SendHorizontal className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400">
                            Bài thi đã kết thúc
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Save exam session to database
const saveExamSession = async (session: ExamSession) => {
    console.log("Saving exam session:", session);
    try {
        await axios.post('/api/exam', {
            id: session.id,
            examId: session.examId,
            profileId: session.profileId,
            messages: session.messages,
            modelId: session.modelId,
            fieldId: session.fieldId,
        });
    } catch (error) {
        console.error('Failed to save exam session:', error);
    }
};

export default ExamChat;