import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Edit, Trash, Plus } from "lucide-react";

interface Model {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const ModelManager: React.FC = () => {
    const [models, setModels] = useState<Model[]>([]);
    const [name, setName] = useState("");
    const [id, setId] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [editing, setEditing] = useState<Model | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Lấy danh sách model
    const fetchModels = async () => {
        try {
            const res = await fetch("/api/model");
            if (!res.ok) throw new Error("Failed to fetch models");
            const data = await res.json();
            setModels(data);
        } catch (error) {
            console.error("Error fetching models:", error);
            toast({
                title: "Error",
                description: "Could not load models. Please try again later.",
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    // Thêm hoặc sửa model
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            if (editing) {
                // Update existing model
                const res = await fetch(`/api/model/${editing.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, isActive }),
                });
                
                if (!res.ok) throw new Error("Failed to update model");
                
                const updatedModel = await res.json();
                setModels(models.map(model => 
                    model.id === editing.id ? updatedModel : model
                ));
                
                toast({
                    title: "Success",
                    description: "Model updated successfully",
                });
            } else {
                // Create new model
                const res = await fetch("/api/model", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, name, isActive }),
                });
                
                if (!res.ok) throw new Error("Failed to create model");
                
                const newModel = await res.json();
                setModels([...models, newModel]);
                
                toast({
                    title: "Success",
                    description: "Model created successfully",
                });
            }
            
            // Reset form
            setName("");
            setId("");
            setIsActive(true);
            setEditing(null);
            
        } catch (error) {
            console.error("Error saving model:", error);
            toast({
                title: "Error",
                description: `Failed to ${editing ? "update" : "create"} model`,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle deleting a model
    const handleDelete = async (modelId: string) => {
        if (!confirm("Are you sure you want to delete this model?")) return;
        
        try {
            const res = await fetch(`/api/model/${modelId}`, {
                method: "DELETE"
            });
            
            if (!res.ok) throw new Error("Failed to delete model");
            
            setModels(models.filter(model => model.id !== modelId));
            
            toast({
                title: "Success",
                description: "Model deleted successfully",
            });
        } catch (error) {
            console.error("Error deleting model:", error);
            toast({
                title: "Error",
                description: "Failed to delete model",
                variant: "destructive"
            });
        }
    };

    // Handle toggling model active state
    const handleToggleActive = async (model: Model) => {
        try {
            const res = await fetch(`/api/model/${model.id}/toggle`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !model.isActive }),
            });
            
            if (!res.ok) throw new Error("Failed to toggle model status");
            
            const updatedModel = await res.json();
            setModels(models.map(m => 
                m.id === model.id ? updatedModel : m
            ));
        } catch (error) {
            console.error("Error toggling model status:", error);
            toast({
                title: "Error",
                description: "Failed to update model status",
                variant: "destructive"
            });
        }
    };

    // Set up edit mode
    const handleEdit = (model: Model) => {
        setEditing(model);
        setName(model.name);
        setIsActive(model.isActive);
        setId(model.id);
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Model Management</h1>
                {!editing && (
                    <Button onClick={() => setEditing({
                        id: "",
                        name: "",
                        isActive: true,
                        createdAt: "",
                        updatedAt: ""
                    })}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Model
                    </Button>
                )}
            </div>

            {editing && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>
                            {editing.id ? "Edit Model" : "Create New Model"}
                        </CardTitle>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {!editing.id && (
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="id">Model ID</Label>
                                    <Input
                                        id="id"
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        placeholder="Enter model ID"
                                        required
                                    />
                                </div>
                            )}
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="name">Model Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter model name"
                                    required
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                                <Label htmlFor="isActive">Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setEditing(null);
                                    setName("");
                                    setId("");
                                    setIsActive(true);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Model"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map((model) => (
                    <Card key={model.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{model.name}</span>
                                <Switch
                                    checked={model.isActive}
                                    onCheckedChange={() => handleToggleActive(model)}
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p><strong>ID:</strong> {model.id}</p>
                            <p><strong>Status:</strong> {model.isActive ? "Active" : "Inactive"}</p>
                            <p className="text-sm text-muted-foreground">
                                Created: {new Date(model.createdAt).toLocaleDateString()}
                            </p>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEdit(model)}
                            >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleDelete(model.id)}
                            >
                                <Trash className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
                
                {models.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <p className="text-muted-foreground">No models found. Create your first model to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelManager;