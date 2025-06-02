"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { FileUploader } from "@/components/AI-Agent-Management/file-uploader";
import { FileUpload } from "@/components/file-upload";

interface Agent {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  prompt: string;
  isActive: boolean;
  files?: File[];
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Partial<Agent>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/admin/agents');
        const data = await res.json();
        setAgents(data);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        toast({
          title: "Error",
          description: "Failed to load agents",
          variant: "destructive"
        });
      }
    };

    fetchAgents();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/model');

        const data = await res.json();
        setAvailableModels(data);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

  const handleCreateAgent = () => {
    setCurrentAgent({
      name: '',
      description: '',
      modelId: availableModels[0]?.id || '', // Sửa lại dùng ?. và fallback ''
      prompt: '',
      isActive: true
    });
    setFiles([]);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setCurrentAgent(agent);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteAgent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      await fetch(`/api/admin/agents/${id}`, {
        method: 'DELETE'
      });

      setAgents(agents.filter(agent => agent.id !== id));
      toast({
        title: "Success",
        description: "Agent deleted successfully"
      });
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('data', JSON.stringify(currentAgent));

      // Add files if available
      files.forEach(file => {
        formData.append('files', file);
      });

      // Handle API request
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing
        ? `/api/admin/agents/${currentAgent.id}`
        : '/api/admin/agents';

      const res = await fetch(url, {
        method,
        body: formData
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      // Update local state
      if (isEditing) {
        setAgents(agents.map(agent =>
          agent.id === data.id ? data : agent
        ));
      } else {
        setAgents([data, ...agents]);
      }

      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: `Agent ${isEditing ? 'updated' : 'created'} successfully`
      });
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} agent`,
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/toggle`, {
        method: 'PATCH'
      });

      const data = await res.json();

      setAgents(agents.map(a =>
        a.id === agent.id ? { ...a, isActive: data.isActive } : a
      ));
    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trợ lý lớp học </h1>
        <Button onClick={handleCreateAgent}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <Card key={agent.id} className={!agent.isActive ? "opacity-70" : ""}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                {agent.name}
                <Switch
                  checked={agent.isActive}
                  onCheckedChange={() => handleToggleActive(agent)}
                />
              </CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <p className="text-sm font-medium">Model:</p>
                <p className="text-sm text-muted-foreground">
                  {availableModels.find(m => m.id === agent.modelId)?.name || agent.modelId}
                </p>
              </div>
              <div className="mb-2">
                <p className="text-sm font-medium">Prompt:</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{agent.prompt}</p>
              </div>
              {agent.files && agent.files.length > 0 && (
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  {agent.files.length} document(s)
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleEditAgent(agent)}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteAgent(agent.id)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Agent Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the agent information below.'
                : 'Fill in the details to create a new AI agent.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={currentAgent.name || ''}
                onChange={(e) => setCurrentAgent({ ...currentAgent, name: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input
                id="description"
                value={currentAgent.description || ''}
                onChange={(e) => setCurrentAgent({ ...currentAgent, description: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">Model</Label>
              <select
                id="model"
                value={currentAgent.modelId || ''}
                onChange={(e) => setCurrentAgent({ ...currentAgent, modelId: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="prompt" className="text-right pt-2">System Prompt</Label>
              <Textarea
                id="prompt"
                value={currentAgent.prompt || ''}
                onChange={(e) => setCurrentAgent({ ...currentAgent, prompt: e.target.value })}
                className="col-span-3 min-h-[100px]"
                placeholder="Enter instructions for the AI agent here..."
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Files</Label>
              <div className="col-span-3">
                <FileUploader
                  onFilesSelected={setFiles}
                  existingFiles={currentAgent.files}
                  acceptedFileTypes=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  maxFileSizeInMB={20}
                />
                {/* <FileUpload
                  endpoint="fileAgent"
                  value={currentAgent.files}
                  onChange={field.onChange}
                /> */}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">Active</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={currentAgent.isActive}
                  onCheckedChange={(checked) =>
                    setCurrentAgent({ ...currentAgent, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">
                  {currentAgent.isActive ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}