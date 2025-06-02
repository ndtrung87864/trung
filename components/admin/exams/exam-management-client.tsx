"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/loading-spinner";

// Dynamic import phía client component
const ExamManagement = dynamic(
  () => import("@/components/Exam-Management/Exam-Management-Page"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Đang tải quản lý bài kiểm tra...</span>
      </div>
    ),
  }
);

interface ExamManagementClientProps {
  exams: any[];
  currentServerId?: string | "all";
  currentChannelId?: string | "all" | null;
}

export default function ExamManagementClient({
  exams,
  currentServerId = "all",
  currentChannelId = null,
}: ExamManagementClientProps) {
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
    <ExamManagement
      exams={exams}
      currentServerId={currentServerId}
      currentChannelId={currentChannelId}
    />
  );
}
