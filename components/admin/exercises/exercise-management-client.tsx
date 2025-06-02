"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/loading-spinner";

// Dynamic import phía client component
const ExerciseManagement = dynamic(
  () => import("@/components/Exercise-Management/ExerciseManagement"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Đang tải quản lý bài tập...</span>
      </div>
    ),
  }
);

interface ExerciseManagementClientProps {
  exercises: any[];
  models: any[];
  fields: any[];
  servers: [string, string][];
  serverChannels: Record<string, { id: string; name: string; type: string }[]>;
  currentServerId?: string | "all";
  currentChannelId?: string | "all" | null;
}

export default function ExerciseManagementClient({
  exercises,
  models,
  fields,
  servers,
  serverChannels,
  currentServerId = "all",
  currentChannelId = null,
}: ExerciseManagementClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ExerciseManagement
      exercises={exercises}
      models={models}
      fields={fields}
      servers={servers}
      serverChannels={serverChannels}
      currentServerId={currentServerId}
      currentChannelId={currentChannelId}
    />
  );
}
