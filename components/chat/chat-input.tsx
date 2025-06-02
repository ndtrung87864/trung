"use client";

import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SendHorizonal, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
    Form,
    FormControl,
    FormField,
    FormItem
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { EmojiPicker } from "@/components/emoji-picker";
import { useProfanityFilter } from "@/hooks/use-profanity-filter";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatInputProps {
    apiUrl: string;
    query: Record<string, string | number | boolean | null | undefined>;
    name: string;
    type: "conversation" | "channel";
    serverId?: string;
}

const formSchema = z.object({
    content: z.string().min(1),
});

export const ChatInput: React.FC<ChatInputProps> = ({
    apiUrl,
    query,
    name,
    type,
    serverId
}) => {
    const { onOpen } = useModal();
    const router = useRouter();
    const [warningMessage, setWarningMessage] = useState<string>("");
    const [showWarning, setShowWarning] = useState(false);
    const { filterText, isFiltering, error } = useProfanityFilter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content: "",
        }
    });

    const clearWarning = () => {
        setShowWarning(false);
        setWarningMessage("");
    };

    const showViolationWarning = (message: string) => {
        setWarningMessage(message);
        setShowWarning(true);
        // Tự động ẩn warning sau 5 giây
        setTimeout(() => {
            clearWarning();
        }, 5000);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            clearWarning();

            // Sử dụng hook để filter
            const result = await filterText(
                values.content,
                type === "conversation" ? "DIRECT" : "CHAT",
                type === "conversation" ? query.conversationId as string : query.channelId as string,
                serverId
            );

            // Hiển thị cảnh báo nếu có vi phạm
            if (result.hasViolation) {
                showViolationWarning(
                    "Tin nhắn của bạn chứa từ ngữ không phù hợp và đã được điều chỉnh."
                );
            }

            const url = qs.stringifyUrl({
                url: apiUrl,
                query,
            });

            // Gửi nội dung đã được lọc
            await axios.post(url, { content: result.cleanText });
            form.reset();
            router.refresh();
            
        } catch (error) {
            console.error("Error sending message:", error);
            showViolationWarning("Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.");
        }
    };

    const isLoading = form.formState.isSubmitting || isFiltering;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div className="relative p-4 pb-6 flex flex-col">
                                    {/* Hiển thị warning khi có vi phạm */}
                                    {showWarning && (
                                        <Alert className="mb-3 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                                                {warningMessage}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Hiển thị error từ API */}
                                    {error && (
                                        <Alert variant="destructive" className="mb-3">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                                {error}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    <div className="relative flex">
                                        <button
                                            type="button"
                                            onClick={() => onOpen("messageFile", { apiUrl, query })}
                                            className="absolute top-3 left-4 h-[24px] w-[24px] 
                                            bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600
                                            dark:hover:bg-zinc-300 rounded-full transition p-1 
                                            flex items-center justify-center z-10"
                                            disabled={isLoading}
                                        >
                                            <Plus className="text-white dark:text-[#313338]" />
                                        </button>
                                        
                                        <Input
                                            disabled={isLoading}
                                            className="px-14 py-6 bg-zinc-100 dark:bg-zinc-700/75 border-none border-0 
                                                     focus-visible:ring-0 focus-visible:ring-offset-0  
                                                     text-zinc-600 dark:text-zinc-200 rounded-full"
                                            placeholder={`Message ${type === "conversation" ? name : "#" + name}`}
                                            {...field}
                                        />
                                        
                                        <div className="absolute flex items-center justify-center right-20 top-3">
                                            <EmojiPicker
                                                onChange={(emoji: string) => field.onChange(`${field.value}${emoji}`)}
                                            />
                                        </div>
                                        
                                        <div className="ml-1">
                                            <button
                                                type="submit"
                                                disabled={isLoading || !field.value.trim()}
                                                className="w-[48px] h-[48px] bg-indigo-500 dark:bg-indigo-500 
                                                         hover:bg-indigo-600 dark:hover:bg-indigo-600 
                                                         disabled:opacity-50 disabled:cursor-not-allowed
                                                         rounded-full transition p-1 flex items-center justify-center"
                                            >
                                                <SendHorizonal className="text-white w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Loading indicator */}
                                    {/* {isFiltering && (
                                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Đang kiểm tra nội dung...
                                        </div>
                                    )} */}
                                </div>
                            </FormControl>
                        </FormItem>
                    )}>
                </FormField>
            </form>
        </Form>
    );
};