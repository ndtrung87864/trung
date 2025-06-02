"use client";

import { MemberRole, Server } from "@prisma/client";
import { BotMessageSquare, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ServerAgentProps {
    serverField: {
        id: string;
        fieldId: string;
        field: {
            id: string;
            name: string;
            model: {
                id: string;
                name: string;
            };
        };
    };
    server: Server;
    role?: MemberRole;
}

export const ServerAgent = ({
    serverField,
    server,
    role
}: ServerAgentProps) => {
    const router = useRouter();
    const { onOpen } = useModal();
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Navigate to agent chat page
    const onClick = () => {
        router.push(`/servers/${server.id}/agents/${serverField.fieldId}`);
    };
    
    // Remove agent from server
    const onRemoveAgent = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (isDeleting) return;
        
        try {
            setIsDeleting(true);
            
            // Call API to remove agent from server
            await axios.delete(`/api/admin/classroom/${server.id}/agents`, {
                data: { serverFieldId: serverField.id }
            });
            
            toast({
                title: "Trợ lý đã được xóa",
                description: "Trợ lý AI đã được xóa khỏi lớp học này.",
                variant: "success"
            });
            
            // Refresh the page to update the sidebar
            router.refresh();
        } catch (error) {
            console.error("Failed to remove agent:", error);
            toast({
                title: "Lỗi",
                description: "Không thể xóa trợ lý. Vui lòng thử lại.",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <button
            onClick={onClick}
            className="group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-neutral-700/50 transition mb-1"
        >
            <BotMessageSquare className="flex-shrink-0 w-5 h-5 text-emerald-500" />
            <div className="flex-1 flex flex-col items-start">
                <p className="line-clamp-1 text-sm font-semibold text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition">
                    {serverField.field.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {serverField.field.model.name}
                </p>
            </div>
            {role !== MemberRole.GUEST && (
                <div className="ml-auto flex items-center gap-x-2">
                    <ActionTooltip label="Xóa trợ lý">
                        <Trash 
                            onClick={onRemoveAgent}
                            className={cn(
                                "hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition",
                                isDeleting && "animate-spin"
                            )}
                        />
                    </ActionTooltip>
                </div>
            )}
        </button>
    );
};