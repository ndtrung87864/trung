"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/use-modal-store";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  model: {
    id: string;
    name: string;
  };
  isActive: boolean;
}

export const AddAgentModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  
  const isModalOpen = isOpen && type === "addAgent";
  const { classroomId } = data;
  // console.log("AddAgentModal - server:", data);
  // console.log("AddAgentModal - server:", server);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingAgentId, setAddingAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [existingAgentIds, setExistingAgentIds] = useState<string[]>([]);

  useEffect(() => {
    if (isModalOpen) {
      fetchAgents();
      fetchExistingAgents();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (agents.length > 0) {
      const filtered = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !existingAgentIds.includes(agent.id)
      );
      setFilteredAgents(filtered);
    }
  }, [agents, searchQuery, existingAgentIds]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/admin/agents");
      setAgents(response.data);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách trợ lý.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchExistingAgents = async () => {
    if (!classroomId) return;
    
    try {
      const response = await axios.get(`/api/admin/classroom/${classroomId}/agents`);
      setExistingAgentIds(response.data.map((item: any) => item.classroomId));
    } catch (error) {
      console.error("Failed to fetch existing agents:", error);
    }
  };

  const handleAddAgent = async (fieldId: string) => {
    // console.log("handleAddAgent called with fieldId:", fieldId);
    if (!classroomId) return;
    console.log("Adding agent with fieldId:", fieldId);
    
    try {
      setAddingAgentId(fieldId);
      
      await axios.post(`/api/admin/classroom/${classroomId}/agents`, {
        fieldId,
      });
      
      toast({
        title: "Thành công",
        description: "Đã thêm trợ lý vào lớp học.",
        variant: "success",
      });
      
      router.refresh();
      onClose();
    } catch (error: any) {
      console.error("Failed to add agent:", error);
      toast({
        title: "Lỗi",
        description: error?.response?.data?.error || "Không thể thêm trợ lý.",
        variant: "destructive",
      });
    } finally {
      setAddingAgentId(null);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm trợ lý AI</DialogTitle>
          <DialogDescription>
            Chọn trợ lý AI để thêm vào lớp học này.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            placeholder="Tìm kiếm trợ lý..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Không tìm thấy trợ lý phù hợp" : "Không có trợ lý mới để thêm"}
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              {filteredAgents.map((agent) => (
                <div 
                  key={agent.id} 
                  className="flex items-center justify-between p-3 border rounded-md mb-2 hover:bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {agent.description || "Không có mô tả"}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {agent.model.name}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="ml-2"
                    onClick={() => handleAddAgent(agent.id)}
                    // disabled={addingAgentId === agent.id}
                  >
                    {addingAgentId === agent.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};