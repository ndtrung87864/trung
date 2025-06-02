"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Import the shared Exercise type
import { Exercise } from "@/types/exercise";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Brain,
  BookOpen,
  Calendar,
  Check,
  XCircle,
  Clock,
  PenLine,
  Building,
} from "lucide-react";

interface ExerciseCardProps {
  exercise: Exercise;
  models: { id: string; name: string }[];
  onEdit?: (exercise: Exercise) => void;
  onRefresh?: () => void;
  serverId: string;
}

export const ExerciseCard = ({
  exercise,
  onEdit,
  onRefresh,
}: ExerciseCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      console.log("Deleting exercise:", exercise.id);

      const response = await fetch(`/api/admin/exercise/${exercise.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let errorMessage = "Không thể xóa bài tập";

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.log("Delete error data:", errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Delete success result:", result);

      toast({
        title: "Thành công",
        description: result.message || "Bài tập đã được xóa thành công",
      });

      // Trigger refresh
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting exercise:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi xóa bài tập";

      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to format deadline display
  const formatDeadline = (date: string | Date | null | undefined) => {
    if (!date) return null;
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi });
    } catch (e) {
      console.error("Error formatting date:", e);
      return null;
    }
  };

  // Check if deadline has passed
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

  // Format creation date
  const formatCreationDate = (date: string | Date) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: vi });
    } catch {
      return "Không rõ";
    }
  };

  return (
    <>
      <Card
        className={`overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
          exercise.isActive ? 
             "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200" 
            : ""
        }`}
      >
        {/* Status indicator */}
        <div
          className={`h-1.5 w-full ${
            exercise.isActive
              ? "bg-gradient-to-r from-green-500 to-emerald-500"
              : "bg-gradient-to-r from-gray-300 to-gray-400"
          }`}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="line-clamp-2 text-lg">
                {exercise.name}
              </CardTitle>

              <div className="flex items-center gap-1 mt-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    exercise.isActive
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {exercise.isActive ? (
                    <Check className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {exercise.isActive ? "Hoạt động" : "Vô hiệu hóa"}
                </Badge>

                {exercise.deadline && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isDeadlinePassed(exercise.deadline)
                        ? "border-red-300 text-red-600"
                        : "border-blue-300 text-blue-600"
                    }`}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {isDeadlinePassed(exercise.deadline)
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
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle the exercise status
                    fetch(`/api/admin/exercise/${exercise.id}/toggle-status`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        isActive: !exercise.isActive,
                      }),
                    })
                      .then((response) => {
                        if (!response.ok)
                          throw new Error("Không thể thay đổi trạng thái");
                        return response.json();
                      })
                      .then(() => {
                        toast({
                          title: "Thành công",
                          description: `Bài tập đã được ${
                            !exercise.isActive ? "kích hoạt" : "vô hiệu hóa"
                          }`,
                        });
                        if (onRefresh) onRefresh();
                      })
                      .catch((error) => {
                        console.error("Error toggling status:", error);
                        toast({
                          title: "Lỗi",
                          description: "Không thể cập nhật trạng thái bài tập",
                          variant: "destructive",
                        });
                      });
                  }}
                >
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle reference materials permission
                    fetch(
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
                    )
                      .then((response) => {
                        if (!response.ok)
                          throw new Error(
                            "Không thể thay đổi cấu hình tài liệu tham khảo"
                          );
                        return response.json();
                      })
                      .then(() => {
                        toast({
                          title: "Thành công",
                          description: `${
                            !exercise.allowReferences
                              ? "Cho phép"
                              : "Vô hiệu hóa"
                          } tài liệu tham khảo`,
                        });
                        if (onRefresh) onRefresh();
                      })
                      .catch((error) => {
                        console.error("Error toggling references:", error);
                        toast({
                          title: "Lỗi",
                          description:
                            "Không thể cập nhật cấu hình tài liệu tham khảo",
                          variant: "destructive",
                        });
                      });
                  }}
                >
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle question shuffling
                    fetch(`/api/admin/exercise/${exercise.id}/toggle-shuffle`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        shuffleQuestions: !exercise.shuffleQuestions,
                      }),
                    })
                      .then((response) => {
                        if (!response.ok)
                          throw new Error(
                            "Không thể thay đổi cấu hình xáo trộn câu hỏi"
                          );
                        return response.json();
                      })
                      .then(() => {
                        toast({
                          title: "Thành công",
                          description: `${
                            !exercise.shuffleQuestions ? "Bật" : "Tắt"
                          } xáo trộn câu hỏi`,
                        });
                        if (onRefresh) onRefresh();
                      })
                      .catch((error) => {
                        console.error(
                          "Error toggling question shuffling:",
                          error
                        );
                        toast({
                          title: "Lỗi",
                          description:
                            "Không thể cập nhật cấu hình xáo trộn câu hỏi",
                          variant: "destructive",
                        });
                      });
                  }}
                >
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
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          {exercise.description && (
            <CardDescription className="line-clamp-2 mb-3">
              {exercise.description}
            </CardDescription>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {exercise.model?.name || "Không rõ"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {exercise.channel?.name || "Không rõ"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {exercise.channel?.server?.name || "Không rõ"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <PenLine className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">
                  {exercise.questionCount || 0} câu hỏi
                </span>
              </div>
            </div>

            {exercise.deadline && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Hạn nộp: {formatDeadline(exercise.deadline)}</span>
              </div>
            )}

            {exercise.files && exercise.files.length > 0 && (
              <div className="border-t pt-3">
                <div className="flex items-center mb-1 text-xs font-medium text-blue-600">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  {exercise.files.length} tài liệu đính kèm
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {exercise.files.slice(0, 3).map((file) => (
                    <div key={file.id} className="flex">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(file.url, "_blank");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left truncate max-w-full"
                        title={`Mở ${file.name}`}
                      >
                        📄 {file.name}
                      </button>
                    </div>
                  ))}
                  {exercise.files.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{exercise.files.length - 3} tài liệu khác
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Configuration badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge
                variant={exercise.allowReferences ? "default" : "outline"}
                className={`text-xs ${
                  exercise.allowReferences
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <FileText className="mr-1 h-3 w-3" />
                {exercise.allowReferences
                  ? "Tài liệu tham khảo "
                  : "Trích xuất tài liệu"}
              </Badge>

              <Badge
                variant={exercise.shuffleQuestions ? "default" : "outline"}
                className={`text-xs ${
                  exercise.shuffleQuestions
                    ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <PenLine className="mr-1 h-3 w-3" />
                {exercise.shuffleQuestions
                  ? "Xáo trộn câu hỏi"
                  : "Không xáo trộn câu hỏi"}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">
              Ngày tạo: {formatCreationDate(exercise.createdAt)}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-4 px-4 border-t flex justify-between">
          <div className="flex items-center gap-1"></div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit && onEdit(exercise)}
              className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
            >
              <Edit className="h-4 w-4 mr-1" /> Sửa
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Xóa
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài tập &quot;{exercise.name}&quot;?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
