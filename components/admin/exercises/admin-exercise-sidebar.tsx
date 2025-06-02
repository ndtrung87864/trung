"use client";

import { Channel, Exercise, Server } from "@prisma/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building, Layers, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface AdminExerciseSidebarProps {
  servers: (Server & {
    channels: (Channel & {
      exercises: Exercise[];
    })[];
  })[];
  currentServerId: string | "all";
  channels: (Channel & {
    exercises: Exercise[];
  })[];
  selectedChannelId: string | "all" | null;
}

const AdminExerciseSidebar = ({
  servers,
  currentServerId,
  channels,
  selectedChannelId
}: AdminExerciseSidebarProps) => {
  const router = useRouter();
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

  const handleAllExercisesSelect = () => {
    router.push(`/admin/exercises?view=all`);
  };

  const handleServerSelect = (serverId: string) => {
    router.push(`/admin/exercises?serverId=${serverId}`);
  };

  const handleChannelSelect = (channelId: string) => {
    if (currentServerId !== "all") {
      router.push(`/admin/exercises?serverId=${currentServerId}&channelId=${channelId}`);
    }
  };

  return (
    <div className="py-2">
      {/* All Exercises Option */}
      <div className="px-3 mb-2">
        <button
          onClick={handleAllExercisesSelect}
          className={cn(
            "w-full flex items-center p-2 rounded-md mb-1 text-left",
            currentServerId === "all"
              ? "bg-zinc-700/20 dark:bg-zinc-700 text-primary"
              : "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300"
          )}
        >
          <Layers className="h-4 w-4 mr-2 text-zinc-500 dark:text-zinc-400" />
          <span className="truncate font-medium">Tất cả bài tập</span>
        </button>
      </div>

      <Separator className="my-2" />
      
      {/* Server Selection */}
      <div className="px-3 mb-2">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
          Lớp học
        </h3>
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => handleServerSelect(server.id)}
            className={cn(
              "w-full flex items-center p-2 rounded-md mb-1 text-left",
              currentServerId === server.id
                ? "bg-zinc-700/20 dark:bg-zinc-700 text-primary"
                : "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300"
            )}
          >
            <Building className="h-4 w-4 mr-2 text-zinc-500 dark:text-zinc-400" />
            <span className="truncate">{server.name}</span>
          </button>
        ))}
      </div>

      {/* Channel list for current server */}
      {currentServerId !== "all" && (
        <>
          <Separator className="my-2" />
          <div className="px-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
              Môn học
            </h3>
            {channels.length > 0 ? (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={cn(
                    "w-full flex items-center p-2 rounded-md mb-1 text-left",
                    selectedChannelId === channel.id
                      ? "bg-zinc-700/20 dark:bg-zinc-700 text-primary"
                      : "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-zinc-500 dark:text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {channel.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {channel.exercises.length} bài tập
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 px-2">
                Không có kênh nào có bài tập
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminExerciseSidebar;
