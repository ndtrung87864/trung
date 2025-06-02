import { ChannelType, MemberRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Book, BookOpen, BotMessageSquare, ChevronRight, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { ServerHeader } from "./server-header";
import { ServerSearch } from "./server-search";
import { ServerSection } from "./server-section";
import { SeverChannel } from "./server-channel";
import { ServerMember } from "./server-member";
import { ServerAgent } from "./server-agent";
import Link from "next/link";
import { Button } from "../ui/button";

interface ServerSidebarProps {
    serverId: string
}

const iconMap = {
    [ChannelType.TEXT]: <Book className="mr-2 h-4 w-4" />,
    [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
    [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />,
};

const roleIconMap = {
    [MemberRole.GUEST]: <ChevronRight className="mr-2 h-4 w-4 text-gray-500" />,
    [MemberRole.MODERATOR]: <ShieldCheck className="mr-2 h-4 w-4 text-indigo-500" />,
    [MemberRole.ADMIN]: <ShieldAlert className="mr-2 h-4 w-4 text-rose-500" />,
};

export const ServerSidebar = async ({
    serverId
}: ServerSidebarProps) => {
    const profileId = await currentProfile();

    if (!profileId) {
        return redirect("/");
    }

    const server = await db.server.findUnique({
        where: {
            id: serverId,
        },
        include: {
            channels: {
                orderBy: {
                    createdAt: "asc",
                },
            },
            members: {
              
                include: {
                    profile: true,
                },
                orderBy: {
                    role: "asc",
                }
            },
            // Include the ServerField join table with Field details
            fields: {
                include: {
                    field: {
                        include: {
                            model: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "asc"
                }
            }
        }
    });

    const textChannels = server?.channels.filter((channel) => channel.type === ChannelType.TEXT);
    const audioChannels = server?.channels.filter((channel) => channel.type === ChannelType.AUDIO);
    const videoChannels = server?.channels.filter((channel) => channel.type === ChannelType.VIDEO);
    const members = server?.members.filter((member) => member.profileId !== profileId.id && member.status === "ACTIVE");
    // Extract the AI agents (fields) for this server
    const agents = server?.fields || [];

    if (!server) {
        return redirect("/");
    }

    const role = server.members.find((member) => member.profileId === profileId.id)?.role;

    return (
        <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]">
            <ServerHeader
                server={server}
                role={role}
            />
            <ScrollArea className="flex-1 px-3">
                <div className="mt-2">
                    <ServerSearch
                        data={[
                            {
                                label: "Kênh nhắn tin",
                                type: "channel",
                                data: textChannels?.map((channel) => ({
                                    id: channel.id,
                                    name: channel.name,
                                    icon: iconMap[channel.type],
                                })),
                            },
                            {
                                label: "Kênh thoại",
                                type: "channel",
                                data: audioChannels?.map((channel) => ({
                                    id: channel.id,
                                    name: channel.name,
                                    icon: iconMap[channel.type],
                                })),
                            },
                            {
                                label: "Kênh video",
                                type: "channel",
                                data: videoChannels?.map((channel) => ({
                                    id: channel.id,
                                    name: channel.name,
                                    icon: iconMap[channel.type],
                                })),
                            },
                            {
                                label: "Thành viên",
                                type: "member",
                                data: members?.map((member) => ({
                                    id: member.id,
                                    name: member.profile.name,
                                    icon: roleIconMap[member.role],
                                })),
                            },
                            {
                                label: "Trợ lý AI",
                                type: "agent",
                                data: agents?.map((serverField) => ({
                                    id: serverField.field.id,
                                    name: serverField.field.name,
                                    icon: <BotMessageSquare className="mr-2 h-4 w-4" />,
                                    // Pass additional data
                                    serverFieldId: serverField.id,
                                    modelName: serverField.field.model.name
                                })),
                            }
                        ]}
                    />
                </div>
                <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
                
                {/* Display AI Agents section */}
                {!!agents.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="agents"
                            role={role}
                            label="Trợ lý AI"
                            server={server}
                        />
                        <div className="space-y-[2px]">
                            {agents.map((serverField) => (
                                <ServerAgent
                                    key={serverField.id}
                                    serverField={serverField}
                                    server={server}
                                    role={role}
                                />
                            ))}
                        </div>
                    </div>
                )}
  
                
                {!!textChannels?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="channels"
                            channelType={ChannelType.TEXT}
                            role={role}
                            label="Kênh nhắn tin"
                        />
                        <div className="space-y-[2px]">
                            {textChannels.map((channel) => (
                                <SeverChannel
                                    key={channel.id}
                                    channel={channel}
                                    role={role}
                                    server={server}
                                    agents={agents}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Rest of the code remains the same */}
                {!!audioChannels?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="channels"
                            channelType={ChannelType.AUDIO}
                            role={role}
                            label="Kênh thoại"
                        />
                        <div className="space-y-[2px]">
                            {audioChannels.map((channel) => (
                                <SeverChannel
                                    key={channel.id}
                                    channel={channel}
                                    role={role}
                                    server={server}
                                    agents={agents}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {!!videoChannels?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="channels"
                            channelType={ChannelType.VIDEO}
                            role={role}
                            label="Kênh video"
                        />
                        <div className="space-y-[2px]">
                            {videoChannels.map((channel) => (
                                <SeverChannel
                                    key={channel.id}
                                    channel={channel}
                                    role={role}
                                    server={server}
                                    agents={agents}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
                <div className="text-sm uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                    Bài tập & Kiểm tra
                </div>
                <div className="text-sm uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                    <Link href={`/servers/${serverId}/exercises`}>
                        <Button className="w-full mt-2" variant="outline">
                            Bài tập
                        </Button>
                    </Link>
                    <Link href={`/servers/${serverId}/exams`}>

                        <Button className="w-full mt-2" variant="outline">
                            Bài kiểm tra
                        </Button>
                    </Link>
                </div>
                {!!members?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="members"
                            role={role}
                            label="Thành viên"
                            server={server}
                        />
                        <div className="space-y-[2px]">
                            {members.map((member) => (
                                <ServerMember
                                    key={member.id}
                                    member={member}
                                    server={server}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};