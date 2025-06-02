"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    ClipboardCheck,
    TrendingUp,
    Users,
    Award,
    Search,
    Download,
    Filter,
    BookOpenCheck,
    PenTool,
    Trash2
} from "lucide-react";
import axios from "axios";

interface ExamResult {
    id: string;
    score: number;
    examName: string;
    userName: string;
    userId: string;
    duration: string;
    createdAt: string;
    exam: {
        id: string;
        name: string;
        channel: {
            server: {
                name: string;
            };
        };
    };
    user?: {
        id: string;
        name: string;
        email: string;
        imageUrl: string;
    };
}

interface ExerciseResult {
    id: string;
    score: number;
    exerciseName: string;
    userName: string;
    userId: string;
    createdAt: string;
    exercise: {
        id: string;
        name: string;
        channel: {
            server: {
                name: string;
            };
        };
    };
    user?: {
        id: string;
        name: string;
        email: string;
        imageUrl: string;
    };
}

interface Statistics {
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    gradeDistribution: Array<{
        range: string;
        count: number;
    }>;
}

interface Server {
    id: string;
    name: string;
    imageUrl: string;
}

interface Exam {
    id: string;
    name: string;
    description?: string;
    channel: {
        server: {
            name: string;
        };
    };
}

interface Exercise {
    id: string;
    name: string;
    description?: string;
    channel: {
        server: {
            name: string;
        };
    };
}

export const GradesManagement = () => {
    const [examResults, setExamResults] = useState<ExamResult[]>([]);
    const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [servers, setServers] = useState<Server[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedServer, setSelectedServer] = useState("");
    const [selectedExam, setSelectedExam] = useState("");
    const [selectedExercise, setSelectedExercise] = useState("");
    const [selectedType, setSelectedType] = useState("all");

    // Load exam results
    const loadExamResults = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedServer) params.append("serverId", selectedServer);
            if (selectedExam) params.append("examId", selectedExam);

            const response = await axios.get(`/api/admin/grades?${params.toString()}`);
            setExamResults(response.data || []);
        } catch (error) {
            console.error("Failed to load exam results:", error);
            setExamResults([]);
        }
    };

    // Load exercise results
    const loadExerciseResults = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedServer) params.append("serverId", selectedServer);
            if (selectedExercise) params.append("exerciseId", selectedExercise);

            const response = await axios.get(`/api/admin/exercises/results?${params.toString()}`);
            setExerciseResults(response.data || []);
        } catch (error) {
            console.error("Failed to load exercise results:", error);
            setExerciseResults([]);
        }
    };

    // Load statistics
    const loadStatistics = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedServer) params.append("serverId", selectedServer);
            if (selectedExam) params.append("examId", selectedExam);

            const response = await axios.get(`/api/admin/grades/statistics?${params.toString()}`);
            setStatistics(response.data);
        } catch (error) {
            console.error("Failed to load statistics:", error);
        }
    };

    // Load servers
    const loadServers = async () => {
        try {
            const response = await axios.get('/api/admin/servers');
            setServers(response.data);
        } catch (error) {
            console.error("Failed to load servers:", error);
        }
    };

    // Load exams
    const loadExams = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedServer) params.append("serverId", selectedServer);

            const response = await axios.get(`/api/admin/exams?${params.toString()}`);
            setExams(response.data);
        } catch (error) {
            console.error("Failed to load exams:", error);
        }
    };

    // Load exercises
    const loadExercises = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedServer) params.append("serverId", selectedServer);

            const response = await axios.get(`/api/admin/exercises?${params.toString()}`);
            setExercises(response.data);
        } catch (error) {
            console.error("Failed to load exercises:", error);
        }
    };

    // Load all data
    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                selectedType === "all" || selectedType === "exam" ? loadExamResults() : Promise.resolve(),
                selectedType === "all" || selectedType === "exercise" ? loadExerciseResults() : Promise.resolve(),
                loadStatistics()
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadServers();
    }, []);

    // Load activities when server changes
    useEffect(() => {
        loadExams();
        loadExercises();
    }, [selectedServer]);

    // Load data when filters change
    useEffect(() => {
        loadAllData();
    }, [selectedServer, selectedExam, selectedExercise, selectedType]);

    // Combine results for display
    const getAllResults = () => {
        const results: Array<{
            id: string;
            type: string;
            studentName: string;
            studentEmail: string;
            studentImage: string;
            activityName: string;
            serverName: string;
            score: number;
            createdAt: string;
            duration: string | null;
            originalData: ExamResult | ExerciseResult;
        }> = [];

        // Add exam results
        if (selectedType === "all" || selectedType === "exam") {
            examResults.forEach(result => {
                results.push({
                    id: result.id,
                    type: "exam",
                    studentName: result.user?.name || result.userName,
                    studentEmail: result.user?.email || result.userId,
                    studentImage: result.user?.imageUrl || "/default-avatar.png",
                    activityName: result.exam.name,
                    serverName: result.exam.channel.server.name,
                    score: Number(result.score),
                    createdAt: result.createdAt,
                    duration: result.duration,
                    originalData: result
                });
            });
        }

        // Add exercise results
        if (selectedType === "all" || selectedType === "exercise") {
            exerciseResults.forEach(result => {
                results.push({
                    id: result.id,
                    type: "exercise",
                    studentName: result.user?.name || result.userName,
                    studentEmail: result.user?.email || result.userId,
                    studentImage: result.user?.imageUrl || "/default-avatar.png",
                    activityName: result.exercise.name,
                    serverName: result.exercise.channel.server.name,
                    score: Number(result.score),
                    createdAt: result.createdAt,
                    duration: null,
                    originalData: result
                });
            });
        }

        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    // Filter results
    const filteredResults = getAllResults().filter(result =>
        result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.activityName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Delete result
    const deleteResult = async (resultId: string, type: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa kết quả này?")) return;

        try {
            if (type === "exam") {
                await axios.delete(`/api/admin/grades?id=${resultId}`);
                await loadExamResults();
            } else if (type === "exercise") {
                await axios.delete(`/api/admin/exercises/results?id=${resultId}`);
                await loadExerciseResults();
            }

            await loadStatistics();
        } catch (error) {
            console.error("Failed to delete result:", error);
            alert("Có lỗi xảy ra khi xóa kết quả");
        }
    };

    const getScoreBadge = (score: number) => {
        if (score >= 8) return "bg-green-100 text-green-800";
        if (score >= 6) return "bg-blue-100 text-blue-800";
        if (score >= 4) return "bg-yellow-100 text-yellow-800";
        return "bg-red-100 text-red-800";
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "exam":
                return <BookOpenCheck size={16} className="text-blue-500" />;
            case "exercise":
                return <PenTool size={16} className="text-green-500" />;
            default:
                return <ClipboardCheck size={16} className="text-gray-500" />;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "exam":
                return "bg-blue-100 text-blue-800";
            case "exercise":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Quản lý điểm</h1>
                    <p className="text-gray-600">Theo dõi và quản lý điểm số của học sinh</p>
                </div>
                <Button className="flex items-center gap-2">
                    <Download size={16} />
                    Xuất báo cáo
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter size={20} />
                        Bộ lọc
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tìm kiếm</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Tìm theo tên, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Loại</label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn loại" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="exam">Bài kiểm tra</SelectItem>
                                    <SelectItem value="exercise">Bài tập</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Lớp học</label>
                            <Select value={selectedServer} onValueChange={(value) => {
                                if (value === "none") {
                                    setSelectedServer("");
                                } else {
                                    setSelectedServer(value);
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn lớp học" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tất cả lớp học</SelectItem>
                                    {servers.map((server) => (
                                        <SelectItem key={server.id} value={server.id}>
                                            {server.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bài kiểm tra</label>
                            <Select value={selectedExam} onValueChange={(value) => {
                                if (value === "none") {
                                    setSelectedExam("");
                                } else {
                                    setSelectedExam(value);
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn bài kiểm tra" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tất cả bài kiểm tra</SelectItem>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id} value={exam.id}>
                                            {exam.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bài tập</label>
                            <Select value={selectedExercise} onValueChange={(value) => {
                                if (value === "none") {
                                    setSelectedExercise("");
                                } else {
                                    setSelectedExercise(value);
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn bài tập" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tất cả bài tập</SelectItem>
                                    {exercises.map((exercise) => (
                                        <SelectItem key={exercise.id} value={exercise.id}>
                                            {exercise.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                    <TabsTrigger value="grades">Bảng điểm</TabsTrigger>
                    <TabsTrigger value="analytics">Phân tích</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-8 w-8 text-blue-600" />
                                        <div>
                                            <p className="text-2xl font-bold">{statistics.totalStudents}</p>
                                            <p className="text-gray-600">Tổng lượt nộp</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="h-8 w-8 text-green-600" />
                                        <div>
                                            <p className="text-2xl font-bold">{statistics.averageScore}</p>
                                            <p className="text-gray-600">Điểm trung bình</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center space-x-2">
                                        <Award className="h-8 w-8 text-yellow-600" />
                                        <div>
                                            <p className="text-2xl font-bold">{statistics.highestScore}</p>
                                            <p className="text-gray-600">Điểm cao nhất</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center space-x-2">
                                        <ClipboardCheck className="h-8 w-8 text-purple-600" />
                                        <div>
                                            <p className="text-2xl font-bold">{statistics.passRate}%</p>
                                            <p className="text-gray-600">Tỷ lệ đạt</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* Grades Tab */}
                <TabsContent value="grades">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bảng điểm chi tiết ({filteredResults.length} kết quả)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Học sinh</TableHead>
                                        <TableHead>Hoạt động</TableHead>
                                        <TableHead>Lớp học</TableHead>
                                        <TableHead>Loại</TableHead>
                                        <TableHead>Điểm</TableHead>
                                        <TableHead>Thời gian</TableHead>
                                        <TableHead>Ngày nộp</TableHead>
                                        <TableHead className="w-[50px]">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8">
                                                Đang tải...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredResults.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8">
                                                Không có dữ liệu
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredResults.map((result) => (
                                            <TableRow key={`${result.type}-${result.id}`}>
                                                <TableCell>
                                                    <div className="flex items-center space-x-3">
                                                        <img
                                                            src={result.studentImage}
                                                            alt={result.studentName}
                                                            className="w-8 h-8 rounded-full"
                                                            onError={(e) => {
                                                                e.currentTarget.src = "/default-avatar.png";
                                                            }}
                                                        />
                                                        <div>
                                                            <p className="font-medium">{result.studentName}</p>
                                                            <p className="text-sm text-gray-500">{result.studentEmail}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{result.activityName}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <p>{result.serverName}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getTypeIcon(result.type)}
                                                        <Badge className={getTypeBadge(result.type)}>
                                                            {result.type === "exam" ? "Kiểm tra" : "Bài tập"}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getScoreBadge(result.score)}>
                                                        {result.score}/10
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {result.duration || "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(result.createdAt).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteResult(result.id, result.type)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Phân tích điểm số</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {statistics && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Phân phối điểm</h3>
                                        <div className="space-y-3">
                                            {statistics.gradeDistribution.map((range) => (
                                                <div key={range.range} className="flex items-center space-x-3">
                                                    <span className="w-12 text-sm">{range.range}</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                                                        <div
                                                            className="bg-blue-600 h-3 rounded-full"
                                                            style={{
                                                                width: `${statistics.totalStudents > 0 ? (range.count / statistics.totalStudents) * 100 : 0}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-sm w-12">{range.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};