import React, { useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Book } from "lucide-react";
import { Exam, ChannelWithServer, Model } from "../../types/exam";
import { FileUploader } from "@/components/AI-Agent-Management/file-uploader";
import { isoToLocalDateTimeString, localToISOString } from "../../utils/exam_utils";
import ClientOnly from "@/components/ClientOnly";

interface ExamFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isEditing: boolean;
    currentExam: Partial<Exam>;
    setCurrentExam: React.Dispatch<React.SetStateAction<Partial<Exam>>>;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    availableModels: Model[];
    availableChannels: ChannelWithServer[];
    onSubjectDialogOpen: () => void;
    onSubmit: () => void;
    isLoading: boolean;
    currentServerId?: string | "all";
    currentChannelId?: string | "all" | null;
}

export default function ExamFormDialog({
    open,
    onOpenChange,
    isEditing,
    currentExam,
    setCurrentExam,
    setFiles,
    availableModels,
    availableChannels,
    onSubjectDialogOpen,
    onSubmit,
    isLoading,
    currentServerId,
    currentChannelId
}: ExamFormDialogProps) {
    // Add a debugging effect to see currentExam changes
    useEffect(() => {
        if (open && isEditing) {
            console.log("Editing exam data:", currentExam);
            console.log("Deadline value:", currentExam.deadline);
            console.log("Formatted deadline:", isoToLocalDateTimeString(currentExam.deadline));
        }
    }, [open, isEditing, currentExam]);

    // Handle deadline change with improved validation and logging
    const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        console.log("Raw deadline input:", inputValue);
        
        let deadlineValue: string | undefined;
        
        if (inputValue) {
            // Convert to ISO string
            deadlineValue = localToISOString(inputValue);
            console.log("Converted deadline to ISO:", deadlineValue);
        } else {
            // If input is empty, set deadline to undefined
            deadlineValue = undefined;
            console.log("Deadline cleared");
        }
        
        // Update exam with new deadline
        setCurrentExam({ 
            ...currentExam, 
            deadline: deadlineValue
        });
    };

    // Make sure files are properly formatted for the FileUploader
    const getExistingFiles = () => {
        if (!currentExam.files || !Array.isArray(currentExam.files)) {
            return [];
        }
        
        return currentExam.files.map(file => ({
            id: file.id,
            name: file.name,
            url: file.url.replace('http://localhost:3000/', '/uploads/'),
            size: 0, // Add required properties for the file uploader
            type: '',
            lastModified: Date.now()
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>
                        {isEditing ? 'Chỉnh sửa bài kiểm tra' : 'Tạo bài kiểm tra mới'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Cập nhật thông tin bài kiểm tra.'
                            : 'Điền thông tin để tạo bài kiểm tra mới.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto px-6 flex-1 scrollbar-hide">
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Tên</Label>
                            <Input
                                id="name"
                                value={currentExam.name || ''}
                                onChange={(e) => setCurrentExam({ ...currentExam, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Mô tả</Label>
                            <Input
                                id="description"
                                value={currentExam.description || ''}
                                onChange={(e) => setCurrentExam({ ...currentExam, description: e.target.value })}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="model" className="text-right">Mô hình </Label>
                            <select
                                id="model"
                                value={currentExam.modelId || ''}
                                onChange={(e) => setCurrentExam({ ...currentExam, modelId: e.target.value })}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {availableModels.length === 0 ? (
                                    <option value="">Không tìm thấy mô hình </option>
                                ) : (
                                    availableModels.map(model => (
                                        <option key={model.id} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>                        

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="channel" className="text-right">Môn học </Label>
                            <div className="col-span-3">
                                <Button 
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-between"
                                    onClick={onSubjectDialogOpen}
                                    disabled={currentChannelId !== null && currentChannelId !== "all"}
                                >
                                    {currentExam.channelId 
                                        ? (() => {
                                            const selectedChannel = availableChannels.find(c => c.id === currentExam.channelId);
                                            return selectedChannel 
                                                ? `${selectedChannel.name} [ ${selectedChannel.serverName} ]` 
                                                : 'Môn học không xác định';
                                          })()
                                        : (currentServerId && currentServerId !== "all")
                                        ? "Chọn môn học từ lớp này"
                                        : 'Chọn môn học'}
                                    <Book className="h-4 w-4 ml-2 opacity-70" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="prompt" className="text-right pt-2">Thời gian làm bài</Label>
                            <select
                                id="prompt"
                                value={currentExam.prompt || ''}
                                onChange={(e) => setCurrentExam({ ...currentExam, prompt: e.target.value })}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">-- Chọn thời gian làm bài --</option>
                                <option value="5 phút">5 phút</option>
                                <option value="10 phút">10 phút</option>
                                <option value="15 phút">15 phút</option>
                                <option value="30 phút">30 phút</option>
                                <option value="45 phút">45 phút</option>
                                <option value="60 phút">60 phút</option>
                                <option value="90 phút">90 phút</option>
                                <option value="120 phút">120 phút</option>
                            </select>
                        </div>

                        {/* Updated deadline field with improved handling */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="deadline" className="text-right">Hạn nộp</Label>
                            <div className="col-span-3">
                                <ClientOnly fallback={<div className="h-10 rounded-md border border-input bg-background"></div>}>
                                    <Input
                                        id="deadline"
                                        type="datetime-local"
                                        value={isoToLocalDateTimeString(currentExam.deadline)}
                                        onChange={handleDeadlineChange}
                                        className="w-full"
                                    />
                                </ClientOnly>
                                {currentExam.deadline && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Đã chọn: {new Date(currentExam.deadline).toLocaleString('vi-VN')}
                                    </p>
                                )}
                            </div>
                        </div>                       
                         <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">Tài liệu</Label>
                            <div className="col-span-3">
                                <FileUploader
                                    onFilesSelected={setFiles}
                                    existingFiles={getExistingFiles()}
                                    acceptedFileTypes=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                                    maxFileSizeInMB={20}
                                    maxFiles={5}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="questionCount" className="text-right">Số câu hỏi</Label>
                            <Input
                                id="questionCount"
                                type="number"
                                min="1"
                                max="100"
                                value={currentExam.questionCount || 0}
                                onChange={(e) => setCurrentExam({ 
                                    ...currentExam, 
                                    questionCount: e.target.value ? parseInt(e.target.value) : 10 
                                })}
                                className="col-span-3"
                                placeholder="Nhập số câu hỏi cần trích xuất"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="allowReferences" className="text-right">Tài liệu tham khảo</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="allowReferences"
                                    checked={currentExam.allowReferences === true}
                                    onCheckedChange={(checked) =>
                                        setCurrentExam({ ...currentExam, allowReferences: checked })
                                    }
                                />
                                <Label htmlFor="allowReferences">
                                    {currentExam.allowReferences === true ? 'Cho phép' : 'Không cho phép'}
                                </Label>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="shuffleQuestions" className="text-right">Xáo trộn câu hỏi</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="shuffleQuestions"
                                    checked={currentExam.shuffleQuestions === true}
                                    onCheckedChange={(checked) =>
                                        setCurrentExam({ ...currentExam, shuffleQuestions: checked })
                                    }
                                />
                                <Label htmlFor="shuffleQuestions">
                                    {currentExam.shuffleQuestions === true ? 'Có' : 'Không'}
                                </Label>
                            </div>
                        </div>                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="isActive" className="text-right">Kích hoạt</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={currentExam.isActive === true}
                                    onCheckedChange={(checked) =>
                                        setCurrentExam({ ...currentExam, isActive: checked })
                                    }
                                />
                                <Label htmlFor="isActive">
                                    {currentExam.isActive === true ? 'Đã kích hoạt' : 'Đã vô hiệu hóa'}
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 mt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Hủy bỏ
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white group">
                        {isLoading ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Đang xử lý...
                            </>
                        ) : isEditing ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
