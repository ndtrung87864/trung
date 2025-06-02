"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    MessageSquare,
    Send,
    Bot,
    User,
    ArrowLeft,
    Settings,
    Activity,
    Zap,
    Brain,
    Loader2,
    Copy,
    Check,
    Code,
    Monitor,
    Database,
    FileText,
    Cpu,
    Network,
    Shield,
    ChevronDown,
    Star,
    Clock,
    Sparkles,
    BarChart3,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Terminal,
    Layers,
    GitBranch,
    HardDrive,
    MemoryStick,
    Wifi,
    Lock,
    Target,
    Award,
    TrendingDown,
    XCircle,
    PieChart,
    LineChart
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SystemMessage {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    metadata?: {
        type?: string;
        category?: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        tags?: string[];
    };
}

interface SystemMasterChatProps {
    sessionId: string;
}

// Enhanced Code Block Component - Tiếng Việt
const EnhancedCodeBlock = ({ language, children }: { language: string, children: string }) => {
    const [copied, setCopied] = useState(false);

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            toast.success("Đã sao chép mã!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Không thể sao chép");
        }
    };

    return (
        <div className="relative group my-3 w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                    <Code className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                        {language || 'mã'}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={copyCode}
                >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
            </div>
            <div className="bg-gray-950 text-gray-100 p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                    <code>{children}</code>
                </pre>
            </div>
        </div>
    );
};

// Các component Markdown khác giữ nguyên...
const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        const codeString = String(children).replace(/\n$/, '');

        if (!inline && (language || codeString.includes('\n'))) {
            return <EnhancedCodeBlock language={language} children={codeString} />;
        }

        return (
            <code
                className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md text-sm font-mono border border-blue-200 dark:border-blue-800"
                {...props}
            >
                {children}
            </code>
        );
    },

    pre({ children }: any) {
        return <>{children}</>;
    },

    blockquote({ children }: any) {
        return (
            <blockquote className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 pl-4 py-2 my-3 rounded-r-lg">
                <div className="text-blue-800 dark:text-blue-200 text-sm">{children}</div>
            </blockquote>
        );
    },

    table({ children }: any) {
        return (
            <div className="overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-sm">
                    {children}
                </table>
            </div>
        );
    },

    thead({ children }: any) {
        return <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">{children}</thead>;
    },

    tbody({ children }: any) {
        return <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>;
    },

    th({ children }: any) {
        return (
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                {children}
            </th>
        );
    },

    td({ children }: any) {
        return (
            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                {children}
            </td>
        );
    },

    ul({ children }: any) {
        return <ul className="list-none my-2 space-y-1 text-sm">{children}</ul>;
    },

    ol({ children }: any) {
        return <ol className="list-decimal list-inside my-2 space-y-1 pl-4 text-sm">{children}</ol>;
    },

    li({ children }: any) {
        return (
            <li className="text-gray-700 dark:text-gray-300 text-sm flex items-start gap-2">
                <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span>{children}</span>
            </li>
        );
    },

    h1({ children }: any) {
        return <h1 className="text-lg font-bold my-3 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h1>;
    },

    h2({ children }: any) {
        return <h2 className="text-base font-semibold my-2 text-gray-900 dark:text-gray-100">{children}</h2>;
    },

    h3({ children }: any) {
        return <h3 className="text-sm font-medium my-2 text-gray-900 dark:text-gray-100">{children}</h3>;
    },

    p({ children }: any) {
        return <p className="my-2 leading-relaxed text-sm text-gray-700 dark:text-gray-300">{children}</p>;
    },

    a({ href, children }: any) {
        return (
            <a
                href={href}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 hover:decoration-blue-500 text-sm font-medium"
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
            </a>
        );
    },

    strong({ children }: any) {
        return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>;
    },

    em({ children }: any) {
        return <em className="italic text-gray-700 dark:text-gray-300">{children}</em>;
    }
};

export function SystemMasterChat({ sessionId }: SystemMasterChatProps) {
    const [messages, setMessages] = useState<SystemMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        fetchMessages();
        const interval = loading ?
            setInterval(fetchMessages, 5000) :
            setInterval(fetchMessages, 30000);
        return () => clearInterval(interval);
    }, [sessionId, loading]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const response = await fetch(`/api/system-master/chat/${sessionId}/messages`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Lỗi tải tin nhắn:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Fetch comprehensive data từ API mới
    const fetchComprehensiveData = async () => {
        try {
            const response = await fetch('/api/system-master/comprehensive-data');
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu toàn diện:', error);
        }
        return null;
    };

    // Enhanced response generator với tiếng Việt
    const generateMockResponse = async (userInput: string): Promise<string> => {
        const input = userInput.toLowerCase();
        const comprehensiveData = await fetchComprehensiveData();

        if (!comprehensiveData) {
            return "⚠️ **Không thể tải dữ liệu hệ thống**. Vui lòng kiểm tra kết nối hệ thống.";
        }

        // Extract data từ comprehensiveData
        const { models, servers, fields, users, systemHealth } = comprehensiveData;

        // 1. AI Models Analysis - Tiếng Việt
        if (input.includes('model') || input.includes('mô hình') || input.includes('ai')) {
            return `# 🧠 **Phân Tích Toàn Diện Mô Hình AI**

## 📊 **Tổng Quan Hệ Thống**
- **Tổng Mô Hình AI**: ${models.length}
- **Tổng Đánh Giá**: ${systemHealth.totalAssessments.toLocaleString()}
- **Điểm Trung Bình Hệ Thống**: ${systemHealth.avgSystemScore.toFixed(2)}/10
- **Tổng Hộp Chat**: ${systemHealth.totalChatboxes.toLocaleString()}

## 🏆 **Xếp Hạng Hiệu Suất Mô Hình**

${models.sort((a: any, b: any) => b.avgScore - a.avgScore).map((model: any, index: number) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const performance = model.avgScore >= 8 ? '🟢 Xuất sắc' : model.avgScore >= 6 ? '🟡 Tốt' : model.avgScore >= 4 ? '🟠 Trung bình' : '🔴 Kém';

                return `### ${medal} **${model.name}**
| Chỉ Số | Giá Trị | Chi Tiết |
|--------|--------|---------|
| **Điểm Trung Bình** | ${model.avgScore}/10 | ${performance} |
| **Tổng Bài Thi** | ${model.totalExams} | Hoạt động đánh giá |
| **Tổng Bài Tập** | ${model.totalExercises} | Hoạt động luyện tập |
| **Tổng Kết Quả** | ${model.totalResults.toLocaleString()} | Bài nộp của học sinh |
| **Sử Dụng Chatbox** | ${model.totalChatboxes} | Cuộc trò chuyện AI |
| **Phân Phối Điểm** | Xuất sắc: ${model.scoreDistribution.excellent}, Tốt: ${model.scoreDistribution.good}, Trung bình: ${model.scoreDistribution.average}, Kém: ${model.scoreDistribution.poor} | Phân tích hiệu suất |

**Sử Dụng Máy Chủ:**
${Object.entries(model.serverUsage).map(([server, data]: [string, any]) =>
                    `- **${server}**: ${data.exams} bài thi, ${data.exercises} bài tập, ${data.totalResults} kết quả`
                ).join('\n')}

**Hiệu Suất**: ${model.performance} | **Tạo**: ${new Date(model.createdAt).toLocaleDateString('vi-VN')}

---`;
            }).join('\n')}

## 📈 **Phân Phối Sử Dụng Mô Hình**
${Object.entries(systemHealth.modelDistribution).map(([modelName, count]) =>
                `- **${modelName}**: ${count} tổng kết quả`
            ).join('\n')}

## 🎯 **Khuyến Nghị**
1. **Người Dẫn Đầu**: Tập trung vào việc sao chép các mẫu thành công của ${models[0]?.name}
2. **Cần Cải Thiện**: Các mô hình có điểm trung bình < 6.0 cần tối ưu hóa
3. **Tối Ưu Sử Dụng**: Cân bằng tải trên các mô hình hiệu suất cao
4. **Phân Phối Điểm**: Giải quyết các mô hình có điểm "Kém" cao`;
        }

        // 2. Server Analysis - Tiếng Việt
        if (input.includes('server') || input.includes('máy chủ') || input.includes('server performance')) {
            return `# 🖥️ **Phân Tích Hiệu Suất Máy Chủ**

## 📊 **Tổng Quan Máy Chủ**
- **Tổng Máy Chủ**: ${servers.length}
- **Tổng Thành Viên**: ${servers.reduce((sum: number, s: any) => sum + s.memberCount, 0).toLocaleString()}
- **Tổng Kênh**: ${servers.reduce((sum: number, s: any) => sum + s.channelCount, 0)}
- **Hoạt Động Nhất**: ${systemHealth.serverActivity[0]?.name || 'Không có'}

## 🏆 **Xếp Hạng Hiệu Suất Máy Chủ**

${servers.sort((a: any, b: any) => b.avgScore - a.avgScore).map((server: any, index: number) => {
                const rank = index + 1;
                const performance = server.avgScore >= 8 ? '🟢 Xuất sắc' : server.avgScore >= 6 ? '🟡 Tốt' : server.avgScore >= 4 ? '🟠 Trung bình' : '🔴 Kém';

                return `### ${rank}. **${server.name}**
| Chỉ Số | Giá Trị | Trạng Thái |
|--------|--------|------------|
| **Điểm Trung Bình** | ${server.avgScore}/10 | ${performance} |
| **Thành Viên** | ${server.memberCount.toLocaleString()} | ${server.activity.activeMembers} hoạt động (7 ngày) |
| **Kênh** | ${server.channelCount} | Phân phối nội dung |
| **Tổng Bài Thi** | ${server.totalExams} | Khối lượng đánh giá |
| **Tổng Bài Tập** | ${server.totalExercises} | Khối lượng luyện tập |
| **Tổng Kết Quả** | ${server.totalResults.toLocaleString()} | Bài nộp học sinh |
| **Hoạt Động Gần Đây** | ${server.activity.recentResults} kết quả (7 ngày) | Mức độ hoạt động |

**Sử Dụng Mô Hình AI:**
${Object.entries(server.modelUsage).map(([model, data]: [string, any]) =>
                    `- **${model}**: ${data.count} hoạt động, ${data.results} kết quả`
                ).join('\n')}

**Tạo**: ${new Date(server.createdAt).toLocaleDateString('vi-VN')}

---`;
            }).join('\n')}

## 📈 **Thông Tin Hoạt Động Máy Chủ**
- **Hoạt Động Nhất**: ${systemHealth.serverActivity[0]?.name} (${systemHealth.serverActivity[0]?.totalResults} kết quả)
- **Điểm Cao Nhất**: ${servers.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.name} (${servers.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.avgScore}/10)
- **Cộng Đồng Lớn Nhất**: ${servers.sort((a: any, b: any) => b.memberCount - a.memberCount)[0]?.name} (${servers.sort((a: any, b: any) => b.memberCount - a.memberCount)[0]?.memberCount} thành viên)`;
        }

        // 3. Field/Subject Analysis - Tiếng Việt
        if (input.includes('field') || input.includes('lĩnh vực') || input.includes('môn học') || input.includes('chương trình')) {
            return `# 📚 **Phân Tích Lĩnh Vực/Môn Học**

## 📊 **Tổng Quan Chương Trình**
- **Tổng Lĩnh Vực**: ${fields.length}
- **Phổ Biến Nhất**: ${fields.sort((a: any, b: any) => b.popularityScore - a.popularityScore)[0]?.name}
- **Điểm Cao Nhất**: ${fields.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.name}
- **Thách Thức Nhất**: ${fields.sort((a: any, b: any) => a.avgScore - b.avgScore)[0]?.name}

## 🎯 **Phân Tích Hiệu Suất Lĩnh Vực**

${fields.sort((a: any, b: any) => b.popularityScore - a.popularityScore).map((field: any, index: number) => {
                const rank = index + 1;
                const difficulty = field.avgScore >= 7 ? '🟢 Dễ' : field.avgScore >= 5 ? '🟡 Trung bình' : field.avgScore >= 3 ? '🟠 Khó' : '🔴 Rất khó';

                return `### ${rank}. **${field.name}**
${field.description ? `*${field.description}*` : ''}

| Chỉ Số | Giá Trị | Phân Tích |
|--------|--------|-----------|
| **Điểm Trung Bình** | ${field.avgScore}/10 | ${difficulty} |
| **Kênh** | ${field.channelCount} | Phân phối nội dung |
| **Tổng Bài Thi** | ${field.totalExams} | Khối lượng đánh giá |
| **Tổng Bài Tập** | ${field.totalExercises} | Hoạt động luyện tập |
| **Tổng Kết Quả** | ${field.totalResults.toLocaleString()} | Sự tham gia của học sinh |
| **Sử Dụng Chatbox** | ${field.totalChatboxes} | Yêu cầu hỗ trợ AI |
| **Điểm Phổ Biến** | ${field.popularityScore} | Sự tham gia tổng thể |
| **Mức Độ Khó** | ${field.difficulty} | Dựa trên hiệu suất học sinh |

---`;
            }).join('\n')}

## 📊 **Hiểu Biết Chương Trình**
- **Môn Dễ Nhất**: ${fields.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.name} (${fields.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.avgScore}/10)
- **Thách Thức Nhất**: ${fields.sort((a: any, b: any) => a.avgScore - b.avgScore)[0]?.name} (${fields.sort((a: any, b: any) => a.avgScore - b.avgScore)[0]?.avgScore}/10)
- **Hấp Dẫn Nhất**: ${fields.sort((a: any, b: any) => b.popularityScore - a.popularityScore)[0]?.name} (${fields.sort((a: any, b: any) => b.popularityScore - a.popularityScore)[0]?.popularityScore} điểm tham gia)

## 🎯 **Khuyến Nghị Giáo Dục**
1. **Lĩnh Vực Trọng Tâm**: Các môn có điểm trung bình < 5.0 cần xem xét chương trình
2. **Mô Hình Thành Công**: Sao chép phương pháp của các môn có điểm cao
3. **Sự Tham Gia**: Tăng hỗ trợ chatbox cho các môn khó
4. **Cân Bằng Nội Dung**: Đảm bảo tỷ lệ bài thi/bài tập phù hợp cho tất cả lĩnh vực`;
        }

        // 4. User Analytics - Tiếng Việt
        if (input.includes('user') || input.includes('người dùng') || input.includes('học sinh') || input.includes('analytics')) {
            const { performanceTrends, examResults, exerciseResults } = comprehensiveData;

            // Calculate user performance trends
            const userPerformance: Record<string, any> = {};
            [...examResults, ...exerciseResults].forEach((result: any) => {
                if (result.userName) {
                    if (!userPerformance[result.userName]) {
                        userPerformance[result.userName] = { scores: [], count: 0, avgScore: 0 };
                    }
                    userPerformance[result.userName].scores.push(result.score);
                    userPerformance[result.userName].count++;
                }
            });

            Object.keys(userPerformance).forEach(userName => {
                const data = userPerformance[userName];
                data.avgScore = data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length;
            });

            const topPerformers = Object.entries(userPerformance)
                .sort(([, a], [, b]) => (b as any).avgScore - (a as any).avgScore)
                .slice(0, 10);

            return `# 👥 **Phân Tích Người Dùng & Sự Tham Gia**

## 📊 **Tổng Quan Cơ Sở Người Dùng**
- **Tổng Người Dùng**: ${users.totalUsers.toLocaleString()}
- **Người Dùng Hoạt Động (7 ngày)**: ${users.activeUsers.toLocaleString()}
- **Người Dùng Mới (30 ngày)**: ${users.newUsers.toLocaleString()}
- **Tỷ Lệ Hoạt Động**: ${((users.activeUsers / users.totalUsers) * 100).toFixed(1)}%

## 👑 **Phân Phối Người Dùng**
- **Quản Trị Viên**: ${users.usersByRole.ADMIN}
- **Người Dùng Thường**: ${users.usersByRole.USER}
- **Chủ Máy Chủ**: ${users.serverOwners}
- **Trung Bình Máy Chủ/Người Dùng**: ${users.avgServersPerUser.toFixed(1)}

## 🏆 **Học Sinh Xuất Sắc Nhất**

${topPerformers.map(([userName, data], index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const performance = (data as any).avgScore >= 8 ? '🟢 Xuất sắc' : (data as any).avgScore >= 6 ? '🟡 Tốt' : (data as any).avgScore >= 4 ? '🟠 Trung bình' : '🔴 Kém';

                return `### ${medal} **${userName}**
- **Điểm Trung Bình**: ${(data as any).avgScore.toFixed(2)}/10 ${performance}
- **Tổng Bài Nộp**: ${(data as any).count}
- **Khoảng Điểm**: ${Math.min(...(data as any).scores).toFixed(1)} - ${Math.max(...(data as any).scores).toFixed(1)}`;
            }).join('\n\n')}

## 📈 **Xu Hướng Hiệu Suất**

### Hoạt Động Hàng Ngày:
${Object.entries(performanceTrends.daily).slice(-7).map(([date, data]) =>
                `- **${new Date(date).toLocaleDateString('vi-VN')}**: ${(data as any).count} bài nộp, điểm trung bình ${(data as any).avgScore.toFixed(2)}/10`
            ).join('\n')}

## 🎯 **Hiểu Biết Sự Tham Gia**
- **Ngày Hoạt Động Nhất**: ${Object.entries(performanceTrends.daily).sort(([, a], [, b]) => (b as any).count - (a as any).count)[0]?.[0]}
- **Ngày Hiệu Suất Tốt Nhất**: ${Object.entries(performanceTrends.daily).sort(([, a], [, b]) => (b as any).avgScore - (a as any).avgScore)[0]?.[0]}
- **Tỷ Lệ Giữ Chân**: ${((users.activeUsers / users.totalUsers) * 100).toFixed(1)}% giữ chân hàng tuần
- **Tỷ Lệ Tăng Trưởng**: ${users.newUsers > 0 ? '+' : ''}${users.newUsers} người dùng mới trong kỳ này

## 💡 **Khuyến Nghị Trải Nghiệm Người Dùng**
1. **Sự Tham Gia**: Tập trung kích hoạt ${users.totalUsers - users.activeUsers} người dùng không hoạt động
2. **Hiệu Suất**: Hỗ trợ học sinh có điểm trung bình < 6.0
3. **Giữ Chân**: Thực hiện chiến lược cho ${users.usersByRole.USER} người dùng thường
4. **Tăng Trưởng**: Xu hướng tăng trưởng hiện tại cho thấy ${users.newUsers > 0 ? 'tích cực' : 'cần chú ý'} về thu hút người dùng`;
        }

        // 5. System Health & Performance - Tiếng Việt
        if (input.includes('system') || input.includes('hệ thống') || input.includes('health') || input.includes('sức khỏe') || input.includes('overview')) {
            return `# 🖥️ **Bảng Điều Khiển Sức Khỏe & Hiệu Suất Hệ Thống**

## 🚀 **Trạng Thái Hệ Thống: ${systemHealth.avgSystemScore >= 7 ? '🟢 XUẤT SẮC' : systemHealth.avgSystemScore >= 5 ? '🟡 TỐT' : '🔴 CẦN CHÚ Ý'}**

### 📊 **Chỉ Số Cốt Lõi**
- **Điểm Tổng Thể Hệ Thống**: ${systemHealth.avgSystemScore.toFixed(2)}/10
- **Tổng Đánh Giá**: ${systemHealth.totalAssessments.toLocaleString()}
- **Cuộc Trò Chuyện AI**: ${systemHealth.totalChatboxes.toLocaleString()}
- **Người Dùng Hoạt Động**: ${users.activeUsers.toLocaleString()} / ${users.totalUsers.toLocaleString()} (${((users.activeUsers / users.totalUsers) * 100).toFixed(1)}%)

### 🧠 **Cơ Sở Hạ Tầng AI**
- **Mô Hình AI**: ${models.length} mô hình hoạt động
- **Mô Hình Hiệu Suất Tốt Nhất**: ${models.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.name} (${models.sort((a: any, b: any) => b.avgScore - a.avgScore)[0]?.avgScore}/10)
- **Mô Hình Được Sử Dụng Nhiều Nhất**: ${Object.entries(systemHealth.modelDistribution).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0]} (${Object.entries(systemHealth.modelDistribution).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[1]} lần sử dụng)

### 🖥️ **Cơ Sở Hạ Tầng Máy Chủ**
- **Tổng Máy Chủ**: ${servers.length}
- **Tổng Kênh**: ${servers.reduce((sum: number, s: any) => sum + s.channelCount, 0)}
- **Máy Chủ Hoạt Động Nhất**: ${systemHealth.serverActivity[0]?.name} (${systemHealth.serverActivity[0]?.totalResults} kết quả)
- **Quy Mô Cộng Đồng**: ${servers.reduce((sum: number, s: any) => sum + s.memberCount, 0).toLocaleString()} tổng thành viên

### 📚 **Hiệu Suất Nội Dung**
- **Lĩnh Vực Hàng Đầu**: ${systemHealth.topFields.slice(0, 3).map((f: any) => f.name).join(', ')}
- **Sử Dụng Nội Dung**: ${systemHealth.totalAssessments > 1000 ? '🟢 Cao' : systemHealth.totalAssessments > 500 ? '🟡 Trung bình' : '🔴 Thấp'}
- **Sử Dụng Hỗ Trợ AI**: ${systemHealth.totalChatboxes > 100 ? '🟢 Hoạt động' : '🟡 Vừa phải'}

### ⚡ **Chỉ Số Hiệu Suất**

| Thành Phần | Trạng Thái | Điểm | Xu Hướng |
|------------|------------|------|----------|
| **Mô Hình AI** | ${models.filter((m: any) => m.avgScore >= 7).length}/${models.length} hoạt động tốt | ${(models.reduce((sum: number, m: any) => sum + m.avgScore, 0) / models.length).toFixed(1)}/10 | ${models.filter((m: any) => m.avgScore >= 7).length > models.length / 2 ? '📈 Tích cực' : '📉 Cần chú ý'} |
| **Mạng Máy Chủ** | ${servers.filter((s: any) => s.avgScore >= 6).length}/${servers.length} máy chủ khỏe mạnh | ${(servers.reduce((sum: number, s: any) => sum + s.avgScore, 0) / servers.length).toFixed(1)}/10 | ${servers.filter((s: any) => s.activity.recentResults > 0).length > servers.length / 2 ? '📈 Hoạt động' : '📊 Ổn định'} |
| **Sự Tham Gia Người Dùng** | ${((users.activeUsers / users.totalUsers) * 100).toFixed(1)}% tỷ lệ hoạt động | ${(users.activeUsers / users.totalUsers * 10).toFixed(1)}/10 | ${users.newUsers > 0 ? '📈 Tăng trưởng' : '📊 Ổn định'} |
| **Chất Lượng Nội Dung** | Điểm trung bình ${systemHealth.avgSystemScore.toFixed(1)}/10 | ${systemHealth.avgSystemScore.toFixed(1)}/10 | ${systemHealth.avgSystemScore >= 6 ? '📈 Tốt' : '⚠️ Cần xem xét'} |

### 🔧 **Danh Sách Kiểm Tra Sức Khỏe Hệ Thống**

#### ✅ **Thành Phần Khỏe Mạnh**
${[
                    systemHealth.avgSystemScore >= 6 ? '- Hiệu suất tổng thể hệ thống tốt' : null,
                    models.filter((m: any) => m.avgScore >= 7).length > 0 ? `- ${models.filter((m: any) => m.avgScore >= 7).length} mô hình AI hoạt động xuất sắc` : null,
                    users.activeUsers > users.totalUsers * 0.3 ? '- Mức độ tham gia người dùng tốt' : null,
                    systemHealth.totalAssessments > 100 ? '- Hoạt động đánh giá khỏe mạnh' : null
                ].filter(Boolean).join('\n')}

#### ⚠️ **Lĩnh Vực Cần Chú Ý**
${[
                    systemHealth.avgSystemScore < 6 ? '- Hiệu suất tổng thể hệ thống cần cải thiện' : null,
                    models.filter((m: any) => m.avgScore < 5).length > 0 ? `- ${models.filter((m: any) => m.avgScore < 5).length} mô hình AI hoạt động kém` : null,
                    users.activeUsers < users.totalUsers * 0.3 ? '- Tỷ lệ tham gia người dùng thấp' : null,
                    systemHealth.totalAssessments < 100 ? '- Hoạt động đánh giá thấp' : null
                ].filter(Boolean).join('\n') || '- Không phát hiện vấn đề nghiêm trọng'}

### 🎯 **Khuyến Nghị Tối Ưu Hóa**

1. **Hiệu Suất AI**: ${models.filter((m: any) => m.avgScore < 6).length > 0 ? `Tối ưu hóa ${models.filter((m: any) => m.avgScore < 6).length} mô hình hoạt động kém` : 'Duy trì mức hiệu suất AI hiện tại'}

2. **Sự Tham Gia Người Dùng**: ${users.activeUsers < users.totalUsers * 0.5 ? 'Thực hiện chiến lược giữ chân người dùng' : 'Tiếp tục chiến lược tham gia hiện tại'}

3. **Chiến Lược Nội Dung**: ${systemHealth.avgSystemScore < 6 ? 'Xem xét và cải thiện chất lượng nội dung' : 'Duy trì tiêu chuẩn nội dung cao'}

4. **Cơ Sở Hạ Tầng**: ${servers.filter((s: any) => s.activity.recentResults === 0).length > 0 ? `Kích hoạt ${servers.filter((s: any) => s.activity.recentResults === 0).length} máy chủ không hoạt động` : 'Cơ sở hạ tầng máy chủ được sử dụng tốt'}

### 📈 **Tóm Tắt Chỉ Số Hiệu Suất**

\`\`\`json
{
  "suc_khoe_tong_the": "${systemHealth.avgSystemScore >= 7 ? 'xuat_sac' : systemHealth.avgSystemScore >= 5 ? 'tot' : 'can_cai_thien'}",
  "diem_he_thong": ${systemHealth.avgSystemScore.toFixed(2)},
  "thanh_phan_hoat_dong": {
    "mo_hinh_ai": ${models.length},
    "may_chu": ${servers.length},
    "nguoi_dung_hoat_dong": ${users.activeUsers},
    "tong_danh_gia": ${systemHealth.totalAssessments}
  },
  "chi_so_hieu_suat": {
    "hieu_qua_ai": "${(models.reduce((sum: number, m: any) => sum + m.avgScore, 0) / models.length).toFixed(1)}/10",
    "su_tham_gia_nguoi_dung": "${((users.activeUsers / users.totalUsers) * 100).toFixed(1)}%",
    "chat_luong_noi_dung": "${systemHealth.avgSystemScore.toFixed(1)}/10"
  }
}
\`\`\`

*Cập nhật lần cuối: ${new Date().toLocaleString('vi-VN')}*`;
        }

        // Default comprehensive overview - Tiếng Việt
        return `# 🤖 **Trợ Lý AI Quản Lý Hệ Thống - Phân Tích Toàn Diện Có Sẵn**

## 📊 **Dữ Liệu Có Sẵn Để Phân Tích**
- **${models?.length || 0} Mô Hình AI** với chỉ số hiệu suất
- **${servers?.length || 0} Máy Chủ** với dữ liệu hoạt động
- **${fields?.length || 0} Lĩnh Vực Chủ Đề** với hiểu biết chương trình
- **${users?.totalUsers || 0} Người Dùng** với phân tích tương tác
- **${systemHealth?.totalAssessments || 0} Đánh Giá** với dữ liệu điểm

## 🎯 **Những gì tôi có thể phân tích cho bạn:**

### 🧠 **Phân Tích AI & Mô Hình**
- So sánh hiệu suất mô hình AI
- Mẫu sử dụng và hiệu quả
- Phân phối và xu hướng điểm

### 🖥️ **Phân Tích Cơ Sở Hạ Tầng**
- Chỉ số hiệu suất máy chủ
- Tỷ lệ sử dụng kênh
- Mức độ tương tác cộng đồng

### 📚 **Phân Tích Giáo Dục**
- Phân tích độ khó môn học/lĩnh vực
- Hiệu quả chương trình
- Xu hướng kết quả học tập

### 👥 **Phân Tích Người Dùng & Tương Tác**
- Theo dõi hiệu suất học sinh
- Mẫu hoạt động người dùng
- Chỉ số giữ chân và tăng trưởng

### 🔧 **Giám Sát Sức Khỏe Hệ Thống**
- Bảng điều khiển hiệu suất tổng thể
- Trạng thái sức khỏe thành phần
- Khuyến nghị tối ưu hóa

**Hỏi tôi về bất kỳ lĩnh vực nào để có phân tích chi tiết với dữ liệu thực từ hệ thống của bạn!**

*Ví dụ: "phân tích hiệu suất mô hình AI", "hiển thị phân tích máy chủ", "báo cáo tương tác người dùng", "tổng quan sức khỏe hệ thống"*`;
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || loading) return;

        setLoading(true);
        const userMessage = inputMessage;
        setInputMessage("");

        // Add user message immediately
        const userMsgObj: SystemMessage = {
            id: Date.now().toString(),
            role: 'USER',
            content: userMessage,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsgObj]);

        try {
            // Try API first
            const response = await fetch(`/api/system-master/chat/${sessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'USER',
                    content: userMessage
                })
            });

            if (response.ok) {
                await fetchMessages();
            } else {
                throw new Error('API thất bại');
            }
        } catch (error) {
            console.error('Lỗi gửi tin nhắn:', error);

            // Fallback to comprehensive data response
            try {
                const mockResponse = await generateMockResponse(userMessage);
                const aiMsgObj: SystemMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'ASSISTANT',
                    content: mockResponse,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsgObj]);
            } catch (mockError) {
                toast.error("Không thể tạo phản hồi");
                setInputMessage(userMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const copyMessage = async (content: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(messageId);
            toast.success("Đã sao chép!");
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            toast.error("Không thể sao chép");
        }
    };

    // Quick Commands - Tiếng Việt
    const quickCommands = [
        {
            label: "Sức Khỏe Hệ Thống",
            value: "hiển thị tổng quan sức khỏe và hiệu suất hệ thống toàn diện",
            icon: Monitor,
            color: "bg-blue-500",
            description: "Chẩn đoán hệ thống hoàn chỉnh"
        },
        {
            label: "Phân Tích Mô Hình AI",
            value: "phân tích tất cả mô hình AI với các chỉ số hiệu suất chi tiết",
            icon: Brain,
            color: "bg-purple-500",
            description: "Hiểu biết sâu về mô hình AI"
        },
        {
            label: "Phân Tích Máy Chủ",
            value: "phân tích hiệu suất và sử dụng máy chủ toàn diện",
            icon: Database,
            color: "bg-green-500",
            description: "Hiểu biết về cơ sở hạ tầng máy chủ"
        },
        {
            label: "Tương Tác Người Dùng",
            value: "phân tích chi tiết về người dùng và mô hình tương tác",
            icon: Users,
            color: "bg-yellow-500",
            description: "Phân tích hành vi người dùng"
        },
        {
            label: "Phân Tích Chương Trình",
            value: "phân tích tất cả lĩnh vực và môn học với hiểu biết về độ khó",
            icon: FileText,
            color: "bg-indigo-500",
            description: "Phân tích nội dung giáo dục"
        },
        {
            label: "Xu Hướng Hiệu Suất",
            value: "hiển thị xu hướng hiệu suất và dự đoán trên tất cả các chỉ số",
            icon: TrendingUp,
            color: "bg-red-500",
            description: "Phân tích xu hướng & dự báo"
        },
        {
            label: "Hiểu Biết Dữ Liệu",
            value: "cung cấp hiểu biết dữ liệu toàn diện và khuyến nghị",
            icon: PieChart,
            color: "bg-orange-500",
            description: "Phân tích nâng cao"
        },
        {
            label: "Hướng Dẫn Tối Ưu",
            value: "khuyến nghị tối ưu hóa hệ thống dựa trên dữ liệu hiện tại",
            icon: Target,
            color: "bg-pink-500",
            description: "Tối ưu hóa hiệu suất"
        }
    ];

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="text-center space-y-6">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                            <Sparkles className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Đang Khởi Tạo Quản Lý Hệ Thống</h3>
                        <p className="text-muted-foreground">Đang kết nối đến ý thức AI...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/50">
            {/* Enhanced Header - Tiếng Việt */}
            <div className="flex-shrink-0 border-b bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/system-master')}
                            className="flex items-center gap-2 hover:bg-blue-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Bảng Điều Khiển
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Trợ Lý AI Quản Lý Hệ Thống
                                </h1>
                                <p className="text-sm text-muted-foreground">Đánh Giá Trợ Lý AI Nâng Cao</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                            Trực Tuyến
                        </Badge>
                        <Badge variant="secondary" className="font-mono">{sessionId.slice(-8)}</Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="lg:hidden"
                        >
                            <ChevronDown className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex max-w-7xl mx-auto w-full overflow-hidden">
                {/* Enhanced Sidebar - Tiếng Việt */}
                <div className={cn(
                    "flex-shrink-0 border-r bg-white/50 backdrop-blur-sm transition-all duration-300",
                    sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
                )}>
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-600" />
                                Lệnh Phân Tích AI
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">Phân tích dữ liệu thời gian thực</p>
                        </div>
                        <ScrollArea className="flex-1 p-3">
                            <div className="space-y-2">
                                {quickCommands.map((cmd) => (
                                    <Button
                                        key={cmd.value}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start h-auto p-3 hover:bg-white hover:shadow-sm transition-all"
                                        onClick={() => setInputMessage(cmd.value)}
                                        disabled={loading}
                                    >
                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mr-3 shadow-sm", cmd.color)}>
                                            <cmd.icon className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="font-medium text-sm">{cmd.label}</div>
                                            <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                                        </div>
                                    </Button>
                                ))}

                                <Separator className="my-4" />

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium">Thông Tin Phiên</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                                            <span className="text-xs text-gray-600">Tin nhắn:</span>
                                            <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                                            <span className="text-xs text-gray-600">Trạng thái:</span>
                                            <Badge className="bg-green-500 hover:bg-green-600 text-xs">Hoạt động</Badge>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                                            <span className="text-xs text-gray-600">Phiên:</span>
                                            <span className="text-xs font-mono text-purple-700">{sessionId.slice(-8)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Enhanced Chat Area - Tiếng Việt */}
                <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-sm overflow-hidden">
                    {/* Chat Header */}
                    <div className="flex-shrink-0 border-b bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bot className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold">Nhà Phân Tích Hệ Thống AI</span>
                                <Badge variant="outline" className="text-xs bg-white/50">Chế độ Dữ liệu Thời gian Thực</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {new Date().toLocaleTimeString('vi-VN')}
                                </Badge>
                                <Button variant="ghost" size="sm">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-6">
                                {messages.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                                            <Brain className="h-8 w-8 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            Trợ Lý AI Quản Lý Hệ Thống
                                        </h3>
                                        <p className="text-muted-foreground mb-6 max-w-lg mx-auto leading-relaxed">
                                            Tôi phân tích dữ liệu thời gian thực từ hệ thống LMS của bạn bao gồm mô hình AI, máy chủ,
                                            tương tác người dùng, chỉ số hiệu suất và cung cấp hiểu biết toàn diện với khuyến nghị có thể thực hiện.
                                        </p>
                                        <div className="flex flex-wrap gap-3 justify-center">
                                            {quickCommands.slice(0, 4).map((cmd) => (
                                                <Button
                                                    key={cmd.value}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setInputMessage(cmd.value)}
                                                    className="hover:bg-white hover:shadow-md transition-all"
                                                >
                                                    <cmd.icon className="h-4 w-4 mr-2" />
                                                    {cmd.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex gap-4 group",
                                                message.role === 'USER' ? 'justify-end' : 'justify-start'
                                            )}
                                        >
                                            {message.role === 'ASSISTANT' && (
                                                <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                    <Brain className="h-5 w-5 text-white" />
                                                </div>
                                            )}

                                            <div
                                                className={cn(
                                                    "max-w-[85%] rounded-2xl px-4 py-3 relative shadow-sm",
                                                    message.role === 'USER'
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-lg'
                                                        : 'bg-white border border-gray-200 rounded-tl-lg'
                                                )}
                                            >
                                                {/* Message Header */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        message.role === 'USER' ? 'text-blue-100' : 'text-gray-600'
                                                    )}>
                                                        {message.role === 'USER' ? 'Bạn' : 'Nhà Phân Tích Hệ Thống'}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs",
                                                        message.role === 'USER' ? 'text-blue-200' : 'text-gray-400'
                                                    )}>
                                                        {new Date(message.timestamp).toLocaleTimeString('vi-VN')}
                                                    </span>
                                                </div>

                                                {/* Message Content */}
                                                <div className={cn(
                                                    "prose prose-sm max-w-none",
                                                    message.role === 'USER' ? 'prose-invert' : ''
                                                )}>
                                                    {message.role === 'USER' ? (
                                                        <div
                                                            className="text-sm leading-relaxed"
                                                            dangerouslySetInnerHTML={{
                                                                __html: message.content
                                                                    .replace(/`([^`]+)`/g, '<code class="bg-blue-600/50 text-blue-100 px-1.5 py-0.5 rounded-md text-xs font-mono">$1</code>')
                                                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                                                                    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                                                    .replace(/\n/g, '<br>')
                                                            }}
                                                        />
                                                    ) : (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={MarkdownComponents}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>

                                                {/* Copy Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        "absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                                        message.role === 'USER'
                                                            ? 'text-blue-200 hover:text-white hover:bg-blue-600/50'
                                                            : 'hover:bg-gray-100'
                                                    )}
                                                    onClick={() => copyMessage(message.content, message.id)}
                                                >
                                                    {copiedId === message.id ? (
                                                        <Check className="h-3 w-3" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>

                                            {message.role === 'USER' && (
                                                <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                                    <User className="h-5 w-5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}

                                {/* Enhanced Typing Indicator */}
                                {loading && (
                                    <div className="flex gap-4">
                                        <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                                            <Brain className="h-5 w-5 text-white animate-pulse" />
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-lg px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="flex space-x-1">
                                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-sm text-gray-500">Đang phân tích dữ liệu hệ thống...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Enhanced Input Area */}
                    <div className="flex-shrink-0 border-t bg-white/80 backdrop-blur-md p-6">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Hỏi về sức khỏe hệ thống, mô hình AI, phân tích người dùng... (hỗ trợ **đậm** và `mã`)"
                                    disabled={loading}
                                    className="pr-14 rounded-2xl border-gray-200 bg-white/50 backdrop-blur-sm h-12 text-sm"
                                />
                                {inputMessage && (
                                    <Button
                                        size="sm"
                                        className="absolute right-2 top-2 h-8 w-8 p-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-sm"
                                        onClick={sendMessage}
                                        disabled={loading || !inputMessage.trim()}
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Phân tích dữ liệu thời gian thực
                                </span>
                                <span>Hiểu biết hệ thống toàn diện</span>
                            </div>
                            <span className={cn(
                                "font-mono",
                                inputMessage.length > 1800 ? "text-red-500" : "text-gray-400"
                            )}>
                                {inputMessage.length}/2000
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}