import {
	GoogleGenerativeAI,
	HarmCategory, // This import might not work as expected on the client-side
	HarmBlockThreshold, // Same for this
	type Part,
	type Content,
} from "@google/generative-ai";

// Define SystemInstruction interface since it's not exported from the package
interface SystemInstruction {
	role: string;
	parts: Array<{text: string}>;
}

const apiKey: string = process.env.GOOGLE_GEMINI_API_KEY || "AIzaSyBvrslEoJiZPlrj3f7CZceNPPbkkWtlTWg"; // Use environment variable for security

const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
	temperature: 0.9,
	topP: 0.95,
	topK: 64,
	maxOutputTokens: 16384, // Increased for longer responses
	responseMimeType: "text/plain",
};

// List of available models with display names
export const availableModels = [
	{ id: "gemini-2.5-pro-preview-03-25", name: "Gemini 2.5 Pro (Preview)" },
	{ id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash (Preview)" },
	{ id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
	{ id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash-Lite" },
	{ id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
	{ id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
	{ id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash-8B" },
];

// WARNING: The safetySettings below are the primary cause of the "HarmCategory is undefined" error
// when this SDK is used directly on the client-side. This part of the SDK may not be fully
// compatible with browser environments. For a robust solution, move API calls to server-side routes.
const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
	},
];

// Interface for Enhanced Chat Session
interface EnhancedChatSession {
	session: any; // The actual Gemini chat session
	fileData?: FileData; // Optional file data associated with this session
	fileName?: string; // Optional file name for reference
}

let chatSession: EnhancedChatSession | null = null; // Used by ChatPopup
let currentModel: string = "gemini-2.0-flash"; // Default model for ChatPopup

// Functions for ChatPopup (startNewChat, initializeAgentWithPrompt, changeModel, etc.)
// These manage a global state for the ChatPopup component.
export const startNewChat = (modelId: string = currentModel, fileData?: FileData, fileName?: string) => {
	currentModel = modelId;

	// Cấu hình model với generationConfig và safetySettings
	const model = genAI.getGenerativeModel({
		model: modelId,
	});

	// Tạo session chat
	const session = model.startChat({
		generationConfig,
		safetySettings,
		history: [], // Khởi tạo lịch sử trống
	});

	chatSession = {
		session,
		fileData,
		fileName
	};

	return chatSession;
};

export const initializeAgentWithPrompt = async (prompt?: string): Promise<string> => {
	try {
		if (!chatSession?.session || !prompt) {
			return "";
		}

		// Tạo prompt đặc biệt để buộc model giới thiệu theo đúng vai trò
		const setupPrompt = `SYSTEM INSTRUCTION:
${prompt}

IMPORTANT: NEVER identify yourself as a language model or AI assistant by Google unless specifically instructed in the prompt above.
Follow the above instructions and introduce yourself accordingly.`;

		// Gửi prompt cài đặt và nhận phản hồi ban đầu từ model
		const result = await chatSession.session.sendMessage(setupPrompt);
		const introduction = result.response.text();

		// Xóa các phần không cần thiết từ lịch sử chat để người dùng không thấy prompt setup
		// (Lưu ý: Gemini API hiện không hỗ trợ xóa lịch sử, nhưng chúng ta có thể giấu nó khỏi người dùng)

		return introduction;
	} catch (error) {
		console.error("Error initializing agent with prompt:", error);
		return "Xin chào! Tôi có thể giúp gì cho bạn hôm nay?";
	}
};

export const changeModel = (modelId: string) => {
	if (modelId !== currentModel) {
		currentModel = modelId;
		// Keep the current file data when changing models
		return startNewChat(modelId, chatSession?.fileData, chatSession?.fileName);
	}
	return chatSession;
};

export const getCurrentModel = () => currentModel;

// Function to set file for current session
export const setFileForCurrentSession = (fileData: FileData, fileName: string) => {
	if (chatSession) {
		chatSession.fileData = fileData;
		chatSession.fileName = fileName;
	} else {
		// If no session exists, create one with the file
		startNewChat(currentModel, fileData, fileName);
	}
};

// Function to get current file from session
export const getCurrentFile = () => {
	if (chatSession?.fileData) {
		return {
			fileData: chatSession.fileData,
			fileName: chatSession.fileName
		};
	}
	return null;
};

// Improved stateless function for sending messages, suitable for ExamTakingPage
export async function sendMessageToGemini(
	message: string,
	modelIdToUse: string, // Expect exam's modelId here
	fileData?: FileData,
	fileName?: string, // Not directly used by API but good for context/logging
	systemPromptText?: string
) {
	try {
		const effectiveModelId = modelIdToUse || "gemini-2.0-flash"; // Fallback to Gemini 2.0 Flash

		if (!message && !fileData) {
			return ""; // Nothing to send
		}

		const systemInstruction: SystemInstruction | undefined = systemPromptText
			? { role: "system", parts: [{ text: systemPromptText }] }
			: undefined;

		// Initialize model directly for this call
		const model = genAI.getGenerativeModel({
			model: effectiveModelId,
			generationConfig,
			// WARNING: The 'safetySettings' line below is where the "HarmCategory is undefined" error
			// often occurs in client-side execution. This is a limitation of using the SDK directly in the browser.
			safetySettings,
			...(systemInstruction && { systemInstruction }),
		});

		const messageParts: Part[] = [];
		
		// Handle potential conversation history in message
		// If message contains clear markers for a conversation, process it to create a multi-turn context
		if (message.includes("User:") && message.includes("Assistant:")) {
			// For now, just pass it as a regular message - the context building is handled by exam-taking-page.tsx
			messageParts.push({ text: message });
		} else {
			// Regular message
			messageParts.push({ text: message });
		}

		if (fileData) {
			const base64Data = typeof fileData.data === 'string'
				? fileData.data
				: Buffer.from(fileData.data).toString('base64');
			messageParts.push({
				inlineData: {
					mimeType: fileData.mimeType,
					data: base64Data
				}
			});
		}

		if (messageParts.length === 0) {
			return "Không có nội dung để gửi.";
		}
        
        const contents: Content[] = [{ role: "user", parts: messageParts }];
        
		const result = await model.generateContent({ contents });
		const response = result.response;
		return response.text();

	} catch (error) {
		console.error("Lỗi Gemini API trong sendMessageToGemini:", error);
		if (error instanceof Error) {
			if (error.message.toLowerCase().includes("safety")) {
				return "Nội dung của bạn vi phạm chính sách an toàn và không thể xử lý.";
			}
			// Check for the HarmCategory error specifically
			if (error.message.includes("HarmCategory") || error.message.includes("HarmBlockThreshold")) {
				console.error("SDK Compatibility Issue: HarmCategory or HarmBlockThreshold is undefined. This typically occurs when using the SDK directly on the client-side. Consider moving API calls to server-side routes.");
				return "Lỗi cấu hình SDK phía client. Vui lòng liên hệ quản trị viên.";
			}
		}
		return "Xin lỗi, tôi không thể trả lời ngay bây giờ do lỗi kỹ thuật.";
	}
}

// For file handling
export interface FileData {
	mimeType: string;
	data: string | ArrayBuffer;  // Base64 string or ArrayBuffer
	fileName?: string;  // Make fileName optional but include it in the interface
}

// Stateless function for processing files, suitable for ExamTakingPage
export const processFileWithGemini = async (
	promptText: string,
	fileData: FileData,
	modelIdToUse: string, // Expect exam's modelId here
	systemPromptText?: string
): Promise<string> => {
	try {
		const effectiveModelId = modelIdToUse || "gemini-2.0-flash"; // Fallback to Gemini 2.0 Flash

		if (!fileData) {
			console.error("processFileWithGemini: fileData is required.");
			return "Lỗi: Dữ liệu tệp không được cung cấp.";
		}

		const systemInstruction: SystemInstruction | undefined = systemPromptText
			? { role: "system", parts: [{ text: systemPromptText }] }
			: undefined;

		// Initialize model directly for this call
		const model = genAI.getGenerativeModel({
			model: effectiveModelId,
			generationConfig,
			// WARNING: The 'safetySettings' line below is where the "HarmCategory is undefined" error
			// often occurs in client-side execution. This is a limitation of using the SDK directly in the browser.
			safetySettings,
			...(systemInstruction && { systemInstruction }),
		});

		const base64Data = typeof fileData.data === 'string'
			? fileData.data
			: Buffer.from(fileData.data).toString('base64');

		const enhancedPromptForFile = `${promptText}\n\nHƯỚNG DẪN XỬ LÝ TÀI LIỆU QUAN TRỌNG:
- Hãy đọc và xử lý TOÀN BỘ tài liệu, từ đầu đến cuối, không bỏ sót phần nào.
- Phân tích cẩn thận mọi nội dung.
- Khi trả lời, hãy trích dẫn các phần cụ thể của tài liệu nếu có liên quan.
- Đảm bảo phản hồi đầy đủ và chi tiết.`;

		const parts: Part[] = [
			{ text: enhancedPromptForFile },
			{
				inlineData: {
					mimeType: fileData.mimeType,
					data: base64Data
				}
			}
		];
        
        const contents: Content[] = [{ role: "user", parts }];

		const result = await model.generateContent({ contents });
		const response = result.response;
		return response.text();

	} catch (error) {
		console.error("Lỗi xử lý tài liệu với Gemini:", error);
		if (error instanceof Error) {
			if (error.message.toLowerCase().includes("safety")) {
				return "Nội dung trong tệp của bạn vi phạm chính sách an toàn và không thể xử lý.";
			}
			// Check for the HarmCategory error specifically
			if (error.message.includes("HarmCategory") || error.message.includes("HarmBlockThreshold")) {
				console.error("SDK Compatibility Issue: HarmCategory or HarmBlockThreshold is undefined. This typically occurs when using the SDK directly on the client-side. Consider moving API calls to server-side routes.");
				return "Lỗi cấu hình SDK phía client. Vui lòng liên hệ quản trị viên.";
			}
		}
		return "Xin lỗi, không thể xử lý tài liệu này do lỗi kỹ thuật.";
	}
};

// For demo purposes, kept but modified for better integration
export const processPdf = async (pdfUrl: string, prompt: string = "Summarize this document"): Promise<string> => {
	try {
		const pdfResp = await fetch(pdfUrl).then(response => response.arrayBuffer());

		return await processFileWithGemini(
			prompt,
			{
				mimeType: 'application/pdf',
				data: pdfResp
			},
			"gemini-2.0-flash" // Default model ID
		);
	} catch (error) {
		console.error("Lỗi xử lý PDF:", error);
		return "Xin lỗi, không thể xử lý PDF này.";
	}
};