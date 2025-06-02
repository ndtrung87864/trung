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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  onAgentAdded: () => void;
  existingAgentIds?: string[];
}

export const AddAgentModal = ({ isOpen, onClose, classroomId, onAgentAdded, existingAgentIds = [] }: AddAgentModalProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingAgentId, setAddingAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

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
        title: "Error",
        description: "Failed to fetch available agents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (fieldId: string) => {
    try {
      setAddingAgentId(fieldId);
      
      const response = await axios.post(`/api/admin/classroom/${classroomId}/agents`, {
        fieldId,
      });
      
      toast({
        title: "Success",
        description: "Agent has been added to the classroom.",
        variant: "success",
      });
      
      onAgentAdded();
      onClose();
    } catch (error: any) {
      console.error("Failed to add agent:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to add agent to classroom.",
        variant: "destructive",
      });
    } finally {
      setAddingAgentId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Agent to Classroom</DialogTitle>
          <DialogDescription>
            Select an AI agent to add to this classroom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            placeholder="Search agents..."
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
              No available agents found
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
                      {agent.description || "No description"}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {agent.model.name}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="ml-2"
                    onClick={() => handleAddAgent(agent.id)}
                    disabled={addingAgentId === agent.id}
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
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};