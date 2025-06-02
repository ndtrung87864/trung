import { Metadata } from "next";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExamChannelSidebar from "@/components/exam/exam-channel-sidebar";
import ExamContent from "@/components/exam/exam-content";
import { ExamSearch } from "@/components/exam/exam-search";
import { db } from "@/lib/db";
import { Building, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Bài kiểm tra - Hệ thống học tập",
  description: "Danh sách bài kiểm tra của các lớp học",
};

interface ExamsPageProps {
  searchParams: Promise<{
    channelId?: string;
    serverId?: string;
    examId?: string;
  }>;
}

const ExamsPage = async ({
  searchParams,
}: ExamsPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/");
  }

  // Properly await searchParams before accessing properties
  const resolvedParams = await searchParams;
  const channelId = resolvedParams.channelId;
  const serverId = resolvedParams.serverId;

  // Convert searchParams to regular strings
  const channelIdParam = typeof channelId === 'string' ? channelId : undefined;
  const serverIdParam = typeof serverId === 'string' ? serverId : undefined;
  
  // First, get all servers the user is a member of
  const userServers = await db.server.findMany({
    where: {
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
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
  const serversWithExams = userServers.filter(server => server.channels.length > 0);

  if (serversWithExams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Không có bài kiểm tra nào</h1>
        <p className="text-muted-foreground text-center">
          Hiện tại không có bài kiểm tra nào được gán cho lớp học mà bạn tham gia.
        </p>
      </div>
    );
  }

  // Determine the current server
  let currentServer = serverIdParam 
    ? serversWithExams.find(server => server.id === serverIdParam)
    : serversWithExams[0];

  // If the specified server doesn't exist or has no channels with exams, default to the first one
  if (!currentServer) {
    currentServer = serversWithExams[0];
  }

  // Get channels for the current server
  const channels = currentServer.channels;

  // Determine selected channel, considering it must be from the current server
  let selectedChannel = null;
  
  if (channelIdParam) {
    // Only use the channelId if it belongs to the current server
    selectedChannel = channels.find(channel => channel.id === channelIdParam);
  }
  
  // If no valid channel is selected, default to the first one
  if (!selectedChannel && channels.length > 0) {
    selectedChannel = channels[0];
  }

  // Prepare data for search component
  const searchData = [
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
      label: "Kênh",
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

  return (
    <div className="flex h-full">
      {/* Sidebar with server and channel list */}
      <div className="hidden md:flex h-full w-60 flex-col border-r">
        <div className="p-3 font-semibold text-xl border-b">
          Bài kiểm tra
        </div>
        <div className="px-2 py-2">
          <ExamSearch data={searchData} />
        </div>
        <ScrollArea className="flex-1">
          <ExamChannelSidebar 
            servers={serversWithExams}
            currentServerId={currentServer.id}
            channels={channels}
            selectedChannelId={selectedChannel?.id || null}
          />
        </ScrollArea>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 h-full overflow-hidden">
        {selectedChannel ? (
          <ExamContent 
            channel={selectedChannel}
            server={currentServer}
            exams={selectedChannel.exams || []}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500">Không có kênh nào có bài kiểm tra</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamsPage;
