"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Search,
    Bot,
    FileText,
    BookOpen,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Eye,
    Settings,
    BarChart3,
    Activity,
    Clock,
    Zap,
    Target,
    TrendingUp,
    Users,
    Database
} from "lucide-react";
import { toast } from "sonner";

interface AIAssistant {
    id: string;
    name: string;
    type: 'CHATBOX' | 'EXAM_ASSISTANT' | 'EXERCISE_ASSISTANT';
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    modelId: string;
    modelName: string;
    fieldId?: string;
    fieldName?: string;
    channelId?: string;
    channelName?: string;
    serverName?: string;
    createdAt: string;
    updatedAt: string;
    metrics?: {
        totalUsage: number;
        avgResponseTime: number;
        successRate: number;
        userRating: number;
    };
}

interface ExerciseData {
    id: string;
    title: string;
    type: 'EXERCISE' | 'EXAM';
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    modelId: string;
    modelName: string;
    channelName: string;
    serverName: string;
    fieldName: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    createdAt: string;
    results: {
        total: number;
        avgScore: number;
        completionRate: number;
    };
    hasAIAssistant: boolean;
}

interface CheckerData {
    assistants: AIAssistant[];
    exercises: ExerciseData[];
    models: Array<{
        id: string;
        name: string;
        status: string;
        usage: number;
    }>;
    summary: {
        totalAssistants: number;
        activeAssistants: number;
        totalExercises: number;
        exercisesWithAssistants: number;
        coverageRate: number;
        avgPerformance: number;
    };
}

export function AIAssistantChecker() {
    const [data, setData] = useState<CheckerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("ALL");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");

    // Mapping text to Vietnamese
    const statusText = {
        'ACTIVE': 'Hoạt động',
        'INACTIVE': 'Ngừng hoạt động',
        'ERROR': 'Lỗi'
    };

    const typeText = {
        'CHATBOX': 'Hộp chat',
        'EXAM_ASSISTANT': 'Trợ lý thi',
        'EXERCISE_ASSISTANT': 'Trợ lý bài tập'
    };

    const exerciseTypeText = {
        'EXERCISE': 'Bài tập',
        'EXAM': 'Bài kiểm tra'
    };

    const exerciseStatusText = {
        'ACTIVE': 'Hoạt động',
        'DRAFT': 'Bản nháp',
        'ARCHIVED': 'Đã lưu trữ'
    };

    const difficultyText = {
        'EASY': 'Dễ',
        'MEDIUM': 'Trung bình',
        'HARD': 'Khó'
    };

    useEffect(() => {
        fetchCheckerData();
    }, []);

    const fetchCheckerData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/system-master/ai-checker');
            if (response.ok) {
                const checkerData = await response.json();
                setData(checkerData);
            } else {
                throw new Error('Không thể tải dữ liệu');
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu checker:', error);
            toast.error("Không thể tải dữ liệu trợ lý AI");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500';
            case 'INACTIVE': return 'bg-yellow-500';
            case 'ERROR': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'CHATBOX': return <Bot className="h-4 w-4" />;
            case 'EXAM_ASSISTANT': return <FileText className="h-4 w-4" />;
            case 'EXERCISE_ASSISTANT': return <BookOpen className="h-4 w-4" />;
            default: return <Settings className="h-4 w-4" />;
        }
    };

    const filteredAssistants = data?.assistants.filter(assistant => {
        const matchesSearch = assistant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            assistant.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            assistant.fieldName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === "ALL" || assistant.type === filterType;
        const matchesStatus = filterStatus === "ALL" || assistant.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    }) || [];

    const filteredExercises = data?.exercises.filter(exercise => {
        const matchesSearch = exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            exercise.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            exercise.fieldName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    }) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <p className="text-muted-foreground">Đang tải dữ liệu trợ lý AI...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Tổng Trợ Lý
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {data?.summary.totalAssistants || 0}
                        </div>
                        <p className="text-sm text-blue-600">
                            {data?.summary.activeAssistants || 0} đang hoạt động
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Tỷ Lệ Phủ Sóng
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {data?.summary.coverageRate?.toFixed(1) || 0}%
                        </div>
                        <Progress 
                            value={data?.summary.coverageRate || 0} 
                            className="mt-2 h-2"
                        />
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Hiệu Suất TB
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">
                            {data?.summary.avgPerformance?.toFixed(1) || 0}/10
                        </div>
                        <p className="text-sm text-purple-600">
                            Điểm toàn hệ thống
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Tổng Bài Tập
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">
                            {data?.summary.totalExercises || 0}
                        </div>
                        <p className="text-sm text-orange-600">
                            {data?.summary.exercisesWithAssistants || 0} có AI
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Kiểm Tra Trợ Lý AI & Bài Tập
                        </CardTitle>
                        <Button onClick={fetchCheckerData} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Làm mới
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Tìm kiếm trợ lý, mô hình, lĩnh vực..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border rounded-md bg-white"
                        >
                            <option value="ALL">Tất cả loại</option>
                            <option value="CHATBOX">Hộp chat</option>
                            <option value="EXAM_ASSISTANT">Trợ lý thi</option>
                            <option value="EXERCISE_ASSISTANT">Trợ lý bài tập</option>
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border rounded-md bg-white"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="INACTIVE">Ngừng hoạt động</option>
                            <option value="ERROR">Lỗi</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="assistants" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="assistants">Trợ Lý AI</TabsTrigger>
                    <TabsTrigger value="exercises">Bài Tập & Kiểm Tra</TabsTrigger>
                    <TabsTrigger value="models">Mô Hình AI</TabsTrigger>
                </TabsList>

                <TabsContent value="assistants">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tổng Quan Trợ Lý AI ({filteredAssistants.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {filteredAssistants.map((assistant) => (
                                        <div key={assistant.id} className="p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        {getTypeIcon(assistant.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold">{assistant.name}</h4>
                                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(assistant.status)}`} />
                                                        </div>
                                                        <p className="text-sm text-gray-600">Mô hình: {assistant.modelName}</p>
                                                        {assistant.fieldName && (
                                                            <p className="text-sm text-gray-600">Lĩnh vực: {assistant.fieldName}</p>
                                                        )}
                                                        <p className="text-sm text-gray-600">
                                                            {assistant.serverName} → {assistant.channelName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <Badge variant={assistant.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                        {statusText[assistant.status as keyof typeof statusText]}
                                                    </Badge>
                                                    {assistant.metrics && (
                                                        <div className="text-xs text-gray-500">
                                                            <div>Sử dụng: {assistant.metrics.totalUsage}</div>
                                                            <div>Thành công: {assistant.metrics.successRate}%</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="exercises">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bài Tập & Kiểm Tra ({filteredExercises.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {filteredExercises.map((exercise) => (
                                        <div key={exercise.id} className="p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3">
                                                    <div className={`p-2 rounded-lg ${exercise.type === 'EXAM' ? 'bg-red-100' : 'bg-green-100'}`}>
                                                        {exercise.type === 'EXAM' ? 
                                                            <FileText className="h-4 w-4" /> : 
                                                            <BookOpen className="h-4 w-4" />
                                                        }
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold">{exercise.title}</h4>
                                                            {exercise.hasAIAssistant ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-red-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600">
                                                            Mô hình: {exercise.modelName} | Lĩnh vực: {exercise.fieldName}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {exercise.serverName} → {exercise.channelName}
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                            <span>Kết quả: {exercise.results.total}</span>
                                                            <span>Điểm TB: {exercise.results.avgScore.toFixed(1)}</span>
                                                            <span>Hoàn thành: {exercise.results.completionRate}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <Badge variant={exercise.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                        {exerciseStatusText[exercise.status as keyof typeof exerciseStatusText]}
                                                    </Badge>
                                                    <div className="text-xs">
                                                        <Badge 
                                                            variant="outline" 
                                                            className={
                                                                exercise.difficulty === 'EASY' ? 'text-green-600' :
                                                                exercise.difficulty === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                                                            }
                                                        >
                                                            {difficultyText[exercise.difficulty as keyof typeof difficultyText]}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="models">
                    <Card>
                        <CardHeader>
                            <CardTitle>Trạng Thái Mô Hình AI</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data?.models.map((model) => (
                                    <div key={model.id} className="p-4 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold">{model.name}</h4>
                                            <Badge 
                                                variant={model.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {statusText[model.status as keyof typeof statusText] || model.status}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Số lần sử dụng:</span>
                                                <span className="font-medium">{model.usage}</span>
                                            </div>
                                            <Progress value={Math.min((model.usage / 100) * 100, 100)} className="h-2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}