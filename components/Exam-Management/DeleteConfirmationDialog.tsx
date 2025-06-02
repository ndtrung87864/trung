import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isLoading: boolean;
}

export default function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    isLoading
}: DeleteConfirmationDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Xác nhận xóa</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn xóa bài kiểm tra này không? Hành động này không thể được hoàn tác.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-4">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Hủy bỏ
                    </Button>
                    <Button 
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Đang xử lý...
                            </>
                        ) : 'Xóa'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
