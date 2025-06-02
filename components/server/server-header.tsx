"use client";

import { ServerWithMembersWithProfile } from "@/types";
import { MemberRole } from "@prisma/client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    ChevronDown,
    LogOut,
    PlusCircle,
    Settings,
    Trash,
    User,
    UserPlus,
    UserCheck
} from "lucide-react";
import { useModal } from "@/hooks/use-modal-store";

interface ServerHeaderProps {
    server: ServerWithMembersWithProfile;
    role?: MemberRole;
}

export const ServerHeader = ({
    server,
    role
}: ServerHeaderProps) => {
    const { onOpen } = useModal();
    const isAdmin = role === MemberRole.ADMIN;
    const isModerator = isAdmin || role === MemberRole.MODERATOR;
    // Đếm số pending members
    const pendingCount = server?.members?.filter(member => member.status === "PENDING").length || 0;

    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none" asChild>
                    <button className="w-full text-md font-semibold px-3 py-3 flex items-center h-12
                     dark:border-neutral-800 border-b-2 hover:bg-zinc-700/10
                     dark:hover:bg-zinc-700/50 transition">
                        {server.name}
                        <ChevronDown className="h-5 w-5 ml-auto" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-56 text-xs font-medium text-black
                    dark:text-neutral-400 space-y-[2px]"
                >
                    {isModerator && (
                        <DropdownMenuItem
                            onClick={() => onOpen("invite", { server })}
                            className="text-emerald-600 dark:text-emerald-600
                            px-3 py-2 text-sm cursor-pointer
                            hover:bg-emerald-500 dark:hover:bg-emerald-600
                            hover:text-white dark:hover:text-emerald-100 "
                        >
                            Mời người dùng
                            <UserPlus className="h-4 w-4 ml-auto" />
                        </DropdownMenuItem>
                    )}
                    {isAdmin && (
                        <DropdownMenuItem
                            onClick={() => onOpen("editServer", { server })}
                            className="px-3 py-2 text-sm cursor-pointer
                             dark:hover:bg-indigo-500 dark:hover:text-white 
                             hover:bg-indigo-500 hover:text-white"
                        >
                            Cài đặt
                            <Settings className="h-4 w-4 ml-auto" />
                        </DropdownMenuItem>
                    )}
                 
                    {isAdmin && (
                        <DropdownMenuItem
                            onClick={() => onOpen("members", { server })}
                            className="px-3 py-2 text-sm cursor-pointer
                             dark:hover:bg-indigo-500 dark:hover:text-white 
                             hover:bg-indigo-500 hover:text-white"
                        >
                            Quản lý thành viên
                            <User className="h-4 w-4 ml-auto" />
                        </DropdownMenuItem>
                    )}

                    {/* Thêm menu duyệt pending members */}
                    {(isAdmin || isModerator) && (
                        <DropdownMenuItem
                            onClick={() => onOpen("pendingMembers", { server })}
                            className="px-3 py-2 text-sm cursor-pointer
                             dark:hover:bg-yellow-500 dark:hover:text-white 
                             hover:bg-yellow-500 hover:text-white relative"
                        >
                            Duyệt thành viên
                            <UserCheck className="h-4 w-4 ml-auto" />
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </DropdownMenuItem>
                    )}

                    {isModerator && (
                        <DropdownMenuItem
                            onClick={() => onOpen("createChannel", { server })}
                            className="px-3 py-2 text-sm cursor-pointer
                             dark:hover:bg-indigo-500 dark:hover:text-white 
                             hover:bg-indigo-500 hover:text-white"
                        >
                            Tạo Kênh
                            <PlusCircle className="h-4 w-4 ml-auto" />
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {isAdmin && (
                        <DropdownMenuItem
                            onClick={() => onOpen("deleteServer", { server })}
                            className="text-rose-500 px-3 py-2 text-sm cursor-pointer
                            hover:bg-rose-500 hover:text-white
                            dark:hover:bg-rose-600 dark:hover:text-white"
                        >
                            Xóa kênh
                            <Trash className="h-4 w-4 ml-auto" />
                        </DropdownMenuItem>
                    )}
                    {!isAdmin && (
                        <DropdownMenuItem
                            onClick={() => onOpen("leaveServer", { server })}
                            className="text-rose-500 px-3 py-2 text-sm cursor-pointer
                            hover:bg-rose-500 hover:text-white
                            dark:hover:bg-rose-600 dark:hover:text-white"
                        >
                            Leave Server
                            <LogOut className="h-4 w-4 ml-auto" />
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}