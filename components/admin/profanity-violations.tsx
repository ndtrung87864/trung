"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, Calendar, User, Shield } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import axios from "axios";

interface ProfanityViolation {
    id: string;
    originalText: string;
    filteredText: string;
    violatedWords: Array<{ word: string; position: number }>;
    userId: string;
    userName: string;
    contextType: string;
    contextId?: string;
    serverId?: string;
    action: string;
    severity: string;
    isReported: boolean;
    createdAt: string;
    profanityWord?: {
        word: string;
        category: string;
    };
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export const ProfanityViolations = () => {
    const [violations, setViolations] = useState<ProfanityViolation[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    
    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [severityFilter, setSeverityFilter] = useState("");
    const [contextFilter, setContextFilter] = useState("");
    const [userFilter, setUserFilter] = useState("");
    
    // Detail dialog
    const [selectedViolation, setSelectedViolation] = useState<ProfanityViolation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        fetchViolations();
    }, [pagination.page, searchTerm, severityFilter, contextFilter, userFilter]);

    const fetchViolations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());
            
            if (searchTerm) params.append('search', searchTerm);
            if (severityFilter && severityFilter !== "") params.append('severity', severityFilter);
            if (contextFilter && contextFilter !== "") params.append('contextType', contextFilter);
            if (userFilter && userFilter !== "") params.append('userId', userFilter);

            const response = await axios.get(`/api/admin/profanity/violations?${params}`);
            setViolations(response.data.violations);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error("Error fetching violations:", error);
            toast({
                title: "Lỗi",
                description: "Không thể tải danh sách vi phạm",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const viewDetail = (violation: ProfanityViolation) => {
        setSelectedViolation(violation);
        setIsDetailOpen(true);
    };

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

    const getContextLabel = (contextType: string) => {
        const labels = {
            CHAT: "Chat công khai",
            DIRECT: "Tin nhắn riêng",
            SERVER_NAME: "Tên server",
            CHANNEL_NAME: "Tên kênh",
            PROFILE: "Hồ sơ"
        };
        return labels[contextType as keyof typeof labels] || contextType;
    };

    const getActionLabel = (action: string) => {
        const labels = {
            FILTER: "Lọc từ",
            WARN: "Cảnh báo",
            BLOCK: "Chặn",
            REPORT: "Báo cáo",
            MUTE: "Tắt tiếng",
            BAN: "Cấm"
        };
        return labels[action as keyof typeof labels] || action;
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSeverityFilter("");
        setContextFilter("");
        setUserFilter("");
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm người dùng..."
                        className="pl-10"
                    />
                </div>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Mức độ nghiêm trọng" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả mức độ</SelectItem>
                        <SelectItem value="LOW">Thấp</SelectItem>
                        <SelectItem value="MEDIUM">Trung bình</SelectItem>
                        <SelectItem value="HIGH">Cao</SelectItem>
                        <SelectItem value="CRITICAL">Nghiêm trọng</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={contextFilter} onValueChange={setContextFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Loại vi phạm" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả loại</SelectItem>
                        <SelectItem value="CHAT">Chat công khai</SelectItem>
                        <SelectItem value="DIRECT">Tin nhắn riêng</SelectItem>
                        <SelectItem value="SERVER_NAME">Tên server</SelectItem>
                        <SelectItem value="CHANNEL_NAME">Tên kênh</SelectItem>
                        <SelectItem value="PROFILE">Hồ sơ</SelectItem>
                    </SelectContent>
                </Select>

                <Button 
                    variant="outline" 
                    onClick={clearFilters}
                >
                    Xóa bộ lọc
                </Button>
            </div>

            {/* Violations List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Lịch sử vi phạm ({pagination.total})
                    </CardTitle>
                    <CardDescription>
                        Danh sách các lần vi phạm từ cấm trong hệ thống
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                        </div>
                    ) : violations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                            <Shield className="h-12 w-12 mb-4 opacity-50" />
                            <p>Không tìm thấy vi phạm nào</p>
                            {(searchTerm || severityFilter || contextFilter) && (
                                <Button 
                                    variant="ghost" 
                                    onClick={clearFilters}
                                    className="mt-2"
                                >
                                    Xóa bộ lọc để xem tất cả
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {violations.map((violation) => (
                                <div key={violation.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {violation.userName}
                                                </Badge>
                                                
                                                <Badge className={`${getSeverityColor(violation.severity)} text-white`}>
                                                    {getSeverityLabel(violation.severity)}
                                                </Badge>
                                                
                                                <Badge variant="secondary">
                                                    {getContextLabel(violation.contextType)}
                                                </Badge>
                                                
                                                <Badge variant="outline">
                                                    {getActionLabel(violation.action)}
                                                </Badge>
                                                
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(violation.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-sm text-muted-foreground">Nội dung gốc:</div>
                                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-sm font-mono max-w-md truncate">
                                                    {violation.originalText}
                                                </div>
                                                
                                                <div className="text-sm text-muted-foreground">Sau khi lọc:</div>
                                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 text-sm font-mono max-w-md truncate">
                                                    {violation.filteredText}
                                                </div>
                                            </div>

                                            {violation.violatedWords && violation.violatedWords.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Từ vi phạm:</span>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {violation.violatedWords.map((vw, index) => (
                                                            <Badge key={index} variant="destructive" className="text-xs">
                                                                ***
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => viewDetail(violation)}
                                            className="ml-4 shrink-0"
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            Chi tiết
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                            <div className="text-sm text-muted-foreground">
                                Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 
                                trong tổng số {pagination.total} vi phạm
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                >
                                    Trước
                                </Button>
                                
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                        let page;
                                        if (pagination.pages <= 5) {
                                            page = i + 1;
                                        } else {
                                            const start = Math.max(1, pagination.page - 2);
                                            page = start + i;
                                            if (page > pagination.pages) return null;
                                        }
                                        
                                        return (
                                            <Button
                                                key={page}
                                                variant={pagination.page === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handlePageChange(page)}
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                >
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chi tiết vi phạm</DialogTitle>
                        <DialogDescription>
                            Thông tin chi tiết về lần vi phạm này
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedViolation && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Người vi phạm</label>
                                    <p className="font-medium">{selectedViolation.userName}</p>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Thời gian</label>
                                    <p>{format(new Date(selectedViolation.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}</p>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Mức độ nghiêm trọng</label>
                                    <div className="mt-1">
                                        <Badge className={`${getSeverityColor(selectedViolation.severity)} text-white`}>
                                            {getSeverityLabel(selectedViolation.severity)}
                                        </Badge>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Loại vi phạm</label>
                                    <p>{getContextLabel(selectedViolation.contextType)}</p>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Hành động</label>
                                    <p>{getActionLabel(selectedViolation.action)}</p>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Đã báo cáo</label>
                                    <p>{selectedViolation.isReported ? "Có" : "Không"}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Nội dung gốc</label>
                                <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                    <pre className="whitespace-pre-wrap text-sm font-mono">{selectedViolation.originalText}</pre>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Nội dung sau khi lọc</label>
                                <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                    <pre className="whitespace-pre-wrap text-sm font-mono">{selectedViolation.filteredText}</pre>
                                </div>
                            </div>

                            {selectedViolation.violatedWords && selectedViolation.violatedWords.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Từ bị vi phạm</label>
                                    <div className="mt-1 space-y-2">
                                        {selectedViolation.violatedWords.map((vw, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                                                <Badge variant="destructive">***</Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    Vị trí: {vw.position}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedViolation.contextId && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Context ID</label>
                                    <p className="font-mono text-sm bg-muted p-2 rounded break-all">{selectedViolation.contextId}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};