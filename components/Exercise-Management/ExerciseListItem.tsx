"use client";

import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  Calendar,
  MoreHorizontal,
  Check,
  XCircle,
  FileText,
  PenLine,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Import the shared Exercise type
import { Exercise } from "@/types/exercise";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExerciseListItemProps {
  exercise: Exercise;
  models: { id: string; name: string }[];
  onEdit?: (exercise: Exercise) => void;
  onRefresh?: () => void;
}

export default function ExerciseListItem({
  exercise,
  onEdit,
  onRefresh,
}: ExerciseListItemProps) {
  // Determine styling based on exercise status
  const listItemStyle = () => {
    if (!exercise.isActive) {
      return "border-gray-300 bg-gray-50/50";
    }
    return "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-white";
  };

  // Handle status toggle
  const handleToggleStatus = async () => {
    try {
      const response = await fetch(
        `/api/admin/exercise/${exercise.id}/toggle-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !exercise.isActive,
          }),
        }
      );

      if (!response.ok) throw new Error("Không thể thay đổi trạng thái");

      const result = await response.json();

      toast({
        title: "Thành công",
        description:
          result.message ||
          `Bài tập đã được ${!exercise.isActive ? "kích hoạt" : "vô hiệu hóa"}`,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái bài tập",
        variant: "destructive",
      });
    }
  };

  // Handle references toggle
  const handleToggleReferences = async () => {
    try {
      const response = await fetch(
        `/api/admin/exercise/${exercise.id}/toggle-references`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            allowReferences: !exercise.allowReferences,
          }),
        }
      );

      if (!response.ok)
        throw new Error("Không thể thay đổi cấu hình tài liệu tham khảo");

      const result = await response.json();

      toast({
        title: "Thành công",
        description:
          result.message ||
          `${
            !exercise.allowReferences ? "Cho phép" : "Vô hiệu hóa"
          } tài liệu tham khảo`,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error toggling references:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật cấu hình tài liệu tham khảo",
        variant: "destructive",
      });
    }
  };

  // Handle shuffle toggle
  const handleToggleShuffle = async () => {
    try {
      const response = await fetch(
        `/api/admin/exercise/${exercise.id}/toggle-shuffle`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shuffleQuestions: !exercise.shuffleQuestions,
          }),
        }
      );

      if (!response.ok)
        throw new Error("Không thể thay đổi cấu hình xáo trộn câu hỏi");

      const result = await response.json();

      toast({
        title: "Thành công",
        description:
          result.message ||
          `${!exercise.shuffleQuestions ? "Bật" : "Tắt"} xáo trộn câu hỏi`,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error toggling question shuffling:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật cấu hình xáo trộn câu hỏi",
        variant: "destructive",
      });
    }
  };

  // Format creation date
  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: vi });
    } catch {
      return "Không rõ";
    }
  };

  // Format deadline
  const formatDeadline = (date: string | Date | null | undefined) => {
    if (!date) return "Không có hạn";
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi });
    } catch {
      return "Định dạng không hợp lệ";
    }
  };

  const statusBadge = exercise.isActive
    ? "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
    : "bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium";

  return (
    <div
      className={`p-6 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6  ${listItemStyle()} hover:shadow-md transition-all duration-300`}
    >
      {/* Left side: Basic info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {exercise.name}
          </h3>
          <span className={statusBadge}>
            {exercise.isActive ? "Hoạt động" : "Không hoạt động"}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {exercise.description || "Không có mô tả"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-2">
          <div>
            <span className="font-medium text-gray-700">Mô hình: </span>
            <span className="text-gray-600">
              {exercise.model?.name || "Không rõ"}
            </span>
          </div>

          <div>
            <span className="font-medium text-gray-700">Môn học: </span>
            <span className="text-gray-600">
              {exercise.channel?.name || "Không được gán"}
            </span>
          </div>

          <div>
            <span className="font-medium text-gray-700">Hạn nộp: </span>
            <span className="text-gray-600">
              {formatDeadline(exercise.deadline)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Ngày tạo: {formatDate(exercise.createdAt)}
          </div>

          {exercise.allowReferences ? (
            <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
              Tài liệu tham khảo
            </div>
          ):(
            <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              Trích xuất tài liệu
            </div>
          )}

          {exercise.shuffleQuestions ? (
            <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
              Xáo trộn câu hỏi
            </div>
          ):(
            <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              Không xáo trộn câu hỏi
            </div>
          )}

          {exercise.questionCount !== null && (
            <div className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
              {exercise.questionCount} câu hỏi
            </div>
          )}
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex md:flex-col lg:flex-row items-center gap-3 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-full"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleToggleStatus}>
              {exercise.isActive ? (
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
            <DropdownMenuItem onClick={handleToggleReferences}>
              {exercise.allowReferences ? (
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
            <DropdownMenuItem onClick={handleToggleShuffle}>
              {exercise.shuffleQuestions ? (
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit && onEdit(exercise)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Sửa
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            /* TODO: Implement delete functionality */
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Xóa
        </Button>
      </div>
    </div>
  );
}
