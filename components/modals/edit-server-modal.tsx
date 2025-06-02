"use client";

import axios from "axios";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogFooter,
    DialogTitle
} from "@/components/ui/dialog"

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/file-upload";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/use-modal-store";
import { Globe, Lock } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(1, {
        message: "Tên lớp học không được để trống",
    }),
    imageUrl: z.string().min(1, {
        message: "Hình ảnh không được để trống",
    }),
    isPublic: z.boolean().default(true),
});

export const EditServerModal = () => {
    const { isOpen, onClose, type, data } = useModal();
    const router = useRouter();

    const isModalOpen = isOpen && type === "editServer";
    const { server } = data;

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            imageUrl: "",
            isPublic: true,
        }
    });

    useEffect(() => {
        if (server) {
            form.setValue("name", server.name);
            form.setValue("imageUrl", server.imageUrl);
            form.setValue("isPublic", server.isPublic);
        }
    }, [server, form]);

    const isLoading = form.formState.isSubmitting;
    const watchIsPublic = form.watch("isPublic");

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/servers/${server?.id}`, values);

            setTimeout(() => {
                onClose();
            }, 500);
            router.refresh();
        } catch (error) {
            console.error(error);
        }
    }

    const handleClose = () => {
        onClose();
    }

    return (
        <Dialog open={isModalOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-white text-black p-0 overflow-hidden">
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Chỉnh sửa lớp học
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-500">
                        Chỉnh sửa tên, hình ảnh và trạng thái cho lớp học.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-8 px-6">
                            <div className="flex items-center justify-center text-center">
                                <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <FileUpload
                                                    endpoint="serverImage"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="uppercase text-xs font-bold text-zinc-500
                                        dark:text-secondary/70">
                                            Tên lớp học
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={isLoading}
                                                className="bg-zinc-300/50 border-0
                                                focus-visible:ring-0 text-black
                                                focus-visible:ring-offset-0"
                                                placeholder="Nhập tên lớp học"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Thêm trường chỉnh sửa trạng thái public/private */}
                            <FormField
                                control={form.control}
                                name="isPublic"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base flex items-center gap-x-2">
                                                {field.value ? (
                                                    <>
                                                        <Globe className="h-4 w-4 text-green-600" />
                                                        Lớp học công khai
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="h-4 w-4 text-orange-600" />
                                                        Lớp học riêng tư
                                                    </>
                                                )}
                                            </FormLabel>
                                            <FormDescription>
                                                {field.value 
                                                    ? "Mọi người có thể tham gia lớp học ngay lập tức thông qua link mời"
                                                    : "Cần phê duyệt từ admin/moderator trước khi tham gia lớp học"
                                                }
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Hiển thị cảnh báo khi chuyển từ public sang private */}
                            {!watchIsPublic && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Lock className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                                        <div>
                                            <h4 className="text-sm font-medium text-orange-800">
                                                Lưu ý khi chuyển sang chế độ riêng tư
                                            </h4>
                                            <p className="text-sm text-orange-700 mt-1">
                                                Các thành viên mới sẽ cần được phê duyệt trước khi tham gia. 
                                                Thành viên hiện tại không bị ảnh hưởng.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="bg-gray-100 px-6 py-4">
                            <Button variant="green" disabled={isLoading}>
                                {isLoading ? "Đang lưu..." : "Lưu"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};