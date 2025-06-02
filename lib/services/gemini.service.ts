import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export class GeminiService {
    // Sử dụng model mới thay vì gemini-pro
    private static model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash" // hoặc "gemini-1.5-pro"
    });

    static async generateSystemMasterResponse(
        userMessage: string,
        systemContext: any
    ): Promise<string> {
        try {
            // Kiểm tra API key
            if (!process.env.GOOGLE_GEMINI_API_KEY) {
                console.warn("Gemini API key not found, using fallback response");
                return this.getFallbackResponse(userMessage, systemContext);
            }

            const prompt = this.buildSystemMasterPrompt(userMessage, systemContext);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;

            const text = response.text();

            // Kiểm tra nếu response rỗng
            if (!text || text.trim().length === 0) {
                return this.getFallbackResponse(userMessage, systemContext);
            }

            return text;
        } catch (error) {
            console.error("Gemini API Error:", error);
            return this.getFallbackResponse(userMessage, systemContext);
        }
    }

    private static buildSystemMasterPrompt(userMessage: string, systemContext: any): string {
        return `
Bạn là System Master Assistant - trợ lý AI chuyên nghiệp quản lý hệ thống LMS (Learning Management System).

THÔNG TIN HỆ THỐNG HIỆN TẠI:
📊 Người dùng: ${systemContext.totalUsers || 0} tổng cộng (${systemContext.newUsersToday || 0} mới hôm nay)
🖥️ Server: ${systemContext.totalServers || 0} server với ${systemContext.totalMembers || 0} thành viên
💬 Tin nhắn: ${systemContext.messagesToday || 0} hôm nay / ${systemContext.totalMessages || 0} tổng cộng
📚 Model AI: ${systemContext.totalModels || 0} (${systemContext.activeModels || 0} hoạt động)
📝 Lĩnh vực học: ${systemContext.totalFields || 0} lĩnh vực
📋 Bài thi: ${systemContext.totalExams || 0} bài thi (${systemContext.activeExams || 0} hoạt động)
✏️ Bài tập: ${systemContext.totalExercises || 0} bài tập

NHIỆM VỤ CỦA BẠN:
1. Phân tích và trả lời câu hỏi về hệ thống
2. Cung cấp thống kê chính xác và có ý nghĩa
3. Đưa ra khuyến nghị cải thiện hệ thống
4. Giải thích các vấn đề kỹ thuật một cách dễ hiểu
5. Hỗ trợ quản trị viên trong việc ra quyết định

PHONG CÁCH TRẢ LỜI:
- Chuyên nghiệp, chính xác và hữu ích
- Sử dụng emoji và format markdown để dễ đọc
- Đưa ra con số cụ thể từ dữ liệu hệ thống
- Gợi ý hành động tiếp theo khi phù hợp
- Trả lời bằng tiếng Việt
- Giữ câu trả lời ngắn gọn và dễ hiểu

CÂU HỎI CỦA NGƯỜI DÙNG: "${userMessage}"

Hãy phân tích câu hỏi và đưa ra câu trả lời chi tiết, chính xác dựa trên dữ liệu hệ thống hiện tại.
`;
    }

    private static getFallbackResponse(userMessage: string, systemContext?: any): string {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('code') || lowerMessage.includes('example')) {
            return `🔧 **Code Example - Database Query:**

\`\`\`sql
-- Get user statistics
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN createdAt >= CURDATE() THEN 1 END) as new_today
FROM profiles 
WHERE role != 'ADMIN';
\`\`\`

\`\`\`typescript
// System monitoring function
async function getSystemStats() {
  const stats = await db.profile.aggregate({
    _count: { id: true },
    _max: { createdAt: true }
  });
  
  return {
    totalUsers: stats._count.id,
    lastUserCreated: stats._max.createdAt
  };
}
\`\`\`

📊 **Current System Status:**
- Total Users: **${systemContext?.totalUsers || 0}**
- New Today: **${systemContext?.newUsersToday || 0}**

> 💡 **Tip:** I can help with code examples, database queries, and system configurations!`;
        }

        if (lowerMessage.includes('help') || lowerMessage.includes('giúp')) {
            return `🤖 **System Master Assistant** - Markdown Support

## 📊 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| \`users\` | User statistics | Show user data |
| \`servers\` | Server information | Server status |
| \`messages\` | Message stats | Communication data |
| \`learning\` | Learning system | AI models & fields |
| \`analysis\` | System analysis | Performance insights |

## 🎯 Markdown Features

- **Bold text** with \`**bold**\`
- \`Inline code\` with \`\`code\`\`
- Code blocks with \`\`\`language\`\`\`
- Tables, lists, and links
- > Blockquotes for important notes

## 💡 Quick Tips

1. **Natural Language**: Ask questions naturally
2. **Code Examples**: Request specific code samples  
3. **System Queries**: Get real-time system data
4. **Analysis**: Deep insights about your LMS

Try asking: *"Show me user growth trends"* or *"Generate a database query for active users"*`;
        }

        if (lowerMessage.includes('user') || lowerMessage.includes('người dùng')) {
            return `👥 **Thống kê người dùng:**
- Tổng cộng: **${systemContext?.totalUsers || 0}** người dùng
- Mới hôm nay: **${systemContext?.newUsersToday || 0}** người
- Admin: **${systemContext?.adminUsers || 0}** người
- Hoạt động 24h: **${systemContext?.activeUsers24h || 0}** người

📈 Hệ thống đang ${systemContext?.newUsersToday > 0 ? 'phát triển tích cực' : 'ổn định'}.`;
        }

        if (lowerMessage.includes('server') || lowerMessage.includes('máy chủ')) {
            return `🖥️ **Thông tin Server:**
- Tổng server: **${systemContext?.totalServers || 0}** server
- Tổng thành viên: **${systemContext?.totalMembers || 0}** người
- Trung bình: **${systemContext?.totalServers > 0 ? Math.round((systemContext?.totalMembers || 0) / systemContext.totalServers) : 0}** thành viên/server

✅ Tất cả server đang hoạt động bình thường.`;
        }

        if (lowerMessage.includes('message') || lowerMessage.includes('tin nhắn')) {
            return `💬 **Thống kê tin nhắn:**
- Hôm nay: **${systemContext?.messagesToday || 0}** tin nhắn
- Tổng cộng: **${systemContext?.totalMessages || 0}** tin nhắn
- Trung bình: **${systemContext?.totalUsers > 0 ? Math.round((systemContext?.totalMessages || 0) / systemContext.totalUsers) : 0}** tin nhắn/người

📊 Mức độ tương tác: ${systemContext?.messagesToday > 100 ? 'Cao' : systemContext?.messagesToday > 50 ? 'Trung bình' : 'Thấp'}`;
        }

        if (lowerMessage.includes('model') || lowerMessage.includes('học tập') || lowerMessage.includes('learning')) {
            return `🎓 **Hệ thống học tập:**
- Model AI: **${systemContext?.totalModels || 0}** model (${systemContext?.activeModels || 0} hoạt động)
- Lĩnh vực: **${systemContext?.totalFields || 0}** lĩnh vực học tập
- Chatbox: **${systemContext?.totalChatboxes || 0}** cuộc trò chuyện

🚀 Tỷ lệ model hoạt động: ${systemContext?.totalModels > 0 ? Math.round(((systemContext?.activeModels || 0) / systemContext.totalModels) * 100) : 0}%`;
        }

        if (lowerMessage.includes('exam') || lowerMessage.includes('bài thi') || lowerMessage.includes('exercise') || lowerMessage.includes('bài tập')) {
            return `📝 **Hệ thống đánh giá:**
- Bài thi: **${systemContext?.totalExams || 0}** bài (${systemContext?.activeExams || 0} hoạt động)
- Bài tập: **${systemContext?.totalExercises || 0}** bài tập
- Kết quả: **${(systemContext?.examResults || 0) + (systemContext?.exerciseResults || 0)}** lượt làm bài

📊 Tổng người tham gia: **${systemContext?.totalParticipants || 0}** người`;
        }

        if (lowerMessage.includes('help') || lowerMessage.includes('giúp')) {
            return `🤖 **System Master Assistant - Hướng dẫn**

📊 **Thống kê hệ thống:**
- "users" hoặc "người dùng" - Thông tin người dùng
- "servers" hoặc "máy chủ" - Thông tin server
- "messages" hoặc "tin nhắn" - Thống kê tin nhắn
- "learning" hoặc "học tập" - Hệ thống học tập
- "exams" hoặc "bài thi" - Hệ thống đánh giá

💡 **Mẹo:** Bạn có thể hỏi bằng ngôn ngữ tự nhiên như:
- "Có bao nhiều người dùng mới hôm nay?"
- "Tình trạng hệ thống như thế nào?"
- "Hiệu suất server ra sao?"`;
        }

        if (lowerMessage.includes('status') || lowerMessage.includes('tình trạng') || lowerMessage.includes('overview')) {
            return `📊 **Tổng quan hệ thống LMS:**

👥 **Người dùng:** ${systemContext?.totalUsers || 0} (+${systemContext?.newUsersToday || 0} hôm nay)
🖥️ **Server:** ${systemContext?.totalServers || 0} server, ${systemContext?.totalMembers || 0} thành viên  
💬 **Tin nhắn:** ${systemContext?.messagesToday || 0} hôm nay / ${systemContext?.totalMessages || 0} tổng
🎓 **Học tập:** ${systemContext?.activeModels || 0}/${systemContext?.totalModels || 0} model hoạt động
📝 **Đánh giá:** ${systemContext?.activeExams || 0} bài thi, ${systemContext?.totalExercises || 0} bài tập

✅ **Trạng thái:** Hệ thống hoạt động bình thường`;
        }

        return `🤖 **System Master Assistant**

Tôi có thể giúp bạn kiểm tra:
- 👥 Thông tin người dùng (users)
- 🖥️ Trạng thái server (servers) 
- 💬 Thống kê tin nhắn (messages)
- 🎓 Hệ thống học tập (learning)
- 📝 Bài thi và bài tập (exams)
- 📊 Tổng quan hệ thống (status)

Gõ "help" để xem hướng dẫn chi tiết!`;
    }

    static async generateSystemAnalysis(systemData: any): Promise<string> {
        try {
            if (!process.env.GOOGLE_GEMINI_API_KEY) {
                return this.getFallbackAnalysis(systemData);
            }

            const prompt = `
Bạn là System Master Assistant. Hãy phân tích tổng quan hệ thống LMS dựa trên dữ liệu sau:

DỮ LIỆU HỆ THỐNG:
${JSON.stringify(systemData, null, 2)}

Hãy đưa ra:
1. Tình trạng tổng quan hệ thống (1-2 câu)
2. Top 3 điểm mạnh của hệ thống
3. Top 3 điểm cần cải thiện
4. 2-3 khuyến nghị ưu tiên cao

Trả lời ngắn gọn, sử dụng markdown và emoji. Tối đa 300 từ.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;

            return response.text() || this.getFallbackAnalysis(systemData);
        } catch (error) {
            console.error("Gemini Analysis Error:", error);
            return this.getFallbackAnalysis(systemData);
        }
    }

    private static getFallbackAnalysis(systemData: any): string {
        const overview = systemData.overview || {};
        const users = overview.users || {};
        const servers = overview.servers || {};
        const messages = overview.messages || {};

        return `📊 **Phân tích hệ thống LMS**

🎯 **Tổng quan:** Hệ thống đang hoạt động ổn định với ${users.total || 0} người dùng và ${servers.total || 0} server.

💪 **Điểm mạnh:**
- Cơ sở người dùng: ${users.total || 0} người dùng
- Tương tác tích cực: ${messages.today || 0} tin nhắn hôm nay
- Hạ tầng ổn định: ${servers.total || 0} server hoạt động

⚠️ **Cần cải thiện:**
- Tăng tương tác người dùng mới
- Tối ưu hiệu suất hệ thống  
- Mở rộng tính năng học tập

🚀 **Khuyến nghị:**
- Triển khai chương trình onboarding cho người dùng mới
- Giám sát hiệu suất server thường xuyên
- Phát triển thêm content học tập`;
    }

    static async generateRecommendations(
        userActivity: any,
        systemPerformance: any
    ): Promise<string> {
        try {
            if (!process.env.GOOGLE_GEMINI_API_KEY) {
                return this.getFallbackRecommendations(userActivity, systemPerformance);
            }

            const prompt = `
Dựa trên dữ liệu sau, đưa ra 5 khuyến nghị cải thiện hệ thống LMS:

HOẠT ĐỘNG NGƯỜI DÙNG: ${JSON.stringify(userActivity)}
HIỆU SUẤT HỆ THỐNG: ${JSON.stringify(systemPerformance)}

Mỗi khuyến nghị gồm:
- Tiêu đề ngắn
- Lý do (1 câu)
- Cách thực hiện (1-2 câu)

Trả lời ngắn gọn, sử dụng markdown. Tối đa 250 từ.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;

            return response.text() || this.getFallbackRecommendations(userActivity, systemPerformance);
        } catch (error) {
            console.error("Gemini Recommendations Error:", error);
            return this.getFallbackRecommendations(userActivity, systemPerformance);
        }
    }

    private static getFallbackRecommendations(userActivity: any, systemPerformance: any): string {
        return `🎯 **Khuyến nghị cải thiện hệ thống**

1. **📈 Tăng tương tác người dùng**
   - Lý do: ${userActivity.messagesPerDay || 0} tin nhắn/ngày còn thấp
   - Thực hiện: Tạo sự kiện, thảo luận nhóm, gamification

2. **⚡ Tối ưu hiệu suất server**
   - Lý do: ${systemPerformance.averageMembersPerServer || 0} thành viên/server
   - Thực hiện: Cân bằng tải, nâng cấp hardware

3. **🎓 Mở rộng nội dung học tập**
   - Lý do: Cần đa dạng hóa trải nghiệm học tập
   - Thực hiện: Thêm video, quiz tương tác, AI chatbot

4. **🔒 Tăng cường bảo mật**
   - Lý do: Bảo vệ dữ liệu người dùng
   - Thực hiện: 2FA, mã hóa dữ liệu, audit log

5. **📊 Cải thiện analytics**
   - Lý do: Cần insights để ra quyết định
   - Thực hiện: Dashboard real-time, báo cáo tự động`;
    }
}