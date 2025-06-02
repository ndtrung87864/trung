import React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Pencil, 
    Trash2, 
    FileText, 
    Calendar, 
    MoreHorizontal, 
    Check, 
    XCircle, 
    Clock, 
    PenLine,
    Building,
    Brain,
    BookOpen
} from "lucide-react";
import { Exam, Model } from "../../types/exam";
import { formatDate } from "../../utils/exam_utils";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ExamCardProps {
    exam: Exam;
    availableModels: Model[];
    onToggleActive: (exam: Exam) => void;
    onEdit: (exam: Exam) => void;
    onDelete: (id: string) => void;
}

export default function ExamCard({ 
    exam, 
    availableModels, 
    onToggleActive, 
    onEdit, 
    onDelete 
}: ExamCardProps) {
    // Function to check if deadline has passed
    const isDeadlinePassed = (date: string | Date | null | undefined) => {
        if (!date) return false;
        try {
            const deadlineDate = new Date(date);
            const now = new Date();
            return now > deadlineDate;
        } catch {
            return false;
        }
    };

    // Format deadline display
    const formatDeadline = (date: string | Date | null | undefined) => {
        if (!date) return "Vô hạn";
        try {
            return format(new Date(date), "HH:mm dd/MM/yyyy");
        } catch (e) {
            console.error("Error formatting date:", e);
            return "Lỗi định dạng";
        }
    };

    return (
        <Card className={`overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
            exam.isActive 
            ? "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200" 
            : ""
        }`}>
            {/* Status indicator */}
            <div
                className={`h-1.5 w-full ${
                    exam.isActive
                    ? "bg-gradient-to-r from-green-500 to-white-500"
                    : "bg-gradient-to-r from-gray-300 to-gray-400"
                }`}
            />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="line-clamp-2 text-lg">
                            {exam.name}
                        </CardTitle>

                        <div className="flex items-center gap-1 mt-1">
                            <Badge
                                variant="outline"
                                className={`text-xs ${
                                    exam.isActive 
                                    ? "bg-green-100 text-green-800 border-green-200" 
                                    : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                {exam.isActive ? (
                                    <Check className="mr-1 h-3 w-3 text-green-600" />
                                ) : (
                                    <XCircle className="mr-1 h-3 w-3" />
                                )}
                                {exam.isActive ? "Hoạt động" : "Vô hiệu hóa"}
                            </Badge>

                            {exam.deadline && (
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                    isDeadlinePassed(exam.deadline)
                                        ? "border-red-300 text-red-600"
                                        : "border-blue-300 text-blue-600"
                                    }`}
                                >
                                    <Clock className="mr-1 h-3 w-3" />
                                    {isDeadlinePassed(exam.deadline)
                                    ? "Quá hạn"
                                    : "Còn hạn"}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => onToggleActive({...exam, isActive: !exam.isActive})}
                            >
                                {exam.isActive ? (
                                    <>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Vô hiệu hóa
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Kích hoạt
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onToggleActive({...exam, allowReferences: !(exam.allowReferences || false)})}
                            >
                                {exam.allowReferences ? (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Tắt tài liệu tham khảo
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Bật tài liệu tham khảo
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onToggleActive({...exam, shuffleQuestions: !(exam.shuffleQuestions || false)})}
                            >
                                {exam.shuffleQuestions ? (
                                    <>
                                        <PenLine className="mr-2 h-4 w-4" />
                                        Tắt xáo trộn câu hỏi
                                    </>
                                ) : (
                                    <>
                                        <PenLine className="mr-2 h-4 w-4" />
                                        Bật xáo trộn câu hỏi
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                {exam.description && (
                    <CardDescription className="line-clamp-2 mb-3">
                        {exam.description}
                    </CardDescription>
                )}

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">
                                {availableModels.find(m => m.id === exam.modelId)?.name || "Không rõ"}
                            </span>
                        </div>

                        {exam.channelId && exam.channel && (
                            <>
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">
                                        {exam.channel.name || "Không rõ"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <Building className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">
                                        {exam.channel.server?.name || "Không rõ"}
                                    </span>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <PenLine className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-medium">
                                {exam.questionCount || 0} câu hỏi
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-medium">
                                {exam.prompt ? `${exam.prompt}` : "Không giới hạn"}
                            </span>
                        </div>
                    </div>

                    {exam.deadline && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Hạn nộp: {formatDeadline(exam.deadline)}</span>
                        </div>
                    )}

                    {exam.files && exam.files.length > 0 && (
                        <div className="border-t pt-3">
                            <div className="flex items-center mb-1 text-xs font-medium text-blue-600">
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                {exam.files.length} tài liệu đính kèm
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                                {exam.files.slice(0, 3).map((file, index) => (
                                    <div key={file.id || index} className="flex">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const modifiedUrl = file.url.replace('http://localhost:3000/', '/uploads/');
                                                window.open(`/api/files/view?path=${encodeURIComponent(modifiedUrl)}`, '_blank');
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left truncate max-w-full"
                                            title={`Mở ${file.name}`}
                                        >
                                            📄 {file.name}
                                        </button>
                                    </div>
                                ))}
                                {exam.files.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                        +{exam.files.length - 3} tài liệu khác
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Configuration badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                        <Badge
                            variant={exam.allowReferences ? "default" : "outline"}
                            className={`text-xs ${
                                exam.allowReferences
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            <FileText className="mr-1 h-3 w-3" />
                            {exam.allowReferences
                                ? "Tài liệu tham khảo"
                                : "Trích xuất tài liệu"}
                        </Badge>

                        <Badge
                            variant={exam.shuffleQuestions ? "default" : "outline"}
                            className={`text-xs ${
                                exam.shuffleQuestions
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            <PenLine className="mr-1 h-3 w-3" />
                            {exam.shuffleQuestions
                                ? "Xáo trộn câu hỏi"
                                : "Không xáo trộn câu hỏi"}
                        </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                        Ngày tạo: {formatDate(exam.createdAt)}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2 pb-4 px-4 border-t flex justify-between">
                <div className="flex items-center gap-1"></div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(exam)}
                        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    >
                        <Pencil className="h-4 w-4 mr-1" /> Sửa
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        onClick={() => onDelete(exam.id)}
                    >
                        <Trash2 className="h-4 w-4 mr-1" /> Xóa
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}