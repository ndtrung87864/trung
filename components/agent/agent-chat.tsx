"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Paperclip, File, X, Loader2, Copy, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "next-themes";
import {
  sendMessageToGemini,
  FileData,
  setFileForCurrentSession,
  getCurrentFile,
  startNewChat
} from "@/lib/gemini_google";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgentChatProps {
  agent: {
    id: string;
    name: string;
    description: string | null;
    prompt: string | null;
    model: {
      id: string;
      name: string;
    };
    files: {
      id: string;
      name: string;
      url: string;
    }[];
  };
}

type Sender = "user" | "bot";

interface Message {
  text: string;
  sender: Sender;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  fieldId: string;
  prompt?: string | null;
  createdAt?: string;
}

interface MarkdownComponentProps {
  children?: React.ReactNode;
  href?: string;
  className?: string;
  inline?: boolean;
}

interface CodeBlockProps extends MarkdownComponentProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
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

const AgentChat: React.FC<AgentChatProps> = ({ agent }) => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number; type: string; data: FileData } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string>("");
  const { theme } = useTheme();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Sửa lại loadAgentFile để không tạo message "File loaded"
  const loadAgentFile = useCallback(async (file: { name: string; url: string }) => {
    try {
      const response = await axios.get(`/api/files/view?path=${encodeURIComponent(file.url)}`, {
        responseType: 'blob'
      });
      const fileData = response.data;

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

      const reader = new FileReader();

      return new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          const fileDataForChat: FileData = {
            mimeType: getMimeType(file.url),
            data: reader.result as ArrayBuffer,
          };

          setFileForCurrentSession(fileDataForChat, file.name);

          setCurrentFile({
            name: file.name,
            size: fileData.size || 0,
            type: getMimeType(file.url),
            data: fileDataForChat
          });

          resolve();
        };

        reader.onerror = () => {
          console.error('Failed to load agent file:', file.name);
          reject(new Error(`Failed to load ${file.name}`));
        };

        reader.readAsArrayBuffer(fileData);
      });
    } catch (error) {
      console.error('Failed to load agent file:', error);
      throw error;
    }
  }, []);

  // ✅ Sửa lại initializeChat để load file TRƯỚC
  const initializeChat = useCallback(async () => {
    setIsInitializing(true);

    try {
      // Create a new chat session
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: agent.name,
        messages: [],
        modelId: agent.model.id,
        fieldId: agent.id,
        prompt: agent.prompt,
      };

      // ✅ Load file TRƯỚC khi khởi tạo chat
      let currentFileData = null;
      if (agent.files && agent.files.length > 0) {
        await loadAgentFile(agent.files[0]);
        currentFileData = getCurrentFile();
      }

      // ✅ Khởi tạo chat với prompt VÀ file cùng lúc
      startNewChat(
        agent.model.id,
        currentFileData?.fileData,
        currentFileData?.fileName,
        agent.prompt || undefined
      );

      // ✅ Gửi tin nhắn giới thiệu với đầy đủ context (chỉ 5 tham số)
      const introduction = await sendMessageToGemini(
        "Hãy giới thiệu bản thân theo vai trò được giao. Nếu có tài liệu đính kèm, hãy đề cập ngắn gọn về khả năng phân tích tài liệu.",
        agent.model.id,
        currentFileData?.fileData,
        currentFileData?.fileName,
        agent.prompt || undefined
      );

      const botIntroMessage: Message = {
        text: introduction || `Xin chào! Tôi là ${agent.name}. Tôi có thể giúp gì cho bạn?`,
        sender: "bot" as Sender,
      };

      const updatedSession = {
        ...newSession,
        messages: [botIntroMessage],
      };

      setSessions(prev => [updatedSession, ...prev]);
      setCurrentSession(updatedSession);
      await saveSessionToDB(updatedSession);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    } finally {
      setIsInitializing(false);
    }
  }, [agent.name, agent.model.id, agent.id, agent.prompt, agent.files, loadAgentFile]);

  // ✅ Sửa lại loadSessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await axios.get(`/api/chatbox?fieldId=${agent.id}`);

        // ✅ Xử lý dữ liệu trả về an toàn
        const chatSessions = response.data.map((item: ChatSession & { messages: string | Message[] }) => ({
          ...item,
          messages: Array.isArray(item.messages) ? item.messages : []
        }));

        setSessions(chatSessions);

        if (chatSessions.length > 0) {
          const latestSession = chatSessions[0];
          setCurrentSession(latestSession);

          // ✅ Khôi phục context cho session hiện tại
          if (latestSession.messages.length > 0) {
            const conversationHistory = latestSession.messages
              .filter((msg: Message) => !msg.text.includes("File loaded:"))
              .map((msg: Message) => ({
                role: msg.sender === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
              }));

            // Khởi tạo chat với history bằng cách tạo một prompt từ history
            const historyPrompt = conversationHistory
              .map((h: { role: string; parts: { text: string }[] }) => `${h.role === "user" ? "User" : "Assistant"}: ${h.parts[0].text}`)
              .join("\n");

            startNewChat(
              agent.model.id,
              undefined,
              undefined,
              agent.prompt ? `${agent.prompt}\n\nPrevious conversation:\n${historyPrompt}` : historyPrompt
            );
          }

          setIsInitializing(false);
        } else {
          initializeChat();
        }
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
        initializeChat();
      }
    };

    loadSessions();
  }, [agent.id, agent.model.id, agent.prompt, initializeChat]);

  // ✅ Sửa lại sendMessage để có conversation history (chỉ 5 tham số)
  const sendMessage = async () => {
    if (!input.trim() && !currentFile) return;
    if (!currentSession) return;

    const messageText = currentFile
      ? `${input.trim() || 'Phân tích tài liệu này giúp tôi'} [File: ${currentFile.name}]`
      : input.trim();

    const userMessage: Message = {
      text: messageText,
      sender: "user" as Sender,
    };

    const updatedSession: ChatSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
    };

    setSessions(prev =>
      prev.map(s => s.id === updatedSession.id ? updatedSession : s)
    );
    setCurrentSession(updatedSession);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      // ✅ Tạo conversation history để AI nhớ context
      const conversationHistory = updatedSession.messages
        .filter((msg: Message) => !msg.text.includes("File loaded:"))
        .map((msg: Message) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
        .join("\n");

      // ✅ Kết hợp prompt với conversation history
      const contextualPrompt = agent.prompt
        ? `${agent.prompt}\n\nConversation history:\n${conversationHistory}\n\nUser: ${messageText}`
        : `Conversation history:\n${conversationHistory}\n\nUser: ${messageText}`;

      // ✅ Gửi tin nhắn với context đầy đủ (chỉ 5 tham số)
      const botText = await sendMessageToGemini(
        contextualPrompt,
        currentSession.modelId,
        currentFile?.data || undefined,
        currentFile?.name || undefined,
        agent.prompt || undefined
      );

      if (currentFile) {
        setFileForCurrentSession(currentFile.data, currentFile.name);
        setCurrentFile(null); // Clear file after sending
      }

      const botMessage: Message = {
        text: botText,
        sender: "bot" as Sender,
      };

      const sessionWithBotReply: ChatSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, botMessage],
      };

      setSessions(prev =>
        prev.map(s => s.id === sessionWithBotReply.id ? sessionWithBotReply : s)
      );
      setCurrentSession(sessionWithBotReply);
      await saveSessionToDB(sessionWithBotReply);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        text: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
        sender: "bot" as Sender,
      };

      const sessionWithError = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMessage],
      };

      setSessions(prev =>
        prev.map(s => s.id === sessionWithError.id ? sessionWithError : s)
      );
      setCurrentSession(sessionWithError);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Sửa lại hàm chuyển đổi session
  const switchToSession = async (session: ChatSession) => {
    if (isInitializing || isLoading) return;

    setCurrentSession(session);
    clearFile();

    // ✅ Khôi phục context khi chuyển session
    if (session.messages.length > 0) {
      const conversationHistory = session.messages
        .filter((msg: Message) => !msg.text.includes("File loaded:"))
        .map((msg: Message) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
        .join("\n");

      const contextualPrompt = agent.prompt
        ? `${agent.prompt}\n\nPrevious conversation:\n${conversationHistory}`
        : conversationHistory;

      startNewChat(
        agent.model.id,
        undefined,
        undefined,
        contextualPrompt
      );
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

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // Create a new chat
  const createNewChat = () => {
    initializeChat();
  };

  // Copy code function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Custom code block component
  const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && language) {
      return (
        <div className="relative group mb-4">
          <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-200 px-4 py-2 rounded-t-lg text-sm">
            <span className="font-medium">{language.toUpperCase()}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => copyToClipboard(codeString)}
            >
              {copiedCode === codeString ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
            </Button>
          </div>
          <SyntaxHighlighter
            language={language}
            style={theme === 'dark' ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem',
            }}
            showLineNumbers={true}
            wrapLines={true}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <code
        className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    code: CodeBlock,
    pre: ({ children }: MarkdownComponentProps) => (
      <div className="overflow-x-auto">
        {children}
      </div>
    ),
    blockquote: ({ children }: MarkdownComponentProps) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300">
        {children}
      </blockquote>
    ),
    table: ({ children }: MarkdownComponentProps) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: MarkdownComponentProps) => (
      <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: MarkdownComponentProps) => (
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
        {children}
      </td>
    ),
    ul: ({ children }: MarkdownComponentProps) => (
      <ul className="list-disc list-inside my-2 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }: MarkdownComponentProps) => (
      <ol className="list-decimal list-inside my-2 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }: MarkdownComponentProps) => (
      <li className="ml-4">
        {children}
      </li>
    ),
    h1: ({ children }: MarkdownComponentProps) => (
      <h1 className="text-2xl font-bold my-4 text-gray-900 dark:text-gray-100">
        {children}
      </h1>
    ),
    h2: ({ children }: MarkdownComponentProps) => (
      <h2 className="text-xl font-bold my-3 text-gray-900 dark:text-gray-100">
        {children}
      </h2>
    ),
    h3: ({ children }: MarkdownComponentProps) => (
      <h3 className="text-lg font-semibold my-3 text-gray-900 dark:text-gray-100">
        {children}
      </h3>
    ),
    h4: ({ children }: MarkdownComponentProps) => (
      <h4 className="text-base font-semibold my-2 text-gray-900 dark:text-gray-100">
        {children}
      </h4>
    ),
    p: ({ children }: MarkdownComponentProps) => (
      <p className="my-2 leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {children}
      </p>
    ),
    a: ({ href, children }: MarkdownComponentProps) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {children}
      </a>
    ),
    strong: ({ children }: MarkdownComponentProps) => (
      <strong className="font-bold text-gray-900 dark:text-gray-100">
        {children}
      </strong>
    ),
    em: ({ children }: MarkdownComponentProps) => (
      <em className="italic text-gray-700 dark:text-gray-300">
        {children}
      </em>
    ),
  };

  // ✅ Sửa lại saveSessionToDB
  const saveSessionToDB = async (session: ChatSession) => {
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

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 px-4 py-[10px] border-b flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-medium">{agent.name}</h2>
            {agent.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-900/30 overflow-y-auto">
          {isInitializing ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p>Initializing chat with AI assistant...</p>
              </div>
            </div>
          ) : (
            <>
              {currentSession?.messages.map((msg, idx) => (
                <div key={idx} className={`mb-6 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${msg.sender === "user"
                      ? "bg-blue-600 text-white p-4 rounded-2xl rounded-br-sm"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-bl-sm shadow-sm"
                    }`}>
                    {msg.sender === "user" ? (
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="whitespace-pre-wrap break-words leading-relaxed m-0">
                                {children}
                              </p>
                            ),
                            code: ({ children }) => (
                              <code className="bg-blue-500 text-blue-100 px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="prose prose-gray dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={markdownComponents}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start mb-6">
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
            </>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="bg-white dark:bg-gray-800 p-4 border-t">
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
                <X size={14} />
              </Button>
            </div>
          )}

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
              placeholder={currentFile ? "Hãy hỏi về tài liệu này..." : "Nhập câu hỏi của bạn..."}
              className="min-h-[48px] max-h-[150px] resize-none rounded-lg border p-2 pr-24 w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isInitializing || isLoading}
            />
            <div className="absolute bottom-2 right-14">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 p-0 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                      size="icon"
                      type="button"
                      disabled={isInitializing || isLoading}
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
              onClick={sendMessage}
              className="absolute bottom-2 right-2 w-10 h-10 p-0 rounded-full"
              size="icon"
              disabled={isInitializing || isLoading}
            >
              <SendHorizontal size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Right sidebar with chat history */}
      <div className="md:block w-72 border-l dark:border-gray-700 flex flex-col h-full">
        <div className="p-3 border-b dark:border-gray-700">
          <Button
            variant="outline"
            onClick={createNewChat}
            className="w-full text-sm justify-center"
            disabled={isInitializing}
          >
            Tạo chat mới
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="py-2">
            <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Lịch sử chat</h3>
            <div className="space-y-1 px-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between px-2 py-2 rounded-md cursor-pointer
                    ${currentSession?.id === session.id
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  onClick={() => switchToSession(session)}
                >
                  <div className="flex-col items-center gap-2 overflow-hidden flex-1">
                    <p className="text-sm truncate font-bold text-gray-800 dark:text-gray-200">
                      {session.title || "Chat với " + agent.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(session.createdAt || Date.now()).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-gray-500 text-justify dark:text-gray-400 text-nowrap truncate">
                      {session.messages.length > 0
                        ? session.messages[session.messages.length - 1].text
                        : "Chưa có tin nhắn"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 opacity-0 hover:opacity-100"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await axios.delete(`/api/chatbox?id=${session.id}`);
                        setSessions((prev) => prev.filter((s) => s.id !== session.id));
                        if (currentSession?.id === session.id) {
                          const nextSession = sessions.find((s) => s.id !== session.id);
                          if (nextSession) {
                            switchToSession(nextSession);
                          } else {
                            createNewChat();
                          }
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;