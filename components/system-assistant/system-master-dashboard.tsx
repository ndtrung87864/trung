"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Activity,
    Users,
    Server,
    MessageSquare,
    BookOpen,
    FileText,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Settings,
    Database,
    Cpu,
    MemoryStick,
    HardDrive,
    Clock,
    Zap,
    Shield,
    BarChart3,
    Monitor,
    Gauge,
    Bot,
    Target,
    Wand2 // Thêm icon này cho Test Tự Động
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AIAssistantChecker } from "./ai-assistant-checker";
import { AIPromptValidator } from "./ai-prompt-validator";
import { AITestGenerator } from "./ai-test-generator";

interface SystemMasterData {
    overview: any;
    learningSystem: any;
    assessmentSystem: any;
    assistant: any;
    activeSessions: any[];
    recentLogs: any[];
    systemHealth: any;
    performance: any;
}

export function SystemMasterDashboard() {
    const [data, setData] = useState<SystemMasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [chatLoading, setChatLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchSystemData();
        const interval = setInterval(fetchSystemData, 30 * 1000); // Làm mới mỗi 30 giây
        return () => clearInterval(interval);
    }, []);

    const fetchSystemData = async () => {
        try {
            const response = await fetch('/api/system-master/dashboard');
            if (!response.ok) {
                throw new Error(`Lỗi HTTP! trạng thái: ${response.status}`);
            }
            const systemData = await response.json();
            setData(systemData);
        } catch (error) {
            console.error('Lỗi tải dữ liệu hệ thống:', error);
            toast.error("Không thể tải dữ liệu hệ thống");
        } finally {
            setLoading(false);
        }
    };

    const startSystemChat = async () => {
        if (chatLoading) return;

        setChatLoading(true);
        try {
            const response = await fetch('/api/system-master/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'SYSTEM_MANAGEMENT' })
            });

            if (!response.ok) {
                throw new Error(`Lỗi HTTP! trạng thái: ${response.status}`);
            }

            const session = await response.json();
            router.push(`/system-master/chat/${session.id}`);
        } catch (error) {
            console.error('Lỗi khởi tạo chat hệ thống:', error);
            toast.error("Không thể khởi tạo phiên chat");
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <Cpu className="h-16 w-16 text-blue-500 animate-pulse mx-auto" />
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Đang Khởi Tạo System Master</h3>
                        <p className="text-muted-foreground">Đang tải dữ liệu hệ thống toàn diện...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center p-12">
                <div className="max-w-md mx-auto">
                    <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-4">System Master Không Khả Dụng</h3>
                    <p className="text-muted-foreground mb-6">
                        Trợ lý System Master hiện đang offline hoặc gặp sự cố kết nối.
                    </p>
                    <Button onClick={() => window.location.reload()} size="lg">
                        <Activity className="h-4 w-4 mr-2" />
                        Thử Lại Kết Nối
                    </Button>
                </div>
            </div>
        );
    }

    const { overview, learningSystem, assessmentSystem, assistant, activeSessions, recentLogs, systemHealth, performance } = data;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 space-y-8">
            {/* Header Nâng Cao */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                            <Settings className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Điều Khiển System Master
                            </h1>
                            <p className="text-muted-foreground text-lg mt-1">
                                Trung tâm giám sát, phân tích & quản lý hệ thống nâng cao
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="px-3 py-1 text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}
                        </Badge>
                        <Button
                            onClick={startSystemChat}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            disabled={chatLoading}
                            size="lg"
                        >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {chatLoading ? "Đang Kết Nối..." : "Chat với AI Master"}
                        </Button>
                        <Button variant="outline" onClick={fetchSystemData} disabled={loading} size="lg">
                            <Activity className="h-4 w-4 mr-2" />
                            Làm Mới
                        </Button>
                    </div>
                </div>
            </div>

            {/* Trạng Thái Sức Khỏe Hệ Thống */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-green-700">Sức Khỏe Hệ Thống</CardTitle>
                            <Shield className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-3">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <div>
                                <div className="text-2xl font-bold text-green-700">Tuyệt Vời</div>
                                <p className="text-sm text-green-600">Tất cả hệ thống hoạt động</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-blue-700">Người Dùng Hoạt Động</CardTitle>
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">{overview?.users?.total || 0}</div>
                        <div className="flex items-center mt-2 text-sm">
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                            <span className="text-green-600">+{overview?.users?.newToday || 0} hôm nay</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-purple-700">Phiên AI</CardTitle>
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-700">{activeSessions?.length || 0}</div>
                        <div className="flex items-center mt-2 text-sm">
                            <Activity className="h-3 w-3 text-purple-500 mr-1" />
                            <span className="text-purple-600">Cuộc trò chuyện đang hoạt động</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-orange-700">Hiệu Suất</CardTitle>
                            <Gauge className="h-5 w-5 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-700">98.5%</div>
                        <div className="flex items-center mt-2 text-sm">
                            <Zap className="h-3 w-3 text-orange-500 mr-1" />
                            <span className="text-orange-600">Hiệu quả tối ưu</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs với 2 validation tabs riêng biệt */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-8 bg-white shadow-md rounded-xl p-1">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        <Monitor className="h-4 w-4 mr-2" />
                        Tổng Quan
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-green-500 data-[state=active]:text-white">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Hiệu Suất
                    </TabsTrigger>
                    <TabsTrigger value="learning" className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Học Tập
                    </TabsTrigger>
                    <TabsTrigger value="assessment" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <FileText className="h-4 w-4 mr-2" />
                        Đánh Giá
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white">
                        <Database className="h-4 w-4 mr-2" />
                        Nhật Ký
                    </TabsTrigger>
                    <TabsTrigger value="ai-checker" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                        <Bot className="h-4 w-4 mr-2" />
                        Kiểm Tra AI
                    </TabsTrigger>
                    <TabsTrigger value="prompt-validator" className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                        <Target className="h-4 w-4 mr-2" />
                        Test Thủ Công
                    </TabsTrigger>
                    <TabsTrigger value="test-generator" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                        <Wand2 className="h-4 w-4 mr-2" />
                        Test Tự Động
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Phiên Hoạt Động */}
                        <Card className="bg-white shadow-lg rounded-xl border-0">
                            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Phiên AI Trực Tiếp
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {activeSessions && activeSessions.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeSessions.map((session: any) => (
                                            <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                                    <div>
                                                        <p className="font-semibold">{session.type}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Người dùng: {session.user?.name || 'Ẩn danh'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    {session.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-muted-foreground">Không có phiên hoạt động</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Trạng Thái System Master */}
                        <Card className="bg-white shadow-lg rounded-xl border-0">
                            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-t-xl">
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="h-5 w-5" />
                                    Trạng Thái Lõi AI Master
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                        <span className="font-medium">Trạng thái:</span>
                                        <Badge className="bg-green-500 hover:bg-green-600">
                                            {assistant?.status || 'Hoạt động'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                        <span className="font-medium">Phiên đã xử lý:</span>
                                        <span className="font-bold text-blue-600">
                                            {assistant?.metrics?.sessionsHandled || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                        <span className="font-medium">Tác vụ hoàn thành:</span>
                                        <span className="font-bold text-purple-600">
                                            {assistant?.metrics?.tasksCompleted || 0}
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="text-center text-sm text-muted-foreground">
                                        Cập nhật lần cuối: {assistant?.updatedAt ? new Date(assistant.updatedAt).toLocaleString('vi-VN') : 'Chưa bao giờ'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tài Nguyên Hệ Thống */}
                    <Card className="bg-white shadow-lg rounded-xl border-0">
                        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                Tài Nguyên Hệ Thống
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <Cpu className="h-4 w-4" />
                                            Sử Dụng CPU
                                        </span>
                                        <span className="text-sm font-bold">65%</span>
                                    </div>
                                    <Progress value={65} className="h-2" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <MemoryStick className="h-4 w-4" />
                                            Bộ Nhớ
                                        </span>
                                        <span className="text-sm font-bold">78%</span>
                                    </div>
                                    <Progress value={78} className="h-2" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <HardDrive className="h-4 w-4" />
                                            Lưu Trữ
                                        </span>
                                        <span className="text-sm font-bold">42%</span>
                                    </div>
                                    <Progress value={42} className="h-2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Thời Gian Hoạt Động
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-700">99.9%</div>
                                <p className="text-sm text-green-600">30 ngày qua</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Thời Gian Phản Hồi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700">125ms</div>
                                <p className="text-sm text-blue-600">Trung bình</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Thông Lượng
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-700">2.3K</div>
                                <p className="text-sm text-purple-600">Yêu cầu/phút</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Tỷ Lệ Lỗi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-700">0.1%</div>
                                <p className="text-sm text-orange-600">24 giờ qua</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="learning" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                    <BookOpen className="h-5 w-5" />
                                    Mô Hình AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-blue-600 mb-2">
                                    {learningSystem?.models?.total || 0}
                                </div>
                                <p className="text-sm text-blue-600">
                                    {learningSystem?.models?.active || 0} mô hình hoạt động
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <FileText className="h-5 w-5" />
                                    Lĩnh Vực Kiến Thức
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-green-600 mb-2">
                                    {learningSystem?.fields?.total || 0}
                                </div>
                                <p className="text-sm text-green-600">
                                    {learningSystem?.fields?.active || 0} lĩnh vực hoạt động
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-purple-700">
                                    <MessageSquare className="h-5 w-5" />
                                    Hộp Chat
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-purple-600 mb-2">
                                    {learningSystem?.chatboxes?.total || 0}
                                </div>
                                <p className="text-sm text-purple-600">
                                    Cuộc trò chuyện hoạt động
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="assessment" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-orange-700">
                                    <FileText className="h-5 w-5" />
                                    Bài Thi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-orange-600 mb-2">
                                    {assessmentSystem?.exams?.total || 0}
                                </div>
                                <p className="text-sm text-orange-600">
                                    {assessmentSystem?.exams?.active || 0} bài thi hoạt động
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-teal-700">
                                    <BookOpen className="h-5 w-5" />
                                    Bài Tập
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-teal-600 mb-2">
                                    {assessmentSystem?.exercises?.total || 0}
                                </div>
                                <p className="text-sm text-teal-600">
                                    {assessmentSystem?.exercises?.active || 0} bài tập hoạt động
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-rose-700">
                                    <BarChart3 className="h-5 w-5" />
                                    Kết Quả
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-rose-600 mb-2">
                                    {(assessmentSystem?.results?.examResults || 0) + (assessmentSystem?.results?.exerciseResults || 0)}
                                </div>
                                <p className="text-sm text-rose-600">
                                    {assessmentSystem?.results?.totalParticipants || 0} người tham gia
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="logs" className="space-y-6">
                    <Card className="bg-white shadow-lg rounded-xl border-0">
                        <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-800 text-white rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Nhật Ký Hoạt Động Hệ Thống
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                {recentLogs && recentLogs.length > 0 ? (
                                    recentLogs.map((log: any) => (
                                        <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <Badge variant={
                                                    log.level === 'ERROR' ? 'destructive' :
                                                        log.level === 'WARNING' ? 'secondary' : 'default'
                                                } className="w-20 justify-center">
                                                    {log.level === 'ERROR' ? 'LỖI' :
                                                        log.level === 'WARNING' ? 'CẢNH BÁO' :
                                                            log.level === 'INFO' ? 'THÔNG TIN' : log.level}
                                                </Badge>
                                                <span className="font-medium">{log.action}</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(log.timestamp).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <Database className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-muted-foreground">Không có nhật ký gần đây</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ai-checker" className="space-y-6">
                    <AIAssistantChecker />
                </TabsContent>

                {/* 2 tabs xác thực riêng biệt */}
                <TabsContent value="prompt-validator" className="space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-violet-200">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-violet-100 rounded-lg">
                                    <Target className="h-6 w-6 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-violet-800">Xác Thực Prompt Thủ Công</h2>
                                    <p className="text-violet-600">Kiểm tra chất lượng prompt bằng các test case được thiết kế sẵn</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                                    <div className="text-2xl font-bold text-violet-700">Thủ Công</div>
                                    <div className="text-sm text-violet-600">Kiểm soát hoàn toàn test cases</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-2xl font-bold text-blue-700">Chi Tiết</div>
                                    <div className="text-sm text-blue-600">Phân tích sâu từng phản hồi</div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-2xl font-bold text-green-700">Gemini AI</div>
                                    <div className="text-sm text-green-600">Đánh giá bởi AI chuyên nghiệp</div>
                                </div>
                            </div>
                        </div>
                        <AIPromptValidator />
                    </div>
                </TabsContent>

                <TabsContent value="test-generator" className="space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-200">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Wand2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-emerald-800">Tạo & Xác Thực Test Tự Động</h2>
                                    <p className="text-emerald-600">Tự động tạo bài kiểm tra và chạy validation cho trợ lý AI</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="text-2xl font-bold text-emerald-700">Tự Động</div>
                                    <div className="text-sm text-emerald-600">AI tạo test cases thông minh</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="text-2xl font-bold text-purple-700">Tổng Hợp</div>
                                    <div className="text-sm text-purple-600">Tạo + Kiểm tra + Phân tích</div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="text-2xl font-bold text-orange-700">Lưu Trữ</div>
                                    <div className="text-sm text-orange-600">Quản lý bộ test đã tạo</div>
                                </div>
                            </div>
                        </div>
                        <AITestGenerator />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}