import { Metadata } from "next";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building, Layers, MessageSquare } from "lucide-react";
import AdminExerciseSidebar from "@/components/admin/exercises/admin-exercise-sidebar";
import { AdminExerciseSearch } from "@/components/admin/exercises/admin-exercise-search";
import ExerciseManagementClient from "@/components/admin/exercises/exercise-management-client";

export const metadata: Metadata = {
    title: "Quản lý bài tập - Hệ thống học tập",
    description: "Quản lý bài tập",
};

interface ExercisesPageProps {
  searchParams: Promise<{
    channelId?: string;
    serverId?: string;
    view?: string;
  }>;
}

export default async function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
    const profile = await currentProfile();

    if (!profile) {
        return redirect("/");
    }

    // Check if user is admin
    if (profile.role !== "ADMIN") {
        return redirect("/");
    }

    const { channelId, serverId, view } = await searchParams;
    
    // Get all servers
    const servers = await db.server.findMany({
        include: {
            channels: {
                where: {
                    exercises: {
                        some: {},
                    },
                },
                include: {
                    exercises: true,
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });

    // Filter to servers that have channels with exercises
    const serversWithExercises = servers.filter(server => server.channels.length > 0);

    // Determine if we're viewing all exercises
    const isViewingAll = view === "all" || (!serverId && !channelId);

    // Determine the current server
    let currentServer = null;
    let currentServerId: string | "all" = "all";
    let channels: any[] = [];

    if (!isViewingAll && serverId) {
        currentServer = serversWithExercises.find(server => server.id === serverId);
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

    // Define interfaces for type safety
    interface ExerciseFile {
        id: string;
        url: string;
        name: string;
    }

    interface ExerciseModel {
        id: string;
        name: string;
    }

    interface ExerciseField {
        id: string;
        name: string;
        description?: string | null;
    }

    interface ExerciseServer {
        id: string;
        name: string;
    }

    interface ExerciseChannel {
        id: string;
        name: string;
        server: ExerciseServer;
    }

    interface Exercise {
        id: string;
        name: string;
        description?: string | null;
        channelId: string | null;
        model: ExerciseModel;
        field: ExerciseField | null;
        channel: ExerciseChannel | null;
        files: ExerciseFile[];
        createdAt: Date;
        deadline?: Date | null;
        isActive: boolean;
    }

    // Fetch models and fields data
    const [models, fields] = await Promise.all([
        db.model.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        }),
        db.field.findMany({
            orderBy: { name: "asc" },
        }),
    ]);

    let filteredExercises: Exercise[] = [];
    
    if (isViewingAll) {
        // Get all exercises
        filteredExercises = await db.exercise.findMany({
            include: {
                model: true,
                field: true,
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
        // Get exercises for selected channel
        filteredExercises = await db.exercise.findMany({
            where: {
                channelId: selectedChannel.id,
            },
            include: {
                model: true,
                field: true,
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
        // Get exercises for all channels in the current server
        filteredExercises = await db.exercise.findMany({
            where: {
                channel: {
                    serverId: currentServer.id,
                },
            },
            include: {
                model: true,
                field: true,
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
                name: "Tất cả bài tập",
                icon: <Layers className="h-4 w-4" />,
            }],
        },
        {
            label: "Lớp học",
            type: "server" as const,
            data: serversWithExercises.map(server => ({
                id: server.id,
                name: server.name,
                icon: <Building className="h-4 w-4" />,
            })),
        },
        {
            label: "Môn học ",
            type: "channel" as const,
            data: serversWithExercises.flatMap(server => 
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
    let pageTitle = "Tất cả bài tập";
    if (selectedChannel) {
        pageTitle = `Bài tập - ${selectedChannel.name} (${currentServer?.name})`;
    } else if (currentServer) {
        pageTitle = `Bài tập - ${currentServer.name}`;
    }

    return (
        <div className="flex h-full">
            {/* Sidebar with server and channel list */}
            <div className="hidden md:flex h-full w-60 flex-col border-r">
                <div className="p-3 font-semibold text-xl border-b">
                    Quản lý bài tập
                </div>
                <div className="px-2 py-2">
                    <AdminExerciseSearch data={searchData} />
                </div>
                <ScrollArea className="flex-1">
                    <AdminExerciseSidebar 
                        servers={serversWithExercises}
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
                    
                    <ExerciseManagementClient 
                        exercises={filteredExercises}
                        models={models}
                        fields={fields}
                        servers={serversWithExercises.map(server => [server.id, server.name] as [string, string])}
                        serverChannels={serversWithExercises.reduce((acc, server) => {
                            acc[server.id] = server.channels.map(channel => ({
                                id: channel.id,
                                name: channel.name,
                                type: 'TEXT'
                            }));
                            return acc;
                        }, {} as Record<string, { id: string; name: string; type: string }[]>)}
                        currentServerId={currentServerId}
                        currentChannelId={selectedChannelId}
                    />
                </div>
            </div>
        </div>
    );
}
