"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, Users, TrendingUp } from "lucide-react";
import axios from "axios";

interface StatsData {
    overview: {
        totalWords: number;
        totalViolations: number;
        violationsBySeverity: Array<{ severity: string; _count: { id: number } }>;
        violationsByContext: Array<{ contextType: string; _count: { id: number } }>;
    };
    topViolators: Array<{ userId: string; userName: string; _count: { id: number } }>;
    topWords: Array<{ word: string; usageCount: number; category: string; severity: string }>;
    dailyStats: Array<{ date: string; violations: number }>;
}

export const ProfanityStats = () => {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [timeRange, setTimeRange] = useState("7");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/admin/profanity/stats?timeRange=${timeRange}`);
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8">Đang tải...</div>;
    }

    if (!stats) {
        return <div className="flex justify-center p-8">Không thể tải dữ liệu</div>;
    }

    const getSeverityColor = (severity: string) => {
        const colors = {
            LOW: "bg-yellow-500",
            MEDIUM: "bg-orange-500", 
            HIGH: "bg-red-500",
            CRITICAL: "bg-red-700"
        };
        return colors[severity as keyof typeof colors] || "bg-gray-500";
    };

    const getSeverityLabel = (severity: string) => {
        const labels = {
            LOW: "Thấp",
            MEDIUM: "Trung bình",
            HIGH: "Cao", 
            CRITICAL: "Nghiêm trọng"
        };
        return labels[severity as keyof typeof labels] || severity;
    };

    const getTimeRangeLabel = (value: string) => {
        const labels = {
            "1": "24 giờ qua",
            "7": "7 ngày qua", 
            "30": "30 ngày qua",
            "90": "3 tháng qua"
        };
        return labels[value as keyof typeof labels] || "7 ngày qua";
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Thống kê và phân tích</h3>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Chọn khoảng thời gian">
                            {getTimeRangeLabel(timeRange)}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">24 giờ qua</SelectItem>
                        <SelectItem value="7">7 ngày qua</SelectItem>
                        <SelectItem value="30">30 ngày qua</SelectItem>
                        <SelectItem value="90">3 tháng qua</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng từ cấm</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.overview.totalWords}</div>
                        <p className="text-xs text-muted-foreground">từ đang hoạt động</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vi phạm</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.overview.totalViolations}</div>
                        <p className="text-xs text-muted-foreground">trong {getTimeRangeLabel(timeRange).toLowerCase()}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Người vi phạm</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.topViolators.length}</div>
                        <p className="text-xs text-muted-foreground">người dùng khác nhau</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Từ phổ biến</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.topWords.length}</div>
                        <p className="text-xs text-muted-foreground">từ được sử dụng</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Violations by Severity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Vi phạm theo mức độ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats.overview.violationsBySeverity.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">
                                Chưa có vi phạm nào
                            </div>
                        ) : (
                            stats.overview.violationsBySeverity.map((item) => (
                                <div key={item.severity} className="flex items-center space-x-2">
                                    <Badge variant="outline" className={`${getSeverityColor(item.severity)} text-white min-w-[80px] justify-center`}>
                                        {getSeverityLabel(item.severity)}
                                    </Badge>
                                    <div className="flex-1">
                                        <Progress 
                                            value={stats.overview.totalViolations > 0 ? (item._count.id / stats.overview.totalViolations) * 100 : 0} 
                                            className="h-2"
                                        />
                                    </div>
                                    <span className="text-sm font-medium min-w-[30px] text-right">{item._count.id}</span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Violations by Context */}
                <Card>
                    <CardHeader>
                        <CardTitle>Vi phạm theo loại</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats.overview.violationsByContext.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">
                                Chưa có vi phạm nào
                            </div>
                        ) : (
                            stats.overview.violationsByContext.map((item) => (
                                <div key={item.contextType} className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="min-w-[100px] justify-center">
                                        {item.contextType === 'CHAT' ? 'Chat' : 
                                         item.contextType === 'DIRECT' ? 'Tin nhắn riêng' : 
                                         item.contextType}
                                    </Badge>
                                    <div className="flex-1">
                                        <Progress 
                                            value={stats.overview.totalViolations > 0 ? (item._count.id / stats.overview.totalViolations) * 100 : 0} 
                                            className="h-2"
                                        />
                                    </div>
                                    <span className="text-sm font-medium min-w-[30px] text-right">{item._count.id}</span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Lists */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Top Violators */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top người vi phạm</CardTitle>
                        <CardDescription>Người dùng vi phạm nhiều nhất</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.topViolators.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">
                                Chưa có vi phạm nào
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {stats.topViolators.slice(0, 5).map((violator, index) => (
                                    <div key={violator.userId} className="flex items-center space-x-2">
                                        <Badge variant="outline" className="w-8 h-6 flex items-center justify-center">
                                            {index + 1}
                                        </Badge>
                                        <span className="flex-1 truncate">{violator.userName}</span>
                                        <span className="text-sm font-medium">{violator._count.id} lần</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Words */}
                <Card>
                    <CardHeader>
                        <CardTitle>Từ cấm phổ biến</CardTitle>
                        <CardDescription>Từ bị vi phạm nhiều nhất</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.topWords.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">
                                Chưa có từ nào bị vi phạm
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {stats.topWords.slice(0, 5).map((word, index) => (
                                    <div key={word.word} className="flex items-center space-x-2">
                                        <Badge variant="outline" className="w-8 h-6 flex items-center justify-center">
                                            {index + 1}
                                        </Badge>
                                        <span className="flex-1 font-mono">***</span>
                                        <Badge className={`${getSeverityColor(word.severity)} text-white`}>
                                            {getSeverityLabel(word.severity)}
                                        </Badge>
                                        <span className="text-sm font-medium">{word.usageCount} lần</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily Stats Chart (optional - simple version) */}
            <Card>
                <CardHeader>
                    <CardTitle>Xu hướng vi phạm</CardTitle>
                    <CardDescription>Số lượng vi phạm theo ngày</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.dailyStats.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            Chưa có dữ liệu
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {stats.dailyStats.map((day) => (
                                <div key={day.date} className="flex items-center space-x-2">
                                    <span className="text-sm w-20">{day.date}</span>
                                    <div className="flex-1">
                                        <Progress 
                                            value={Math.max(...stats.dailyStats.map(d => d.violations)) > 0 ? 
                                                (day.violations / Math.max(...stats.dailyStats.map(d => d.violations))) * 100 : 0} 
                                            className="h-2"
                                        />
                                    </div>
                                    <span className="text-sm font-medium w-10 text-right">{day.violations}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};