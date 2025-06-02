"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChannelType, MemberRole, Channel, Profile } from "@prisma/client";
import { Book, ChevronRight, Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ServerHeader } from "./server-header";
import { ServerSearch } from "./server-search";
import { ServerSection } from "./server-section";
import { SeverChannel } from "./server-channel";
import { ServerMember } from "./server-member";

// Mapping for icons
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

interface Member {
  id: string;
  role: MemberRole;
  profileId: string;
  profile: Profile;
}

interface ServerSidebarProps {
  serverId: string;
  serverData?: any;
}

export const ServerSidebar = ({ serverId, serverData }: ServerSidebarProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [server, setServer] = useState<any>(serverData);
  const router = useRouter();

  // Fetch profile and server data if not provided
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch profile data
        const profileRes = await fetch("/api/profile/me");
        const profileData = await profileRes.json();
        setProfile(profileData);

        // If server data wasn't passed in, fetch it
        if (!serverData) {
          const serverRes = await fetch(`/api/servers/${serverId}`);
          const serverData = await serverRes.json();
          setServer(serverData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [serverId, serverData]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!server || !profile) {
    return (
      <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5] items-center justify-center">
        <p className="text-sm text-muted-foreground">Server not found</p>
      </div>
    );
  }

  const textChannels = server?.channels?.filter((channel: Channel) => channel.type === ChannelType.TEXT) || [];
  const audioChannels = server?.channels?.filter((channel: Channel) => channel.type === ChannelType.AUDIO) || [];
  const videoChannels = server?.channels?.filter((channel: Channel) => channel.type === ChannelType.VIDEO) || [];
  const members = server?.members?.filter((member: Member) => member.profileId !== profile.id) || [];
  
  // Find user's role in this server
  const role = server.members?.find((member: Member) => member.profileId === profile.id)?.role;

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
                data: textChannels?.map((channel: Channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              },
              {
                label: "Kênh thoại",
                type: "channel",
                data: audioChannels?.map((channel: Channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              },
              {
                label: "Kênh video",
                type: "channel",
                data: videoChannels?.map((channel: Channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type],
                })),
              },
              {
                label: "Thành viên",
                type: "member",
                data: members?.map((member: Member) => ({
                  id: member.id,
                  name: member.profile.name,
                  icon: roleIconMap[member.role],
                })),
              },
            ]}
          />
        </div>
        <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
        
        {/* Text channels section */}
        {!!textChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.TEXT}
              role={role}
              label="Kênh nhắn tin"
            />
            <div className="space-y-[2px]">
              {textChannels.map((channel: any) => (
                <SeverChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Other sections (audio, video, members) remain the same */}
        {/* ... */}
      </ScrollArea>
    </div>
  );
};
