"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ExerciseStatusToggleProps {
  exerciseId: string;
  initialStatus: boolean;
  onStatusChange?: (newStatus: boolean) => void;
}

export function ExerciseStatusToggle({ 
  exerciseId, 
  initialStatus, 
  onStatusChange 
}: ExerciseStatusToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const toggleStatus = async () => {
    try {
      setIsLoading(true);
      console.log("Toggling status for exercise:", exerciseId, "Current status:", currentStatus);
      
      const response = await fetch(`/api/admin/exercise/${exerciseId}/toggle-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          isActive: !currentStatus 
        }),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to toggle exercise status");
      }
      
      const result = await response.json();
      const newStatus = !currentStatus;
      setCurrentStatus(newStatus);
      
      toast({
        title: "Thành công",
        description: result.message || `Bài tập đã được ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'}`,
      });
      
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (error) {
      console.error("Error toggling exercise status:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể cập nhật trạng thái bài tập",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch 
        checked={currentStatus} 
        onCheckedChange={toggleStatus}
        disabled={isLoading}
        className="data-[state=checked]:bg-green-500"
      />
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
