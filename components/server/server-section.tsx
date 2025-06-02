"use client";

import { ChannelType, MemberRole } from "@prisma/client";
import { BotMessageSquare, Plus, Settings } from "lucide-react";

import { ServerWithMembersWithProfile } from "@/types";
import { ActionTooltip } from "../action-tooltip";
import { useModal } from "@/hooks/use-modal-store";


interface ServerSectionProps {
    label: string,
    role?: MemberRole,
    sectionType: "channels" | "members" | "agents", // Add "agents" type
    channelType?: ChannelType,
    server?: ServerWithMembersWithProfile;
};

export const ServerSection = ({
    label,
    role,
    sectionType,
    channelType,
    server,
}: ServerSectionProps) => {
    const { onOpen } = useModal();

    return (
        <div className="flex items-center justify-between py-2">
            <p className="text-sm uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            {role !== MemberRole.GUEST && sectionType === "channels" && (
                <ActionTooltip label="Tạo kênh" side="top">
                    <button
                        onClick={() => onOpen("createChannel", { channelType })}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </ActionTooltip>
            )}
            {role === MemberRole.ADMIN && sectionType === "members" && (
                <ActionTooltip label="Quản lý thành viên" side="top">
                    <button
                        onClick={() => onOpen("members", { server })}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </ActionTooltip>
            )}
            {role === MemberRole.ADMIN && sectionType === "agents" && (
                <ActionTooltip label="Thêm trợ lý AI" side="top">
                    <button
                        onClick={() => onOpen("addAgent", { server })}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </ActionTooltip>
            )}
        </div>
    );
};