import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, MoreHorizontal } from "lucide-react";
import { Exam, Model } from "../../types/exam";
import { formatDate } from "../../utils/exam_utils";
import ClientOnly from "@/components/ClientOnly";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface ExamListItemProps {
  exam: Exam;
  availableModels: Model[];
  onToggleActive: (exam: Exam) => void;
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
}

export default function ExamListItem({
  exam,
  availableModels,
  onToggleActive,
  onEdit,
  onDelete,
}: ExamListItemProps) {
  // Determine styling based on exam status
  const listItemStyle = () => {
    if (!exam.isActive) {
      return "border-gray-300 bg-gray-50/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out";
    }
    if (exam.deadline && new Date(exam.deadline) < new Date()) {
      return "border-l-4 border-l-green-600 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out bg-gradient-to-r from-green-50/70 to-white";
    }
    return "border-l-4 border-l-green-500 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out bg-gradient-to-r from-green-100/70 to-white";
  };

  const statusBadge = exam.isActive
    ? "bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
    : "bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold shadow-sm";
  return (
    <div
      className={`p-6 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${listItemStyle()} ${
        !exam.isActive ? "opacity-90" : ""
      } shadow-sm`}
    >
      {/* Left side: Basic info */}
      <div className="flex-grow min-w-0 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900 truncate">
              {exam.name}
            </h3>

            <span className={statusBadge}>
              {exam.isActive ? "Hoạt động" : "Không hoạt động"}
            </span>
          </div>
          <div className="md:hidden">
            {/* Dropdown menu for mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full hover:bg-green-100/50 transition-transform duration-200 hover:scale-105"
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl shadow-lg border border-gray-200 bg-white animate-in fade-in-80 duration-200"
              >
                <DropdownMenuItem className="flex-col items-start gap-y-2 px-4 py-3 hover:bg-green-50 transition-colors duration-200">
                  <div className="font-medium text-sm text-gray-800">
                    Hoạt động:
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={exam.isActive}
                      onCheckedChange={() =>
                        onToggleActive({ ...exam, isActive: !exam.isActive })
                      }
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {exam.isActive ? "Bật" : "Tắt"}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem className="flex-col items-start gap-y-2 px-4 py-3 hover:bg-green-50 transition-colors duration-200">
                  <div className="font-medium text-sm text-gray-800">
                    Tài liệu tham khảo:
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={exam.allowReferences || false}
                      onCheckedChange={() =>
                        onToggleActive({
                          ...exam,
                          allowReferences: !(exam.allowReferences || false),
                        })
                      }
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {exam.allowReferences ? "Cho phép" : "Không cho phép"}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem className="flex-col items-start gap-y-2 px-4 py-3 hover:bg-green-50 transition-colors duration-200">
                  <div className="font-medium text-sm text-gray-800">
                    Xáo trộn câu hỏi:
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={exam.shuffleQuestions || false}
                      onCheckedChange={() =>
                        onToggleActive({
                          ...exam,
                          shuffleQuestions: !(exam.shuffleQuestions || false),
                        })
                      }
                      className="data-[state=checked]:bg-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {exam.shuffleQuestions ? "Bật" : "Tắt"}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {exam.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <span className="font-medium text-gray-800">Mô hình: </span>
            <span className="text-gray-600">
              {availableModels.find((m) => m.id === exam.modelId)?.name ||
                exam.modelId}
            </span>
          </div>

          {exam.channelId && exam.channel && (
            <div>
              <span className="font-medium text-gray-800">Môn học: </span>
              <span className="text-gray-600">
                {exam.channel.name} [
                {exam.channel.server?.name || "Unknown server"}]
              </span>
            </div>
          )}

          <div>
            <span className="font-medium text-gray-800">Hạn nộp: </span>
            <span className="text-gray-600">
              <ClientOnly fallback="Đang tải...">
                {exam.deadline
                  ? format(new Date(exam.deadline), "HH:mm dd/MM/yyyy")
                  : "Vô hạn"}
              </ClientOnly>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Ngày tạo: {formatDate(exam.createdAt)}
          </div>
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Ngày cập nhật: {formatDate(exam.updatedAt)}
          </div>

          {exam.allowReferences ? (
            <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
              Tài liệu tham khảo
            </div>
          ) : (
            <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              Trích xuất tài liệu
            </div>
          )}

          {exam.shuffleQuestions ? (
            <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
              Xáo trộn câu hỏi
            </div>
          ) : (
            <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              Không xáo trộn câu hỏi
            </div>
          )}
          {exam.questionCount !== null && (
            <div className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
              {exam.questionCount} câu hỏi
            </div>
          )}
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex md:flex-col lg:flex-row items-center gap-3 shrink-0">
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 rounded-full hover:bg-green-100/50 transition-transform duration-200 hover:scale-105"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl shadow-lg border border-gray-200 bg-white animate-in fade-in-80 duration-200"
            >
              <DropdownMenuItem className="flex-col items-start gap-y-2 px-4 py-3 hover:bg-green-50 transition-colors duration-200">
                <div className="font-medium text-sm text-gray-800">
                  Hoạt động:
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={exam.isActive}
                    onCheckedChange={() =>
                      onToggleActive({ ...exam, isActive: !exam.isActive })
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    {exam.isActive ? "Bật" : "Tắt"}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem className="flex-col items-start gap-y-2 px-4 py-3 hover:bg-green-50 transition-colors duration-200">
                <div className="font-medium text-sm text-gray-800">
                  Tài liệu tham khảo:
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={exam.allowReferences || false}
                    onCheckedChange={() =>
                      onToggleActive({
                        ...exam,
                        allowReferences: !(exam.allowReferences || false),
                      })
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    {exam.allowReferences ? "Cho phép" : "Không cho phép"}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem className="flex-col items-start gap-y-2 px-4 py-3 hover:bg-green-50 transition-colors duration-200">
                <div className="font-medium text-sm text-gray-800">
                  Xáo trộn câu hỏi:
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={exam.shuffleQuestions || false}
                    onCheckedChange={() =>
                      onToggleActive({
                        ...exam,
                        shuffleQuestions: !(exam.shuffleQuestions || false),
                      })
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    {exam.shuffleQuestions ? "Bật" : "Tắt"}
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(exam)}
          className="text-gray-700 border-gray-300 hover:bg-gradient-to-r hover:from-green-100 hover:to-green-50 hover:text-gray-900 transition-all duration-200 hover:scale-105"
        >
          <Pencil className="h-4 w-4 mr-1.5" />
          Sửa
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(exam.id)}
          className="bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Xóa
        </Button>
      </div>
    </div>
  );
}
