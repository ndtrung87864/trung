"use client";

import axios from "axios";
import qs from "query-string";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useModal } from "@/hooks/use-modal-store";

export const RemoveMemberModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [loading, setLoading] = useState(false);

  const isModalOpen = isOpen && type === "removeMember";
  const { classroomId, member, onSuccess } = data;

  const handleRemoveMember = async () => {
    try {
      setLoading(true);
      
      const url = qs.stringifyUrl({
        url: `/api/admin/classroom/${classroomId}/members`,
        query: {
          memberId: member?.id,
        }
      });

      await axios.delete(url);
      
      toast({
        title: "Thành viên đã bị xóa",
        description: "Thành viên đã được xóa khỏi lớp học thành công.",
        variant: "success",
      });
      
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa thành viên. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Xác nhận xóa thành viên
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Bạn có chắc chắn muốn xóa thành viên này khỏi lớp học?
          </DialogDescription>
        </DialogHeader>

        {member && (
          <div className="px-6 py-4">
            <div className="flex items-center space-x-3 p-4 bg-zinc-100 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.profile.imageUrl || undefined} alt={member.profile.name} />
                <AvatarFallback>
                  {member.profile.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.profile.name}</p>
                <p className="text-sm text-zinc-500">{member.profile.email}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="bg-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleRemoveMember}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa thành viên
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};