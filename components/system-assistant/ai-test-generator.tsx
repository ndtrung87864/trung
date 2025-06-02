"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Brain,
    Wand2,
    Plus,
    RefreshCw,
    Check,
    X,
    Lightbulb,
    Target,
    AlertTriangle,
    Award,
    User,
    MessageSquare,
    Sparkles,
    Settings,
    Download,
    Upload,
    BookOpen,
    GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExistingAssistant {
    id: string;
    name: string;
    fieldName: string;
    fieldId: string;
    modelName: string;
    prompt: string;
    isActive: boolean;
}

interface GeneratedTest {
    id: string;
    question: string;
    expectedBehavior: string;
    category: 'KNOWLEDGE' | 'SAFETY' | 'PERSONA' | 'INSTRUCTION_FOLLOWING' | 'ETHICAL';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    generatedBy: 'AI' | 'MANUAL';
    context?: string;
    variations?: string[];
    evaluationCriteria?: string[];
    createdAt: string;
}

interface TestGenerationConfig {
    selectedAssistantId: string;
    fieldName: string;
    assistantRole: string;
    targetAudience: string;
    focusAreas: string[];
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
    testCount: number;
    includeVariations: boolean;
    customContext?: string;
}

export function AITestGenerator() {
    const [existingAssistants, setExistingAssistants] = useState<ExistingAssistant[]>([]);
    const [generatedTests, setGeneratedTests] = useState<GeneratedTest[]>([]);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<TestGenerationConfig>({
        selectedAssistantId: '',
        fieldName: '',
        assistantRole: '',
        targetAudience: 'students',
        focusAreas: [],
        difficulty: 'MIXED',
        testCount: 10,
        includeVariations: false
    });
    const [selectedTests, setSelectedTests] = useState<string[]>([]);

    const availableFocusAreas = [
        'Tuân thủ Prompt',
        'Độ chính xác kiến thức',
        'An toàn & Đạo đức',
        'Hướng dẫn học sinh',
        'Hỗ trợ giáo dục',
        'Độ rõ ràng phản hồi',
        'Ranh giới phù hợp',
        'Hỗ trợ hữu ích',
        'Nhạy cảm văn hóa',
        'Phù hợp độ tuổi'
    ];

    const categoryNames = {
        'KNOWLEDGE': 'Kiến thức',
        'SAFETY': 'An toàn',
        'PERSONA': 'Nhân cách',
        'INSTRUCTION_FOLLOWING': 'Làm theo hướng dẫn',
        'ETHICAL': 'Đạo đức'
    };

    const difficultyNames = {
        'EASY': 'Dễ',
        'MEDIUM': 'Trung bình',
        'HARD': 'Khó',
        'MIXED': 'Hỗn hợp'
    };

    useEffect(() => {
        fetchExistingAssistants();
    }, []);

    const fetchExistingAssistants = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/system-master/assistants');
            if (response.ok) {
                const data = await response.json();
                setExistingAssistants(data);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách trợ lý:', error);
            toast.error("Không thể tải danh sách trợ lý");
        } finally {
            setLoading(false);
        }
    };

    const handleAssistantSelection = (assistantId: string) => {
        const selectedAssistant = existingAssistants.find(a => a.id === assistantId);
        if (selectedAssistant) {
            setConfig({
                ...config,
                selectedAssistantId: assistantId,
                fieldName: selectedAssistant.fieldName,
                assistantRole: selectedAssistant.name
            });
        }
    };

    const generateTestsWithAI = async () => {
        if (!config.selectedAssistantId && (!config.fieldName || !config.assistantRole)) {
            toast.error("Vui lòng chọn trợ lý hoặc nhập thông tin môn học và vai trò");
            return;
        }

        setGenerating(true);
        try {
            const response = await fetch('/api/system-master/generate-tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedTests(prev => [...prev, ...data.tests]);
                toast.success(`Đã tạo thành công ${data.tests.length} bài kiểm tra!`);
            } else {
                throw new Error('Tạo bài kiểm tra thất bại');
            }
        } catch (error) {
            console.error('Lỗi tạo bài kiểm tra:', error);
            toast.error("Không thể tạo bài kiểm tra");
        } finally {
            setGenerating(false);
        }
    };

    const toggleTestSelection = (testId: string) => {
        setSelectedTests(prev =>
            prev.includes(testId)
                ? prev.filter(id => id !== testId)
                : [...prev, testId]
        );
    };

    const selectAllTests = () => {
        setSelectedTests(generatedTests.map(t => t.id));
    };

    const clearSelection = () => {
        setSelectedTests([]);
    };

    const exportSelectedTests = () => {
        const selected = generatedTests.filter(t => selectedTests.includes(t.id));
        const exportData = {
            tests: selected,
            exportedAt: new Date().toISOString(),
            config: config
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bai-kiem-tra-ai-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Đã xuất bài kiểm tra thành công!");
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'KNOWLEDGE': return <Brain className="h-4 w-4" />;
            case 'SAFETY': return <AlertTriangle className="h-4 w-4" />;
            case 'PERSONA': return <User className="h-4 w-4" />;
            case 'INSTRUCTION_FOLLOWING': return <Target className="h-4 w-4" />;
            case 'ETHICAL': return <Award className="h-4 w-4" />;
            default: return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'EASY': return 'text-green-600 bg-green-50 border-green-200';
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'HARD': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
                    <p className="text-muted-foreground">Đang tải danh sách trợ lý...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                        <Wand2 className="h-6 w-6" />
                        Trình Tạo Bài Kiểm Tra AI cho Trợ Lý Học Tập
                    </CardTitle>
                    <p className="text-purple-600 text-sm">
                        Tạo bộ bài kiểm tra toàn diện để đánh giá các trợ lý AI học tập sử dụng Gemini AI
                    </p>
                </CardHeader>
            </Card>

            {/* Configuration Panel */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Cấu Hình Tạo Bài Kiểm Tra
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Assistant Selection */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-800">
                            <GraduationCap className="h-4 w-4" />
                            Chọn Trợ Lý Có Sẵn (Khuyến nghị)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {existingAssistants.map((assistant) => (
                                <div
                                    key={assistant.id}
                                    className={cn(
                                        "p-3 border rounded-lg cursor-pointer transition-all",
                                        config.selectedAssistantId === assistant.id
                                            ? "border-blue-500 bg-blue-100 shadow-sm"
                                            : "border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50"
                                    )}
                                    onClick={() => handleAssistantSelection(assistant.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h5 className="font-medium text-sm">{assistant.name}</h5>
                                            <p className="text-xs text-gray-600 mt-1">{assistant.fieldName}</p>
                                            <Badge
                                                variant="outline"
                                                className="text-xs mt-2"
                                            >
                                                {assistant.modelName}
                                            </Badge>
                                        </div>
                                        <div className={cn(
                                            "w-4 h-4 border-2 rounded-full flex items-center justify-center",
                                            config.selectedAssistantId === assistant.id
                                                ? "border-blue-500 bg-blue-500"
                                                : "border-gray-300"
                                        )}>
                                            {config.selectedAssistantId === assistant.id && (
                                                <Check className="h-2 w-2 text-white" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {config.selectedAssistantId && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm text-green-700">
                                    ✅ Đã chọn: {existingAssistants.find(a => a.id === config.selectedAssistantId)?.name}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-gray-300 flex-1"></div>
                        <span className="text-sm text-gray-500 font-medium">HOẶC TẠO MỚI</span>
                        <div className="h-px bg-gray-300 flex-1"></div>
                    </div>

                    {/* Manual Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Môn Học/Lĩnh Vực</label>
                            <Input
                                placeholder="VD: Toán học, Vật lý, Văn học..."
                                value={config.fieldName}
                                onChange={(e) => setConfig({ ...config, fieldName: e.target.value, selectedAssistantId: '' })}
                                disabled={!!config.selectedAssistantId}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Vai Trò Trợ Lý</label>
                            <Input
                                placeholder="VD: Gia sư Toán, Trợ lý Khoa học, Huấn luyện viên Viết..."
                                value={config.assistantRole}
                                onChange={(e) => setConfig({ ...config, assistantRole: e.target.value, selectedAssistantId: '' })}
                                disabled={!!config.selectedAssistantId}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Đối Tượng Mục Tiêu</label>
                            <select
                                value={config.targetAudience}
                                onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md bg-white"
                            >
                                <option value="students">Học sinh</option>
                                <option value="teachers">Giáo viên</option>
                                <option value="researchers">Nhà nghiên cứu</option>
                                <option value="general">Công chúng</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Mức Độ Khó</label>
                            <select
                                value={config.difficulty}
                                onChange={(e) => setConfig({ ...config, difficulty: e.target.value as any })}
                                className="w-full px-3 py-2 border rounded-md bg-white"
                            >
                                <option value="EASY">Dễ</option>
                                <option value="MEDIUM">Trung bình</option>
                                <option value="HARD">Khó</option>
                                <option value="MIXED">Hỗn hợp</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Số Lượng Bài Kiểm Tra</label>
                            <Input
                                type="number"
                                min="5"
                                max="50"
                                value={config.testCount}
                                onChange={(e) => setConfig({ ...config, testCount: parseInt(e.target.value) || 10 })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">Lĩnh Vực Trọng Tâm (Chọn nhiều)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {availableFocusAreas.map((area) => (
                                <label key={area} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.focusAreas.includes(area)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setConfig({ ...config, focusAreas: [...config.focusAreas, area] });
                                            } else {
                                                setConfig({ ...config, focusAreas: config.focusAreas.filter(a => a !== area) });
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span>{area}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">Ngữ Cảnh Tùy Chỉnh (Không bắt buộc)</label>
                        <Textarea
                            placeholder="Cung cấp ngữ cảnh bổ sung hoặc các tình huống cụ thể bạn muốn kiểm tra..."
                            value={config.customContext || ''}
                            onChange={(e) => setConfig({ ...config, customContext: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.includeVariations}
                                onChange={(e) => setConfig({ ...config, includeVariations: e.target.checked })}
                                className="rounded"
                            />
                            <span>Bao gồm các biến thể câu hỏi</span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={generateTestsWithAI}
                            disabled={generating || (!config.selectedAssistantId && (!config.fieldName || !config.assistantRole))}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {generating ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {generating ? 'Đang tạo...' : 'Tạo Bài Kiểm Tra với AI'}
                        </Button>

                        {generatedTests.length > 0 && (
                            <Button onClick={() => setGeneratedTests([])} variant="outline">
                                Xóa Tất Cả Bài Kiểm Tra
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Generated Tests Display */}
            {generatedTests.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5" />
                                Bài Kiểm Tra Đã Tạo ({generatedTests.length})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={selectAllTests}
                                    variant="outline"
                                    size="sm"
                                >
                                    Chọn Tất Cả
                                </Button>
                                <Button
                                    onClick={clearSelection}
                                    variant="outline"
                                    size="sm"
                                >
                                    Bỏ Chọn
                                </Button>
                                <Button
                                    onClick={exportSelectedTests}
                                    disabled={selectedTests.length === 0}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Xuất Đã Chọn ({selectedTests.length})
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Đã chọn: {selectedTests.length}</span>
                            <span>•</span>
                            <span>Danh mục: {Array.from(new Set(generatedTests.map(t => t.category))).length}</span>
                            <span>•</span>
                            <span>Tạo bởi AI: {generatedTests.filter(t => t.generatedBy === 'AI').length}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96">
                            <div className="space-y-4">
                                {generatedTests.map((test, index) => (
                                    <div
                                        key={test.id}
                                        className={cn(
                                            "p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md",
                                            selectedTests.includes(test.id)
                                                ? "border-blue-300 bg-blue-50 shadow-sm"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                        onClick={() => toggleTestSelection(test.id)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-6 h-6 border-2 rounded flex items-center justify-center",
                                                    selectedTests.includes(test.id)
                                                        ? "border-blue-500 bg-blue-500"
                                                        : "border-gray-300"
                                                )}>
                                                    {selectedTests.includes(test.id) && (
                                                        <Check className="h-4 w-4 text-white" />
                                                    )}
                                                </div>
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    {getCategoryIcon(test.category)}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">Bài Kiểm Tra #{index + 1}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs">
                                                            {categoryNames[test.category]}
                                                        </Badge>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("text-xs border", getDifficultyColor(test.difficulty))}
                                                        >
                                                            {difficultyNames[test.difficulty]}
                                                        </Badge>
                                                        {test.generatedBy === 'AI' && (
                                                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                                                                <Sparkles className="h-3 w-3 mr-1" />
                                                                Tạo bởi AI
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(test.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>

                                        <div className="space-y-3 ml-9">
                                            <div>
                                                <h5 className="font-medium text-sm mb-1">Câu Hỏi:</h5>
                                                <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                                                    {test.question}
                                                </p>
                                            </div>

                                            <div>
                                                <h5 className="font-medium text-sm mb-1">Hành Vi Mong Đợi:</h5>
                                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                                    {test.expectedBehavior}
                                                </p>
                                            </div>

                                            {test.context && (
                                                <div>
                                                    <h5 className="font-medium text-sm mb-1">Ngữ Cảnh:</h5>
                                                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                                        {test.context}
                                                    </p>
                                                </div>
                                            )}

                                            {test.variations && test.variations.length > 0 && (
                                                <div>
                                                    <h5 className="font-medium text-sm mb-1">Biến Thể Câu Hỏi:</h5>
                                                    <div className="space-y-1">
                                                        {test.variations.map((variation, idx) => (
                                                            <p key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                                                {idx + 1}. {variation}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {test.evaluationCriteria && test.evaluationCriteria.length > 0 && (
                                                <div>
                                                    <h5 className="font-medium text-sm mb-1">Tiêu Chí Đánh Giá:</h5>
                                                    <ul className="text-xs space-y-1">
                                                        {test.evaluationCriteria.map((criteria, idx) => (
                                                            <li key={idx} className="text-yellow-700 flex items-start gap-1">
                                                                <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                                <span>{criteria}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats */}
            {generatedTests.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {['KNOWLEDGE', 'SAFETY', 'PERSONA', 'INSTRUCTION_FOLLOWING', 'ETHICAL'].map((category) => {
                        const count = generatedTests.filter(t => t.category === category).length;
                        return (
                            <Card key={category} className="text-center">
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-center mb-2">
                                        {getCategoryIcon(category)}
                                    </div>
                                    <div className="text-2xl font-bold text-gray-700">{count}</div>
                                    <div className="text-xs text-gray-500">
                                        {categoryNames[category as keyof typeof categoryNames]}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}