"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    MessageCircleQuestion,
    SendHorizontal,
    X,
    Moon,
    Sun,
    Plus,
    ChevronDown,
    CheckIcon,
    Paperclip,
    File,
    X as XIcon,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { ChatSession, Message, Sender } from "@/types/chat";
import {
    sendMessageToGemini,
    availableModels,
    getCurrentModel,
    changeModel,
    FileData,
    getCurrentFile,
    setFileForCurrentSession
} from "@/lib/gemini_google";
import { Skeleton } from "../ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizableBox, ResizeCallbackData } from "react-resizable";
import ReactMarkdown from "react-markdown";
import axios from "axios";

interface ChatSessionWithModel extends ChatSession {
    modelId?: string;
    fieldId?: string;
    prompt?: string;
}

interface UploadedFile {
    name: string;
    size: number;
    type: string;
    data: FileData;
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

const ChatPopup: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [sessions, setSessions] = useState<ChatSessionWithModel[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSessionWithModel | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState({ y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [selectedModel, setSelectedModel] = useState(getCurrentModel());
    const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState<string | null>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [selectedField, setSelectedField] = useState<string>("");
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>("");
    const [agentIntroduction, setAgentIntroduction] = useState<string | null>(null);

    // Resize configuration
    const [windowSize, setWindowSize] = useState({
        width: 420,
        height: 580
    });
    const [isMaximized, setIsMaximized] = useState(false);
    const [previousSize, setPreviousSize] = useState({ width: 420, height: 580 });

    const popupRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const STORAGE_KEY = "chat_sessions";
    const POSITION_KEY = "chat_button_position";
    const MODEL_KEY = "selected_model";
    const WINDOW_SIZE_KEY = "chat_window_size";

    // Scroll to bottom function
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Auto scroll when messages change or when loading
    useEffect(() => {
        scrollToBottom();
    }, [currentSession?.messages, isLoading, scrollToBottom]);

    const loadAgentFile = async (file: any) => {
        try {

            console.log("Loading agent file:", file); // Debug log
            // Use the new files/view API endpoint with the file URL
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

            // Create a FileData object compatible with your system
            const reader = new FileReader();

            reader.onload = () => {
                const fileDataForChat: FileData = {
                    mimeType: getMimeType(file.url),
                    data: reader.result as string | ArrayBuffer,
                };

                // Set the file for the current session
                setFileForCurrentSession(fileDataForChat, file.name);
                
                // Update UI to show file is loaded
                setCurrentFile({
                    name: file.name,
                    size: fileData.size || 0,
                    type: getMimeType(file.url),
                    data: fileDataForChat
                });

                // Optional: Display a message that a file has been loaded
                if (currentSession) {
                    const systemMessage: Message = {
                        text: `File loaded: ${file.name}`,
                        sender: "bot" as Sender,
                    };

                    const updatedSession = {
                        ...currentSession,
                        messages: [...currentSession.messages, systemMessage]
                    };

                    setCurrentSession(updatedSession);
                    setSessions(prev =>
                        prev.map(s => s.id === updatedSession.id ? updatedSession : s)
                    );
                    
                    // Save the updated session
                    saveSessionToDB(updatedSession);
                }
            };

            reader.readAsArrayBuffer(fileData);
        } catch (error) {
            console.error('Failed to load agent file:', error);
            // Show error message to user
            if (currentSession) {
                const errorMessage: Message = {
                    text: `Error loading file: ${file.name}. Please try again.`,
                    sender: "bot" as Sender,
                };
                
                const updatedSession = {
                    ...currentSession,
                    messages: [...currentSession.messages, errorMessage]
                };
                
                setCurrentSession(updatedSession);
                setSessions(prev =>
                    prev.map(s => s.id === updatedSession.id ? updatedSession : s)
                );
            }
        }
    };


    // Modify the startNewChat function to use loadAgentFile

    const startNewChat = useCallback(async () => {
        if (!selectedAgent) {
            alert("Please select an AI agent before starting a chat!");
            return;
        }

        const agent = agents.find(a => a.id === selectedAgent);

        if (!agent) {
            alert("Selected agent not found. Please try again.");
            return;
        }

        setIsLoading(true); // Show loading state

        try {
            // Create new chat session
            const newSession: ChatSessionWithModel = {
                id: Date.now().toString(),
                title: agent.name,
                messages: [],
                modelId: agent.modelId,
                fieldId: agent.id,
                prompt: agent.prompt || "",
            };

            // Set the current model
            changeModel(newSession.modelId || selectedModel);
            
            // Update UI with new session first to avoid state issues
            setSessions((prev) => [newSession, ...prev]);
            setCurrentSession(newSession);
            
            // First, if there are files, load the first one before starting the chat
            if (agent.files && agent.files.length > 0) {
                console.log("Loading file for new chat:", agent.files[0].name);
                
                // Use the existing loadAgentFile function instead of duplicating logic
                await loadAgentFile(agent.files[0]);
            }
            
            // Get the loaded file data after loadAgentFile has completed
            const currentFileData = getCurrentFile();
            
            // Initialize chat with Gemini, now passing the file if available
            const introduction = await sendMessageToGemini(
                "INTRODUCE_AGENT", 
                newSession.modelId || selectedModel, 
                currentFileData?.fileData, // Pass the loaded file data
                currentFileData?.fileName,  // Pass the file name
                newSession.prompt
            );

            // Create bot introduction message
            const botIntroMessage: Message = {
                text: introduction,
                sender: "bot" as Sender,
            };

            // Update chat session with introduction message
            const updatedSession = {
                ...newSession,
                messages: [botIntroMessage],
            };

            setSessions((prev) =>
                prev.map(s => s.id === updatedSession.id ? updatedSession : s)
            );
            setCurrentSession(updatedSession);

            // Save to database
            await saveSessionToDB(updatedSession);
            
        } catch (error) {
            console.error("Failed to start new chat:", error);
            alert("Failed to start chat. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [agents, selectedAgent, selectedModel, loadAgentFile]); // Add loadAgentFile to dependencies

    // Hàm mới để khởi tạo chat với Gemini
    const startChatWithGemini = (modelId: string, prompt?: string) => {
        // Gọi hàm từ lib Gemini với prompt
        return sendMessageToGemini("", modelId, undefined, undefined, prompt);
    };

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const response = await axios.get('/api/chatbox');
                const data = response.data;
                setSessions(data.map((item: any) => ({
                    ...item,
                    messages: JSON.parse(item.message),
                })));
                if (data.length > 0) setCurrentSession(data[0]);
                else startNewChat();
            } catch (error) {
                console.error('Failed to fetch sessions:', error);
            }
        };
        fetchSessions();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
        changeModel(modelId);

        // Update current session model ID
        if (currentSession) {
            const updatedSession = {
                ...currentSession,
                modelId: modelId
            };
            setCurrentSession(updatedSession);

            // Update session in the sessions array
            setSessions((prev) =>
                prev.map((s) => s.id === currentSession.id ? updatedSession : s)
            );
        }
    };

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

    const clearFile = () => {
        setCurrentFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setFileError(null);
    };

    // Gửi tin nhắn từ người dùng
    const sendMessage = async () => {
        if (!input.trim() && !currentFile) return;

        if (!currentSession) {
            startNewChat();
            return;
        }

        const messageText = currentFile
            ? `${input.trim() || 'Phân tích tài liệu này giúp tôi'} [File: ${currentFile.name}]`
            : input;

        const userMessage: Message = {
            text: messageText,
            sender: "user" as Sender,
        };

        const updatedSession: ChatSessionWithModel = {
            ...currentSession,
            messages: [...currentSession.messages, userMessage],
        };

        setSessions((prev) =>
            prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        );
        setCurrentSession(updatedSession);
        setInput("");
        setIsLoading(true);

        setTimeout(scrollToBottom, 100);

        const botText = await sendMessageToGemini(
            input.trim() || 'Phân tích tài liệu này giúp tôi',
            currentSession.modelId || selectedModel,
            currentFile?.data || undefined,
            currentFile?.name || undefined,
            // Không thêm prompt vào đây, vì prompt đã được thiết lập khi khởi tạo chat
        );

        if (currentFile) {
            setFileForCurrentSession(currentFile.data, currentFile.name);
        }

        // Get reference to the file before clearing it from state
        const fileToMention = currentFile;
        // Only clear the file from the UI, not from the session
        setCurrentFile(null);

        const botMessage: Message = {
            text: fileToMention
                ? `Phân tích tài liệu: ${fileToMention.name}\n\n${botText}`
                : botText,
            sender: "bot" as Sender,
        };

        const sessionWithBotReply: ChatSessionWithModel = {
            ...updatedSession,
            messages: [...updatedSession.messages, botMessage],
            modelId: currentSession.modelId || selectedModel
        };

        setSessions((prev) =>
            prev.map((s) => (s.id === sessionWithBotReply.id ? sessionWithBotReply : s))
        );
        setCurrentSession(sessionWithBotReply);
        setIsLoading(false);
        
        saveSessionToDB(sessionWithBotReply);
    };

    // Drag functionality
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDrag = useCallback((e: MouseEvent) => {
        if (isDragging) {
            // Only allow vertical movement, keep fixed to right side
            const newY = e.clientY;
            // Limit the position to stay within viewport
            const limitedY = Math.min(Math.max(newY, 20), window.innerHeight - 80);
            setPosition({ y: limitedY });
        }
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDrag, handleDragEnd]);

    // Handle resize with Tailwind classes
    const handleResize = (event: React.SyntheticEvent, data: ResizeCallbackData) => {
        const { size } = data;
        setWindowSize({
            width: size.width,
            height: size.height
        });
    };

    // Toggle maximize window
    const toggleMaximize = () => {
        if (!isMaximized) {
            setPreviousSize({ ...windowSize });
            setWindowSize({
                width: window.innerWidth - 40,
                height: window.innerHeight - 40
            });
            setIsMaximized(true);
        } else {
            setWindowSize(previousSize);
            setIsMaximized(false);
        }
    };

    // Get current model display name
    const getCurrentModelName = () => {
        const model = availableModels.find(m => m.id === selectedModel);
        return model?.name || selectedModel;
    };

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

    // Thêm một indicator khi có file đã tải lên đang được sử dụng
    const currentSessionHasFile = useMemo(() => {
        return getCurrentFile() !== null;
    }, [currentSession]); // Re-check whenever session changes

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await axios.get('/api/admin/agents');
                const data = response.data;
                // Filter only active agents for student use
                const activeAgents = data.filter((agent: any) => agent.isActive);
                setAgents(activeAgents);
            } catch (error) {
                console.error('Failed to fetch agents:', error);
            }
        };

        fetchAgents();
    }, []);

    // Update the loadAgentFile function to use the new endpoint

    return (
        <div className="fixed z-50">
            {isOpen ? (
                // Giao diện chat đầy đủ khi mở
                <div
                    ref={popupRef}
                    className={`fixed overflow-hidden transition-all duration-200
                    ${isMaximized
                            ? "top-4 left-4 w-[98vw] h-[92vh]"
                            : "bottom-6 right-6 w-[950px] h-[600px]"
                        }`}
                    style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                    }}
                >
                    <div className="flex h-full bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden">
                        {/* PHẦN CHÍNH - Chat content */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <div className="flex items-center gap-2">
                                    <MessageCircleQuestion size={22} className="text-blue-500" />
                                    <h2 className="font-semibold text-lg dark:text-white">Trợ lý AI</h2>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={toggleMaximize}
                                        className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                        title={isMaximized ? "Thu nhỏ" : "Phóng to"}
                                    >
                                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        <X size={18} />
                                    </Button>
                                </div>
                            </div>

                            {/* Agent dropdown (Select AI Assistant) */}
                            <div className="px-4 py-2 border-b dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80">
                                <select
                                    className="w-full border p-2 rounded dark:bg-gray-800 dark:text-gray-200"
                                    value={selectedAgent}
                                    onChange={e => setSelectedAgent(e.target.value)}
                                >
                                    <option value="">-- Chọn AI Assistant --</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Message List */}
                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 dark:bg-gray-800/30">
                                {currentSession?.messages.map((msg, idx) => (
                                    <div key={idx} className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`p-3 rounded-2xl max-w-[80%] ${msg.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ node, ...props }) => (
                                                        <p className="prose max-w-none whitespace-pre-wrap break-words" {...props} />
                                                    ),
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start mb-4">
                                        <div className="flex items-center space-x-4">
                                            <Skeleton className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-500" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-[250px] bg-gray-300 dark:bg-gray-500" />
                                                <Skeleton className="h-4 w-[200px] bg-gray-300 dark:bg-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 dark:bg-gray-900 border-t border-gray-300">
                                {/* File Upload Progress and Preview */}
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                    <div className="mb-2">
                                        <Progress value={uploadProgress} max={100} className="h-1" />
                                    </div>
                                )}

                                {fileError && (
                                    <div className="mb-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                                        {fileError}
                                    </div>
                                )}

                                {currentFile && (
                                    <div className="mb-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                                        <div className="flex items-center gap-2 text-sm">
                                            <File size={16} className="text-blue-500" />
                                            <div className="overflow-hidden">
                                                <div className="truncate max-w-[240px]">{currentFile.name}</div>
                                                <div className="text-xs text-gray-500">
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
                                            <XIcon size={14} />
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

                                <div className="relative w-full">
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={currentFile ? "Hãy hỏi về tài liệu này..." : "Nhập câu hỏi mà bạn muốn hỗ trợ..."}
                                        className="w-full min-h-[48px] max-h-[150px] resize-none rounded-2xl border border-gray-300 dark:bg-[#1A1B1F] dark:text-gray-200 pr-16 pl-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                    />
                                    <div className="absolute bottom-3 right-14">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-8 h-8 p-0 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                                        size="icon"
                                                        type="button"
                                                        disabled={isLoading}
                                                    >
                                                        <Paperclip size={16} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Tải lên PDF, ảnh, hoặc tài liệu</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <Button
                                        onClick={sendMessage}
                                        className="absolute bottom-3 right-3 w-10 h-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition"
                                        size="icon"
                                        disabled={isLoading}
                                    >
                                        <SendHorizontal size={18} />
                                    </Button>
                                </div>
                                {currentSessionHasFile && !currentFile && (
                                    <div className="mt-2 px-3 py-1 text-xs bg-green-100 dark:bg-green-900/20 
                                                text-green-800 dark:text-green-300 rounded-md flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <File size={12} />
                                            <span>AI đang phân tích file {getCurrentFile()?.fileName}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Information */}
                            {currentSession?.fieldId && (
                                <div className="px-4 py-2 text-xs text-gray-500 border-t dark:border-gray-700">
                                    <b>AI Agent:</b> {agents.find(a => a.id === currentSession.fieldId)?.name || "Custom Agent"}
                                    {agents.find(a => a.id === currentSession.fieldId)?.description && (
                                        <>
                                            <br />
                                            <b>Description:</b> {agents.find(a => a.id === currentSession.fieldId)?.description}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* BẢNG BÊN PHẢI - Conversations list */}
                        <div className="w-72 border-l dark:border-gray-700 flex flex-col h-full">
                            <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <Button
                                    variant="outline"
                                    onClick={startNewChat}
                                    className="w-full text-sm justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Tạo chat mới
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <div className="py-2">
                                    <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Cuộc hội thoại</h3>
                                    <div className="space-y-1 px-1">
                                        {sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className={`flex items-center justify-between px-2 py-2 rounded-md cursor-pointer
                                                    ${currentSession?.id === session.id
                                                        ? 'bg-gray-200 dark:bg-gray-700'
                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                                onClick={() => {
                                                    setCurrentSession(session);
                                                    if (session.modelId) setSelectedModel(session.modelId);
                                                    clearFile();
                                                }}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <MessageCircleQuestion size={16} className="text-gray-500 shrink-0" />
                                                    <span className="text-sm truncate">
                                                        {session.title}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await axios.delete(`/api/chatbox/${session.id}`);
                                                            setSessions((prev) => prev.filter((s) => s.id !== session.id));
                                                            if (currentSession?.id === session.id) {
                                                                setCurrentSession(sessions.find((s) => s.id !== session.id) || null);
                                                            }
                                                        } catch (error) {
                                                            console.error('Failed to delete session:', error);
                                                        }
                                                    }}
                                                >
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ))}

                                        {sessions.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500">
                                                Chưa có cuộc hội thoại
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <Button
                    ref={buttonRef}
                    className="fixed right-4 bottom-4 md:right-6 md:bottom-6 rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700 transition-all duration-200 cursor-grab active:cursor-grabbing"
                    onClick={() => setIsOpen(true)}
                    onMouseDown={handleDragStart}
                    style={{ top: `${position.y}px` }}
                >
                    <MessageCircleQuestion size={24} className="text-white" />
                </Button>
            )}
        </div>
    );
};

export default ChatPopup;

// Use axios to save session to DB
const saveSessionToDB = async (session: ChatSessionWithModel) => {
    try {
        await axios.post('/api/chatbox', {
            sessionId: session.id,
            title: session.title,
            messages: session.messages,
            modelId: session.modelId,
            fieldId: session.fieldId,
        });
    } catch (error) {
        console.error('Failed to save session to the database:', error);
    }
};