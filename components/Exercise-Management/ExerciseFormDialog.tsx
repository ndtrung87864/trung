"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Book, AlertCircle, X } from "lucide-react";
import { FileUploader } from "@/components/AI-Agent-Management/file-uploader";
import ClientOnly from "@/components/ClientOnly";
import ExerciseSubjectSelectionDialog from "./ExerciseSubjectSelectionDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define interfaces
interface Model {
  id: string;
  name: string;
}

interface Field {
  id: string;
  name: string;
}

interface ExerciseFile {
  id: string;
  name: string;
  url: string;
}

interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  modelId: string;
  fieldId?: string;
  deadline?: Date | string | null;
  files: ExerciseFile[];
  questionCount?: number | null;
  allowReferences?: boolean;
  shuffleQuestions?: boolean;
  channel?: {
    id: string;
    name: string;
    serverId: string;
    server?: {
      id: string;
      name: string;
    };
  };
}

interface ExerciseFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  models: Model[];
  fields?: Field[];
  exercise?: Exercise;
  isEdit?: boolean;
  servers?: [string, string][]; // [serverId, serverName]
  serverChannels?: Record<string, { id: string; name: string; type: string }[]>;
}

// Define form schema with zod
const formSchema = z.object({
  name: z.string().min(1, "Tên bài tập không được để trống"),
  description: z.string().optional(),
  modelId: z.string().min(1, "Vui lòng chọn một mô hình"),
  channelId: z.string().optional(),
  deadline: z.string().optional(),
  isActive: z.boolean().default(true),
  questionCount: z.number().optional(),
  allowReferences: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
});

// Utility functions for date handling
const isoToLocalDateTimeString = (isoString?: string): string => {
  if (!isoString) return "";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("Error converting ISO to local datetime string:", error);
    return "";
  }
};

export const ExerciseFormDialog = ({
  isOpen,
  onClose,
  models = [],
  exercise,
  isEdit = false,
  servers = [],
  serverChannels = {},
}: ExerciseFormDialogProps) => {
  const router = useRouter();

  // State for UI management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<ExerciseFile[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Add state for models with loading and error handling
  const [availableModels, setAvailableModels] = useState<Model[]>(models);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // State for subject dialog
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<
    string | undefined
  >();
  const [selectedChannelName, setSelectedChannelName] = useState<string>("");
  const [urlServerId, setUrlServerId] = useState<string | null>(null);
  const [urlChannelId, setUrlChannelId] = useState<string | null>(null);
  const [serverSelectionDisabled, setServerSelectionDisabled] = useState(false);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      modelId: "",
      channelId: "",
      deadline: "",
      isActive: true,
      questionCount: 10,
      allowReferences: false,
      shuffleQuestions: false,
    },
  });

  // Extract query parameters from URL when component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && isOpen && !isEdit) {
      const urlParams = new URLSearchParams(window.location.search);
      const serverId = urlParams.get("serverId");
      const channelId = urlParams.get("channelId");

      if (serverId) {
        setUrlServerId(serverId);
        setSelectedServerId(serverId);
        setServerSelectionDisabled(true);

        // When both serverId and channelId are provided
        if (channelId) {
          setUrlChannelId(channelId);
          form.setValue("channelId", channelId);

          // Find channel name for display - optimize by immediately checking serverChannels
          if (serverChannels[serverId]) {
            const channel = serverChannels[serverId].find(
              (c) => c.id === channelId
            );
            if (channel) {
              // Get server name for complete display
              const serverName =
                servers.find((s) => s[0] === serverId)?.[1] || "";
              setSelectedChannelName(`${channel.name} [${serverName}]`);
            } else {
              // If we don't have the channel in our cached data, fetch it directly
              fetchChannelInfo(serverId, channelId);
            }
          } else {
            // If we don't have the server channels cached, fetch the channel directly
            fetchChannelInfo(serverId, channelId);
          }
        }
      }
    }
  }, [isOpen, isEdit, form, serverChannels, servers]);

  // Add a function to fetch a single channel's information if needed
  // Define the channel interface
  interface ChannelData {
    id: string;
    name: string;
    type: string;
  }

  const fetchChannelInfo = async (serverId: string, channelId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/channels`);
      if (response.ok) {
        const channels = (await response.json()) as ChannelData[];
        const channel = channels.find((c: ChannelData) => c.id === channelId);
        if (channel) {
          const serverName =
            servers.find((s) => s[0] === serverId)?.[1] || serverId;
          setSelectedChannelName(`${channel.name} [${serverName}]`);
        }
      }
    } catch (error) {
      console.error("Error fetching channel info:", error);
    }
  };

  // Fetch models when dialog opens
  useEffect(() => {
    const fetchModels = async () => {
      if (!isOpen) return;

      try {
        setIsLoadingModels(true);
        setModelError(null);

        const response = await fetch("/api/model");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const modelsData = await response.json();
        if (Array.isArray(modelsData)) {
          setAvailableModels(modelsData);

          // If we have models and no current modelId is set, set the first one as default
          if (modelsData.length > 0 && !form.getValues("modelId")) {
            form.setValue("modelId", modelsData[0].id);
          }
        } else {
          console.error("Models data is not an array:", modelsData);
          setAvailableModels([]);
          setModelError("Dữ liệu mô hình không hợp lệ");
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setModelError("Không thể tải danh sách mô hình");
        setAvailableModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [isOpen, form]);

  // Set form values when editing or when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEdit && exercise) {
        // When editing an existing exercise
        form.reset({
          name: exercise.name,
          description: exercise.description || "",
          modelId: exercise.modelId,
          channelId: exercise.channel?.id || "",
          deadline: exercise.deadline
            ? isoToLocalDateTimeString(
                typeof exercise.deadline === "string"
                  ? exercise.deadline
                  : exercise.deadline.toISOString()
              )
            : "",
          isActive: exercise.isActive,
          questionCount: exercise.questionCount || 10,
          allowReferences: exercise.allowReferences || false,
          shuffleQuestions: exercise.shuffleQuestions || false,
        });

        // Set existing files
        setExistingFiles(exercise.files || []);

        // Set server ID and channel name for display
        setSelectedServerId(exercise.channel?.serverId);
        setSelectedChannelName(exercise.channel?.name || "");
      } else {
        // When creating a new exercise
        form.reset({
          name: "",
          description: "",
          modelId: "", // Don't set default here, let the model fetch effect handle it
          channelId: "",
          deadline: "",
          isActive: true,
          questionCount: 10,
          allowReferences: false,
          shuffleQuestions: false,
        });
        setExistingFiles([]);
        setSelectedServerId(undefined);
        setSelectedChannelName("");
      }

      // Clear uploaded files and errors when dialog opens
      setUploadedFiles([]);
      setSubmitError(null);
    }
  }, [isOpen, isEdit, exercise, form]);

  // Convert existing files to the format expected by FileUploader
  const getFormattedExistingFiles = () => {
    return existingFiles.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url.replace("http://localhost:3000/uploads/", "/uploads/"),
      size: 0,
      type: "",
      lastModified: Date.now(),
    }));
  };

  // Handle server selection in subject dialog
  const handleServerSelect = (serverId: string) => {
    // If we have a URL serverId that's different, don't allow changing
    if (urlServerId && urlServerId !== serverId) {
      toast({
        title: "Không thể thay đổi lớp học",
        description: "Lớp học đã được chỉ định bởi URL",
        variant: "destructive",
      });
      return;
    }

    setSelectedServerId(serverId);
    form.setValue("channelId", "");
    setSelectedChannelName("");
  };

  // Handle subject selection from dialog
  const handleSubjectSelect = (channelId: string, channelName: string) => {
    // If we have a URL channelId that's different, don't allow changing
    if (
      urlChannelId &&
      urlChannelId !== channelId &&
      urlServerId === selectedServerId
    ) {
      toast({
        title: "Không thể thay đổi môn học",
        description: "Môn học đã được chỉ định bởi URL",
        variant: "destructive",
      });
      return;
    }

    form.setValue("channelId", channelId);
    setSelectedChannelName(channelName);
    setIsSubjectDialogOpen(false);
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const formData = new FormData();

      // Add form data
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("modelId", values.modelId);
      formData.append("channelId", values.channelId || "");
      formData.append("deadline", values.deadline || "");
      formData.append("isActive", values.isActive ? "true" : "false");
      formData.append(
        "questionCount",
        values.questionCount?.toString() || "10"
      );
      formData.append(
        "allowReferences",
        values.allowReferences ? "true" : "false"
      );
      formData.append(
        "shuffleQuestions",
        values.shuffleQuestions ? "true" : "false"
      );

      // For edit mode, add the exercise ID
      if (isEdit && exercise?.id) {
        formData.append("exerciseId", exercise.id);
      }

      // Add files if any
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach((file) => {
          formData.append("files", file);
        });
      }

      // Determine the URL and method based on edit mode
      const url =
        isEdit && exercise?.id
          ? `/api/admin/exercise` // Use PUT method for updates
          : `/api/admin/exercise`; // Use POST method for creation

      const method = isEdit ? "PUT" : "POST";

      console.log(`Submitting ${method} request to:`, url);
      console.log("Form data:", Object.fromEntries(formData.entries()));

      const response = await fetch(url, {
        method,
        body: formData,
      });

      let errorMessage = isEdit
        ? "Không thể cập nhật bài tập"
        : "Không thể tạo bài tập";

      if (!response.ok) {
        // Try to get error message from response
        try {
          const responseData = await response.json();
          if (responseData.error) {
            errorMessage = responseData.error;
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          // If JSON parsing fails, use status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Exercise submission result:", result);

      // Show success message
      toast({
        title: isEdit ? "Cập nhật thành công" : "Tạo mới thành công",
        description: isEdit
          ? "Bài tập đã được cập nhật thành công"
          : "Bài tập mới đã được tạo thành công",
      });

      // Close dialog and refresh page
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Error submitting exercise:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi lưu bài tập";
      setSubmitError(errorMsg);

      toast({
        title: "Lỗi",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle closing the dialog properly
  const handleClose = () => {
    // Clean up state before closing
    setUploadedFiles([]);
    setSubmitError(null);

    // Delay the onClose callback slightly to allow React to process state updates
    setTimeout(() => {
      onClose();
    }, 0);
  };

  return (
    <>
      {/* Modified Dialog to better handle closing */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>
              {isEdit ? "Chỉnh sửa bài tập" : "Tạo bài tập mới"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Cập nhật thông tin bài tập."
                : "Điền thông tin để tạo bài tập mới."}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 flex-1 scrollbar-hide">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 py-4"
              >
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exercise-name">Tên bài tập</FormLabel>
                      <FormControl>
                        <Input
                          id="exercise-name"
                          placeholder="Nhập tên bài tập"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exercise-description">
                        Mô tả
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="exercise-description"
                          placeholder="Mô tả ngắn về bài tập (tùy chọn)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exercise-model">Mô hình AI</FormLabel>
                      <FormControl>
                        {isLoadingModels ? (
                          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Đang tải mô hình...
                          </div>
                        ) : modelError ? (
                          <div className="flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm items-center text-destructive">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {modelError}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.reload()}
                              className="ml-2"
                            >
                              Thử lại
                            </Button>
                          </div>
                        ) : (
                          <select
                            id="exercise-model"
                            value={field.value || ""}
                            onChange={(e) => {
                              console.log("Selected model:", e.target.value);
                              field.onChange(e.target.value);
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">-- Chọn mô hình AI --</option>
                            {availableModels.length === 0 ? (
                              <option value="" disabled>
                                Không tìm thấy mô hình
                              </option>
                            ) : (
                              availableModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))
                            )}
                          </select>
                        )}
                      </FormControl>
                      <FormMessage />
                      {availableModels.length === 0 &&
                        !isLoadingModels &&
                        !modelError && (
                          <FormDescription className="text-amber-600">
                            Không có mô hình nào được kích hoạt. Vui lòng liên
                            hệ quản trị viên.
                          </FormDescription>
                        )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exercise-channel">Môn học</FormLabel>
                      <FormControl>
                        <Button
                          id="exercise-channel"
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => setIsSubjectDialogOpen(true)}
                          disabled={!!(urlServerId && urlChannelId)}
                        >
                          {field.value
                            ? selectedChannelName || "Môn học đã chọn"
                            : selectedServerId && selectedServerId !== "all"
                            ? "Chọn môn học từ lớp này"
                            : "Chọn môn học"}
                          <Book className="h-4 w-4 ml-2 opacity-70" />
                        </Button>
                      </FormControl>
                      {urlServerId && urlChannelId && (
                        <FormDescription className="text-blue-600">
                          Môn học được chỉ định từ URL và không thể thay đổi
                        </FormDescription>
                      )}
                      {urlServerId && !urlChannelId && (
                        <FormDescription>
                          Chỉ được phép chọn môn học từ lớp đã chỉ định:{" "}
                          {servers.find((s) => s[0] === urlServerId)?.[1] ||
                            urlServerId}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exercise-deadline">Hạn nộp</FormLabel>
                      <FormControl>
                        <ClientOnly
                          fallback={
                            <div className="h-10 rounded-md border border-input bg-background"></div>
                          }
                        >
                          <Input
                            id="exercise-deadline"
                            type="datetime-local"
                            {...field}
                            className="w-full"
                          />
                        </ClientOnly>
                      </FormControl>
                      {field.value && (
                        <FormDescription>
                          Đã chọn:{" "}
                          {new Date(field.value).toLocaleString("vi-VN")}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="exercise-question-count">
                        Số câu hỏi
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="exercise-question-count"
                          type="number"
                          min="1"
                          max="100"
                          value={field.value || 10}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 10)
                          }
                          placeholder="Số câu hỏi cần trích xuất"
                          className="appearance-none"
                        />
                      </FormControl>
                      <FormDescription>
                        Số lượng câu hỏi sẽ được trích xuất từ tài liệu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowReferences"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel htmlFor="exercise-allow-references">
                          Tài liệu tham khảo
                        </FormLabel>
                        <FormDescription>
                          Cho phép sử dụng tài liệu tham khảo trong bài tập
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          id="exercise-allow-references"
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shuffleQuestions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel htmlFor="exercise-shuffle-questions">
                          Xáo trộn câu hỏi
                        </FormLabel>
                        <FormDescription>
                          Xáo trộn thứ tự câu hỏi khi học sinh làm bài
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          id="exercise-shuffle-questions"
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label htmlFor="exercise-files">Tài liệu</Label>
                  <div id="exercise-files">
                    <FileUploader
                      onFilesSelected={setUploadedFiles}
                      existingFiles={getFormattedExistingFiles()}
                      acceptedFileTypes=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                      maxFileSizeInMB={20}
                      maxFiles={5}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel htmlFor="exercise-is-active">
                          Trạng thái
                        </FormLabel>
                        <FormDescription>
                          Học sinh chỉ có thể làm bài tập đang được kích hoạt.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          id="exercise-is-active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="px-6 py-4 mt-2 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : isEdit ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseSubjectSelectionDialog
        open={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        selectedServerId={selectedServerId}
        onServerSelect={handleServerSelect}
        onSubjectSelect={handleSubjectSelect}
        currentExerciseChannelId={form.getValues("channelId")}
        currentServerId={selectedServerId}
        serverOptions={
          urlServerId ? servers.filter((s) => s[0] === urlServerId) : servers
        }
        serverChannels={serverChannels}
        serverSelectionDisabled={serverSelectionDisabled} // Pass this new prop
      />
    </>
  );
};
