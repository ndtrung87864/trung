import { Metadata } from "next";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building, Layers, MessageSquare } from "lucide-react";

import AdminExamSidebar from "@/components/admin/exams/admin-exam-sidebar";
import { AdminExamSearch } from "@/components/admin/exams/admin-exam-search";
import ExamManagementClient from "@/components/admin/exams/exam-management-client";

export const metadata: Metadata = {
    title: "Quản lý bài kiểm tra - Hệ thống học tập",
    description: "Quản lý bài kiểm tra",
};

interface ExamsPageProps {
  searchParams: Promise<{
    channelId?: string;
    serverId?: string;
    view?: string;
  }>;
}

export default async function ExamsPage({
  searchParams,
}: ExamsPageProps) {
    const profile = await currentProfile();

    if (!profile) {
        return redirect("/");
    }

    // Check if user is admin
    if (profile.role !== "ADMIN") {
        return redirect("/");
    }

    // Fixed: Access searchParams directly without awaiting

    const { channelId, serverId, view } = await searchParams;

    // // Convert searchParams to regular strings
    // const channelIdParam = typeof searchParams.channelId === 'string' ? searchParams.channelId : undefined;
    // const serverIdParam = typeof searchParams.serverId === 'string' ? searchParams.serverId : undefined;
    // const viewParam = typeof searchParams.view === 'string' ? searchParams.view : undefined;
    
    // Get all servers
    const servers = await db.server.findMany({
        include: {
            channels: {
                where: {
                    exams: {
                        some: {},
                    },
                },
                include: {
                    exams: true,
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });

    // Filter to servers that have channels with exams
    const serversWithExams = servers.filter(server => server.channels.length > 0);

    // Determine if we're viewing all exams
    const isViewingAll = view === "all" || (!serverId && !channelId);

    // Determine the current server
    let currentServer = null;
    let currentServerId: string | "all" = "all";
    let channels: any[] = [];

    if (!isViewingAll && serverId) {
        currentServer = serversWithExams.find(server => server.id === serverId);
        if (currentServer) {
            currentServerId = currentServer.id;
            channels = currentServer.channels;
        } else {
            currentServerId = "all";
        }
    }

    // Determine selected channel
    let selectedChannel = null;
    let selectedChannelId: string | "all" | null = isViewingAll ? "all" : null;
    
    if (!isViewingAll && channelId && channels.length > 0) {
        selectedChannel = channels.find(channel => channel.id === channelId);
        if (selectedChannel) {
            selectedChannelId = selectedChannel.id;
        }
    }

    // Get exams based on filters
    // Define interfaces for type safety
    interface ExamFile {
        id: string;
        url: string;
        name: string;
    }

    interface ExamModel {
        id: string;
        name: string;
    }

    interface ExamServer {
        id: string;
        name: string;
    }

    interface ExamChannel {
        id: string;
        name: string;
        server: ExamServer;
    }

    interface Exam {
        id: string;
        name: string;
        channelId: string | null;
        model: ExamModel;
        channel: ExamChannel | null;
        files: ExamFile[];
        createdAt: Date;
    }

    let filteredExams: Exam[] = [];
    
    if (isViewingAll) {
        // Get all exams
        filteredExams = await db.exam.findMany({
            include: {
                model: true,
                channel: {
                    include: {
                        server: true,
                    },
                },
                files: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    } else if (selectedChannel) {
        // Get exams for selected channel
        filteredExams = await db.exam.findMany({
            where: {
                channelId: selectedChannel.id,
            },
            include: {
                model: true,
                channel: {
                    include: {
                        server: true,
                    },
                },
                files: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    } else if (currentServer) {
        // Get exams for all channels in the current server
        filteredExams = await db.exam.findMany({
            where: {
                channel: {
                    serverId: currentServer.id,
                },
            },
            include: {
                model: true,
                channel: {
                    include: {
                        server: true,
                    },
                },
                files: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    // Prepare search data
    const searchData = [
        {
            label: "Tất cả",
            type: "all" as const,
            data: [{
                id: "all",
                name: "Tất cả bài kiểm tra",
                icon: <Layers className="h-4 w-4" />,
            }],
        },
        {
            label: "Lớp học",
            type: "server" as const,
            data: serversWithExams.map(server => ({
                id: server.id,
                name: server.name,
                icon: <Building className="h-4 w-4" />,
            })),
        },
        {
            label: "Môn học ",
            type: "channel" as const,
            data: serversWithExams.flatMap(server => 
                server.channels.map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    icon: <MessageSquare className="h-4 w-4" />,
                    serverId: server.id,
                    serverName: server.name,
                }))
            ),
        },
    ];

    // Get the title based on current view
    let pageTitle = "Tất cả bài kiểm tra";
    if (selectedChannel) {
        pageTitle = `Bài kiểm tra - ${selectedChannel.name} (${currentServer?.name})`;
    } else if (currentServer) {
        pageTitle = `Bài kiểm tra - ${currentServer.name}`;
    }

    return (
        <div className="flex h-full">
            {/* Sidebar with server and channel list */}
            <div className="hidden md:flex h-full w-60 flex-col border-r">
                <div className="p-3 font-semibold text-xl border-b">
                    Quản lý bài kiểm tra
                </div>
                <div className="px-2 py-2">
                    <AdminExamSearch data={searchData} />
                </div>
                <ScrollArea className="flex-1">
                    <AdminExamSidebar 
                        servers={serversWithExams}
                        currentServerId={currentServerId}
                        channels={channels}
                        selectedChannelId={selectedChannelId}
                    />
                </ScrollArea>
            </div>
            
            {/* Main content area */}
            <div className="flex-1 h-full overflow-hidden">
                <div className="p-6 h-full overflow-y-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">{pageTitle}</h1>
                    </div>
                    
                    {/* Sử dụng Client Component wrapper thay vì dynamic import trực tiếp */}
                    <ExamManagementClient 
                        exams={filteredExams}
                        currentServerId={currentServerId}
                        currentChannelId={selectedChannelId}
                    />
                </div>
            </div>
        </div>
    );
}
