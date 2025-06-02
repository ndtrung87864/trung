"use client";

import { cn } from "@/lib/utils";
import {
    Channel,
    ChannelType,
    MemberRole,
    Server
} from "@prisma/client";
import { Book, BotMessageSquare, Edit, Hash, Lock, Mic, Trash, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ActionTooltip } from "@/components/action-tooltip";
import { ModalType, useModal } from "@/hooks/use-modal-store";
import { Badge } from "@/components/ui/badge";

interface ServerChannelProps {
    channel: Channel;
    server: Server;
    role?: MemberRole;
    agents?: Array<{
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
    }>;
}

const iconMap = {
    [ChannelType.TEXT]: Book,
    [ChannelType.AUDIO]: Mic,
    [ChannelType.VIDEO]: Video,
}

export const SeverChannel = ({
    channel,
    server,
    role,
    agents = []
}: ServerChannelProps) => {
    const params = useParams();
    const router = useRouter();
    
    const { onOpen } = useModal();

    const onClick = () => {
        router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
    }

    const onAction = (e: React.MouseEvent, action:ModalType) => {
        e.stopPropagation();
        onOpen(action, { server, channel });
    }

    // Find the agent associated with this channel, if any
    const linkedAgent = channel.fieldId 
        ? agents.find(a => a.field.id === channel.fieldId)?.field 
        : null;

    const Icon = iconMap[channel.type];
    
    return (
        <button
            onClick={onClick}
            className={cn(
                "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-neutral-700/50 transition mb-1",
                params?.channelId === channel.id && "bg-zinc-700/20 dark:bg-zinc-700"
            )}
        >
            <Icon className="flex-shrink-0 w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <div className="flex-1 flex flex-col items-start">
                <p className={cn(
                    "text-start line-clamp-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition",
                    params?.channelId === channel.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white"
                )}>
                    {channel.name}
                </p>
                {/* Show linked agent if present */}
                {linkedAgent && (
                    <div className="flex items-center gap-1">
                        <BotMessageSquare className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {linkedAgent.name}
                        </span>
                    </div>
                )}
            </div>
            {channel.name !== "general" && role !== MemberRole.GUEST && (
                <div className="ml-auto flex items-center gap-x-2">
                    <ActionTooltip label="Sửa">
                        <Edit 
                        onClick={(e) => onAction(e,"editChannel")}
                        className="hidden group-hover:block w-4 h-4 text-zinc-500
                        hover:text-zinc-600 dark:text-zinc-400
                        dark:hover:text-zinc-300 transition" />
                    </ActionTooltip>
                    <ActionTooltip label="Xóa">
                        <Trash 
                        onClick={(e) => onAction(e,"deleteChannel")}
                        className="hidden group-hover:block w-4 h-4 text-zinc-500
                        hover:text-zinc-600 dark:text-zinc-400
                        dark:hover:text-zinc-300 transition" />
                    </ActionTooltip>
                </div>
            )}
            {channel.name === "general" && (
                <Lock className="ml-auto w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            )}
        </button>
    );
};