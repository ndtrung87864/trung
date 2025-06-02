"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, AlertCircle, Save } from "lucide-react";
import axios from "axios";

interface ProfanityWord {
    id: string;
    word: string;
    category: string;
    severity: string;
    language: string;
    usageCount: number;
    isActive: boolean;
    replacement?: string;
    createdAt: string;
    _count: { violations: number };
}

export const ProfanityWords = () => {
    const [words, setWords] = useState<ProfanityWord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [severityFilter, setSeverityFilter] = useState("");
    
    // Add dialog state
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newWord, setNewWord] = useState({
        word: "",
        category: "CUSTOM",
        severity: "MEDIUM",
        language: "vi",
        replacement: ""
    });

    // Edit dialog state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingWord, setEditingWord] = useState<ProfanityWord | null>(null);
    const [editWordData, setEditWordData] = useState({
        category: "",
        severity: "",
        replacement: "",
        isActive: true
    });

    useEffect(() => {
        fetchWords();
    }, [searchTerm, categoryFilter, severityFilter]);

    const fetchWords = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (categoryFilter && categoryFilter !== "all") params.append('category', categoryFilter);
            if (severityFilter && severityFilter !== "all") params.append('severity', severityFilter);

            const response = await axios.get(`/api/admin/profanity/words?${params}`);
            setWords(response.data.words);
        } catch (error) {
            console.error("Error fetching words:", error);
            toast({
                title: "Lỗi",
                description: "Không thể tải danh sách từ cấm",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const addWord = async () => {
        if (!newWord.word.trim()) {
            toast({
                title: "Lỗi",
                description: "Vui lòng nhập từ cấm",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post("/api/admin/profanity/words", {
                ...newWord,
                word: newWord.word.trim().toLowerCase(),
                replacement: newWord.replacement.trim() || null
            });
            toast({
                title: "Thành công",
                description: "Đã thêm từ cấm mới",
            });
            setIsAddDialogOpen(false);
            setNewWord({ word: "", category: "CUSTOM", severity: "MEDIUM", language: "vi", replacement: "" });
            fetchWords();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || "Không thể thêm từ cấm";
            toast({
                title: "Lỗi",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditDialog = (word: ProfanityWord) => {
        setEditingWord(word);
        setEditWordData({
            category: word.category,
            severity: word.severity,
            replacement: word.replacement || "",
            isActive: word.isActive
        });
        setIsEditDialogOpen(true);
    };

    const updateWord = async () => {
        if (!editingWord) return;

        setIsSubmitting(true);
        try {
            await axios.patch(`/api/admin/profanity/words/${editingWord.id}`, {
                ...editWordData,
                replacement: editWordData.replacement.trim() || null
            });
            toast({
                title: "Thành công",
                description: "Đã cập nhật từ cấm",
            });
            setIsEditDialogOpen(false);
            setEditingWord(null);
            fetchWords();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || "Không thể cập nhật từ cấm";
            toast({
                title: "Lỗi",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteWord = async (id: string, word: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa từ "${word}"?`)) return;
        
        try {
            await axios.delete(`/api/admin/profanity/words/${id}`);
            toast({
                title: "Thành công",
                description: "Đã xóa từ cấm",
            });
            fetchWords();
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Không thể xóa từ cấm",
                variant: "destructive",
            });
        }
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

    const getCategoryLabel = (category: string) => {
        const labels = {
            GENERAL: "Chung",
            OFFENSIVE: "Xúc phạm",
            HATE: "Thù hận",
            SEXUAL: "Tình dục",
            VIOLENCE: "Bạo lực",
            CUSTOM: "Tùy chỉnh"
        };
        return labels[category as keyof typeof labels] || category;
    };

    const clearFilters = () => {
        setSearchTerm("");
        setCategoryFilter("");
        setSeverityFilter("");
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm từ cấm..."
                            className="pl-10"
                        />
                    </div>
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Lọc theo danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả danh mục</SelectItem>
                        <SelectItem value="GENERAL">Chung</SelectItem>
                        <SelectItem value="OFFENSIVE">Xúc phạm</SelectItem>
                        <SelectItem value="HATE">Thù hận</SelectItem>
                        <SelectItem value="SEXUAL">Tình dục</SelectItem>
                        <SelectItem value="VIOLENCE">Bạo lực</SelectItem>
                        <SelectItem value="CUSTOM">Tùy chỉnh</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Lọc theo mức độ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả mức độ</SelectItem>
                        <SelectItem value="LOW">Thấp</SelectItem>
                        <SelectItem value="MEDIUM">Trung bình</SelectItem>
                        <SelectItem value="HIGH">Cao</SelectItem>
                        <SelectItem value="CRITICAL">Nghiêm trọng</SelectItem>
                    </SelectContent>
                </Select>

                {/* Add Dialog */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm từ cấm
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Thêm từ cấm mới</DialogTitle>
                            <DialogDescription>
                                Thêm từ hoặc cụm từ vào danh sách cấm
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="word">Từ cấm *</Label>
                                <Input
                                    id="word"
                                    value={newWord.word}
                                    onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                                    placeholder="Nhập từ cấm..."
                                    disabled={isSubmitting}
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="category">Danh mục</Label>
                                <Select 
                                    value={newWord.category} 
                                    onValueChange={(value) => setNewWord({...newWord, category: value})}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn danh mục" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL">Chung</SelectItem>
                                        <SelectItem value="OFFENSIVE">Xúc phạm</SelectItem>
                                        <SelectItem value="HATE">Thù hận</SelectItem>
                                        <SelectItem value="SEXUAL">Tình dục</SelectItem>
                                        <SelectItem value="VIOLENCE">Bạo lực</SelectItem>
                                        <SelectItem value="CUSTOM">Tùy chỉnh</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="severity">Mức độ nghiêm trọng</Label>
                                <Select 
                                    value={newWord.severity} 
                                    onValueChange={(value) => setNewWord({...newWord, severity: value})}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn mức độ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Thấp</SelectItem>
                                        <SelectItem value="MEDIUM">Trung bình</SelectItem>
                                        <SelectItem value="HIGH">Cao</SelectItem>
                                        <SelectItem value="CRITICAL">Nghiêm trọng</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="replacement">Từ thay thế (tùy chọn)</Label>
                                <Input
                                    id="replacement"
                                    value={newWord.replacement}
                                    onChange={(e) => setNewWord({...newWord, replacement: e.target.value})}
                                    placeholder="Để trống sẽ dùng ***"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                        <p className="font-medium mb-1">Lưu ý:</p>
                                        <ul className="text-xs space-y-1">
                                            <li>• Từ sẽ được chuyển thành chữ thường</li>
                                            <li>• Không được trùng với từ đã có</li>
                                            <li>• Có hiệu lực ngay sau khi thêm</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={addWord} 
                                className="w-full"
                                disabled={isSubmitting || !newWord.word.trim()}
                            >
                                {isSubmitting ? "Đang thêm..." : "Thêm từ cấm"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa từ cấm</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin từ cấm "{editingWord?.word}"
                        </DialogDescription>
                    </DialogHeader>
                    {editingWord && (
                        <div className="space-y-4">
                            <div>
                                <Label>Từ cấm</Label>
                                <Input
                                    value={editingWord.word}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Không thể thay đổi từ cấm
                                </p>
                            </div>
                            
                            <div>
                                <Label htmlFor="edit-category">Danh mục</Label>
                                <Select 
                                    value={editWordData.category} 
                                    onValueChange={(value) => setEditWordData({...editWordData, category: value})}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL">Chung</SelectItem>
                                        <SelectItem value="OFFENSIVE">Xúc phạm</SelectItem>
                                        <SelectItem value="HATE">Thù hận</SelectItem>
                                        <SelectItem value="SEXUAL">Tình dục</SelectItem>
                                        <SelectItem value="VIOLENCE">Bạo lực</SelectItem>
                                        <SelectItem value="CUSTOM">Tùy chỉnh</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit-severity">Mức độ nghiêm trọng</Label>
                                <Select 
                                    value={editWordData.severity} 
                                    onValueChange={(value) => setEditWordData({...editWordData, severity: value})}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Thấp</SelectItem>
                                        <SelectItem value="MEDIUM">Trung bình</SelectItem>
                                        <SelectItem value="HIGH">Cao</SelectItem>
                                        <SelectItem value="CRITICAL">Nghiêm trọng</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit-replacement">Từ thay thế</Label>
                                <Input
                                    id="edit-replacement"
                                    value={editWordData.replacement}
                                    onChange={(e) => setEditWordData({...editWordData, replacement: e.target.value})}
                                    placeholder="Để trống sẽ dùng ***"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-active"
                                    checked={editWordData.isActive}
                                    onCheckedChange={(checked) => setEditWordData({...editWordData, isActive: checked})}
                                    disabled={isSubmitting}
                                />
                                <Label htmlFor="edit-active">Kích hoạt từ cấm</Label>
                            </div>

                            {editingWord.usageCount > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-blue-800 dark:text-blue-200">
                                            <p className="font-medium mb-1">Thông tin sử dụng:</p>
                                            <ul className="text-xs space-y-1">
                                                <li>• Đã được sử dụng: {editingWord.usageCount} lần</li>
                                                <li>• Vi phạm liên quan: {editingWord._count.violations} lần</li>
                                                <li>• Thay đổi sẽ áp dụng cho vi phạm mới</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button 
                                    onClick={updateWord} 
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>Đang cập nhật...</>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Cập nhật
                                        </>
                                    )}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsEditDialogOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Filter Summary */}
            {(searchTerm || categoryFilter || severityFilter) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Đang lọc:</span>
                    {searchTerm && <Badge variant="outline">Từ khóa: "{searchTerm}"</Badge>}
                    {categoryFilter && categoryFilter !== "all" && <Badge variant="outline">Danh mục: {getCategoryLabel(categoryFilter)}</Badge>}
                    {severityFilter && severityFilter !== "all" && <Badge variant="outline">Mức độ: {getSeverityLabel(severityFilter)}</Badge>}
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Xóa tất cả
                    </Button>
                </div>
            )}

            {/* Words List */}
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách từ cấm ({words.length})</CardTitle>
                    <CardDescription>
                        Quản lý từ và cụm từ bị cấm trong hệ thống
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                        </div>
                    ) : words.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                            <p>Không tìm thấy từ cấm nào</p>
                            {(searchTerm || categoryFilter || severityFilter) && (
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
                        <div className="space-y-3">
                            {words.map((word) => (
                                <div key={word.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <span className="font-mono bg-muted px-3 py-1 rounded text-sm min-w-[100px]">
                                            {word.word}
                                        </span>
                                        <Badge variant="outline" className="min-w-[80px] justify-center">
                                            {getCategoryLabel(word.category)}
                                        </Badge>
                                        <Badge className={`${getSeverityColor(word.severity)} text-white min-w-[80px] justify-center`}>
                                            {getSeverityLabel(word.severity)}
                                        </Badge>
                                        {word.usageCount > 0 && (
                                            <Badge variant="secondary">
                                                {word.usageCount} lần sử dụng
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                                            → {word.replacement || "***"}
                                        </Badge>
                                        {!word.isActive && (
                                            <Badge variant="destructive">
                                                Đã tắt
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => openEditDialog(word)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={() => deleteWord(word.id, word.word)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};