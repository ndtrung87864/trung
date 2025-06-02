"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberRole } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";

interface Profile {
  id: string;
  name: string;
  imageUrl: string | null;
  email: string | null;
}

export const AddMemberModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<MemberRole>("GUEST");

  const isModalOpen = isOpen && type === "addMember";
  const { classroomId, existingMemberIds, onSuccess } = data;

  useEffect(() => {
    if (searchTerm.trim()) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);
      
      // Filter out existing members
      const filteredUsers = response.data.filter((user: Profile) => 
        !existingMemberIds?.includes(user.id)
      );
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tìm kiếm người dùng. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      setAddingUserId(userId);
      
      await axios.post(`/api/admin/classroom/${classroomId}/members`, {
        userId,
        role: selectedRole
      });
      
      toast({
        title: "Thành công",
        description: "Thành viên đã được thêm vào lớp học.",
        variant: "success",
      });
      
      onSuccess?.();
      
      // Remove added user from search results
      setUsers(prev => prev.filter(user => user.id !== userId));
      
    } catch (error) {
      console.error("Failed to add member:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm thành viên. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setAddingUserId("");
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setUsers([]);
    setSelectedRole("GUEST");
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Thêm thành viên
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Tìm kiếm và thêm người dùng vào lớp học
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="space-y-2">
            <Label htmlFor="search" className="uppercase text-xs font-bold text-zinc-500">
              Tìm kiếm theo tên hoặc email
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nhập tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="uppercase text-xs font-bold text-zinc-500">
              Vai trò mặc định
            </Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as MemberRole)}>
              <SelectTrigger className="bg-zinc-300/50 border-0 focus:ring-0 text-black ring-offset-0 focus:ring-offset-0">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GUEST">Học sinh</SelectItem>
                <SelectItem value="MODERATOR">Quản lý</SelectItem>
                <SelectItem value="ADMIN">Giáo viên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Đang tìm kiếm...</span>
            </div>
          )}

          {users.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Label className="uppercase text-xs font-bold text-zinc-500">
                Kết quả tìm kiếm
              </Label>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl || undefined} alt={user.name} />
                      <AvatarFallback>
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAddMember(user.id)}
                    disabled={addingUserId === user.id}
                  >
                    {addingUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Thêm"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchTerm && !loading && users.length === 0 && (
            <div className="text-center py-4 text-zinc-500">
              Không tìm thấy người dùng nào
            </div>
          )}
        </div>

        <DialogFooter className="bg-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={handleClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};