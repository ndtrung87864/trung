import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { NavigatorAction } from "./navigation-action";
import { NavigationItem } from "./navigation-item";
import {
    BookOpenCheck,
    BookPlus,
    BotMessageSquare,
    Users,
    GraduationCap,
    HomeIcon,
    ServerIcon,
    ClipboardCheck, // ✅ Thêm icon cho quản lý điểm
    Brain, // Thêm icon Brain cho System Master AI
    Shield
} from "lucide-react";
import { ActionTooltip } from "../action-tooltip";
import Link from "next/link";
import { UserRole } from "@prisma/client";

export const NavigationSidebar = async () => {
    const profile = await currentProfile();
    const isAdmin = profile?.role === UserRole.ADMIN;

    if (!profile) {
        return redirect("/");
    }

    const servers = await db.server.findMany({
        where: {
            members: {
                some: {
                    profileId: profile.id
                }
            }
        }
    });

    return (
        <div className="space-y-2 flex flex-col items-center h-screen w-full 
                    dark:bg-[#1E1F22] bg-[#E3E5E8] py-3 shadow-md">
            {/* Dashboard icon at the top */}
            <ActionTooltip side="right" align="center" label="Trang chủ">
                <Link href="/" className="group flex mb-2">
                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                          bg-primary/10 dark:bg-primary/20 group-hover:rounded-xl 
                          transition-all duration-300 group-hover:bg-primary/20 dark:group-hover:bg-primary/30">
                        <HomeIcon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition" />
                    </div>
                </Link>
            </ActionTooltip>

            <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />

            {isAdmin && (
                <>
                    <NavigatorAction />
                    <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
                </>
            )}

            {/* Server list */}
            <div className="text-xs text-center font-semibold text-zinc-500 dark:text-zinc-400 mb-2 mt-2">
                Lớp học
            </div>
            <ScrollArea className="flex-1 w-full">
                {servers.map((server) => (
                    <div key={server.id} className="mb-2">
                        <NavigationItem
                            id={server.id}
                            name={server.name}
                            imageUrl={server.imageUrl}
                        />
                    </div>
                ))}
                {servers.length === 0 && (
                    <div className="flex flex-col items-center py-4 text-zinc-500 dark:text-zinc-400 text-xs">
                        <ServerIcon className="h-8 w-8 mb-1 text-zinc-400" />
                        Không có lớp học nào
                    </div>
                )}
            </ScrollArea>

            {/* Admin tools */}
            {isAdmin && (
                <div className="w-full">
                    <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto mb-2" />

                    <div className="text-xs text-center font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        Quản lý
                    </div>

                    <ScrollArea className="h-[208px] w-full">
                        <div className="flex flex-col items-center gap-y-2 px-1">
                            <ActionTooltip side="right" align="center" label="Trợ lý kiểm tra">
                                <Link href="/admin/exams" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-blue-500/10 dark:bg-blue-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-blue-500/20 
                                    dark:group-hover:bg-blue-500/30">
                                        <BookOpenCheck className="h-5 w-5 text-blue-500 group-hover:text-blue-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>

                            <ActionTooltip side="right" align="center" label="Trợ lý bài tập">
                                <Link href="/admin/exercises" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-purple-500/10 dark:bg-purple-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-purple-500/20 
                                    dark:group-hover:bg-purple-500/30">
                                        <BookPlus className="h-5 w-5 text-purple-500 group-hover:text-purple-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>

                            <ActionTooltip side="right" align="center" label="Trợ lý lớp học">
                                <Link href="/admin/agents" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-amber-500/10 dark:bg-amber-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-amber-500/20 
                                    dark:group-hover:bg-amber-500/30">
                                        <BotMessageSquare className="h-5 w-5 text-amber-500 group-hover:text-amber-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>

                            {/* ✅ Thêm Quản lý điểm */}
                            <ActionTooltip side="right" align="center" label="Quản lý điểm">
                                <Link href="/admin/grades" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-indigo-500/10 dark:bg-indigo-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-indigo-500/20 
                                    dark:group-hover:bg-indigo-500/30">
                                        <ClipboardCheck className="h-5 w-5 text-indigo-500 group-hover:text-indigo-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>

                            <ActionTooltip side="right" align="center" label="Quản lý lớp học">
                                <Link href="/admin/classrooms" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-green-500/10 dark:bg-green-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-green-500/20 
                                    dark:group-hover:bg-green-500/30">
                                        <GraduationCap className="h-5 w-5 text-green-500 group-hover:text-green-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>

                            <ActionTooltip side="right" align="center" label="Quản lý người dùng">
                                <Link href="/admin/users" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-red-500/10 dark:bg-red-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-red-500/20 
                                    dark:group-hover:bg-red-500/30">
                                        <Users className="h-5 w-5 text-red-500 group-hover:text-red-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>

                            {/* Thêm Quản lý từ cấm */}
                            <ActionTooltip side="right" align="center" label="Quản lý từ cấm">
                                <Link href="/admin/profanity" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                    bg-orange-500/10 dark:bg-orange-500/20 group-hover:rounded-xl
                                    transition-all duration-300 group-hover:bg-orange-500/20 
                                    dark:group-hover:bg-orange-500/30">
                                        <Shield className="h-5 w-5 text-orange-500 group-hover:text-orange-600 transition" />
                                    </div>
                                </Link>
                            </ActionTooltip>
                        </div>
                    </ScrollArea>

                    {/* System Control - Chỉ hiển thị cho admin */}
                    <div className="w-full">
                        <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto mb-2" />

                        <div className="text-xs text-center font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                            System Control
                        </div>

                        <div className="flex flex-col items-center gap-y-2">
                            <ActionTooltip side="right" align="center" label="System Master AI">
                                <Link href="/system-master" className="group flex">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl 
                                        bg-gradient-to-br from-purple-500/10 to-blue-500/20 
                                        group-hover:rounded-xl transition-all duration-200
                                        group-hover:bg-gradient-to-br group-hover:from-purple-500/20 group-hover:to-blue-500/30">
                                        <Brain className="h-5 w-5 text-purple-500 group-hover:text-purple-400 transition-colors" />
                                    </div>
                                </Link>
                            </ActionTooltip>
                        </div>
                    </div>
                </div>
            )}

            {/* User controls */} 
            <div className="pb-3 mt-auto flex flex-col items-center gap-y-4">
                <ModeToggle />
                <div className="rounded-full p-1 bg-zinc-200 dark:bg-zinc-800 transition hover:bg-zinc-300 dark:hover:bg-zinc-700">
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "h-[40px] w-[40px]"
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};