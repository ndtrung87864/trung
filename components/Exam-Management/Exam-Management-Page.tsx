"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Grid3X3, List, Filter, ArrowDownAZ} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import our new components
import ExamCard from "./ExamCard";
import ExamListItem from "./ExamListItem";
import ExamFormDialog from "./ExamFormDialog";
import SubjectSelectionDialog from "./SubjectSelectionDialog";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import { Exam, ChannelWithServer, Model } from "../../types/exam";

interface ExamManagementProps {
    exams?: Exam[];
    currentServerId?: string | "all";
    currentChannelId?: string | "all" | null;
}

interface ChannelData {
    id: string;
    name: string;
    serverId: string;
    server?: {
        name: string;
    };
}

export default function ExamManagement({ 
    exams: initialExams, 
    currentServerId = "all",
    currentChannelId = null
}: ExamManagementProps = {}) {    
    const [exams, setExams] = useState<Exam[]>(initialExams || []);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExam, setCurrentExam] = useState<Partial<Exam>>({});
    const [files, setFiles] = useState<File[]>([]);
    const [availableModels, setAvailableModels] = useState<Model[]>([]);
    const [availableChannels, setAvailableChannels] = useState<ChannelWithServer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    // Add state for subject selection dialog
    const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [serverChannels, setServerChannels] = useState<{ [key: string]: { id: string; name: string }[] }>({});
    // Add state for delete confirmation dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);
    // Add state for view mode toggle (grid/list) with localStorage persistence
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    // Add state for search, filter, and sort
    const [searchQuery, setSearchQuery] = useState("");
    const [filterOption, setFilterOption] = useState<"all" | "active" | "inactive" | "references" | "shuffled">("all");
    const [sortOption, setSortOption] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");
    
    // Load view mode preference from localStorage
    useEffect(() => {
        // Check for client-side execution
        const savedViewMode = typeof window !== 'undefined' ? localStorage.getItem('examViewMode') : null;
        if (savedViewMode === 'grid' || savedViewMode === 'list') {
            setViewMode(savedViewMode);
        }
    }, []);
    
    // Save view mode preference to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('examViewMode', viewMode);
        }
    }, [viewMode]);

    // Fetch exams if not provided
    useEffect(() => {
        if (initialExams) {
            setExams(initialExams);
            return;
        }

        const fetchExams = async () => {
            try {
                const res = await fetch('/api/admin/exam');
                if (!res.ok) throw new Error('Failed to fetch exams');
                const data = await res.json();
                setExams(data);
            } catch (error) {
                console.error('Failed to fetch exams:', error);
                toast({
                    title: "Error",
                    description: "Failed to load exams",
                    variant: "destructive"
                });
            }
        };

        fetchExams();
    }, [initialExams]);

    // Fetch models and channels
    useEffect(() => {
        const fetchModelsAndChannels = async () => {
            try {
                // Fetch models
                const modelRes = await fetch('/api/model');
                const modelData = await modelRes.json();
                setAvailableModels(modelData);

                // Fetch channels
                const channelRes = await fetch('/api/admin/channels');
                const channelData: ChannelData[] = await channelRes.json();
                
                // Filter out "general" channels or any special channels you want to exclude
                const filteredChannelData = channelData.filter((channel: ChannelData) => 
                    !channel.name.toLowerCase().includes('general')
                );
                
                const channelsWithServerInfo = filteredChannelData.map((channel: ChannelData) => ({
                    id: channel.id,
                    name: channel.name,
                    serverId: channel.serverId,
                    serverName: channel.server?.name || 'Unknown Server'
                }));
                
                setAvailableChannels(channelsWithServerInfo);
            } catch (error) {
                console.error('Failed to fetch models or channels:', error);
            }
        };

        fetchModelsAndChannels();
    }, []);

    // Filter channels based on the current context
    const filterChannelsBasedOnContext = useCallback(() => {
        // If we're looking at a specific channel, set the current exam's channelId to that channel
        if (currentChannelId && currentChannelId !== "all") {
            setCurrentExam(prev => ({ ...prev, channelId: currentChannelId }));
        }
    }, [currentChannelId]);

    // Apply initial filtering when channels are loaded
    useEffect(() => {
        if (availableChannels.length > 0) {
            filterChannelsBasedOnContext();
        }
    }, [availableChannels, filterChannelsBasedOnContext]);

    // Get available servers for the dialog
    const getAvailableServersForDialog = useCallback(() => {
        // If we're in a specific server context (not "all"), only return that server
        if (currentServerId && currentServerId !== "all") {
          return Object.entries(
            availableChannels
              .filter(channel => channel.serverId === currentServerId)
              .reduce((acc: { [key: string]: string }, channel) => {
                acc[channel.serverId] = channel.serverName;
                return acc;
              }, {})
          );
        }
        
        // Otherwise return all servers
        return Object.entries(
          availableChannels.reduce((acc: { [key: string]: string }, channel) => {
            acc[channel.serverId] = channel.serverName;
            return acc;
          }, {})
        );
    }, [availableChannels, currentServerId]);

    // When opening the dialog, filter channels based on context
    const handleAddExam = useCallback(() => {
        // Reset the current exam
        setCurrentExam({
            name: '',
            description: '',
            modelId: availableModels[0]?.id || '',
            channelId: currentChannelId !== "all" ? currentChannelId || undefined : undefined,
            prompt: '',
            isActive: true,
            allowReferences: false,
            shuffleQuestions: false
        });
        
        // If viewing a specific channel, set it as the selected channel
        if (currentChannelId && currentChannelId !== "all") {
            setCurrentExam(prev => ({ ...prev, channelId: currentChannelId }));
            
            // Auto-select the server of this channel
            const channel = availableChannels.find(c => c.id === currentChannelId);
            if (channel) {
              setSelectedServerId(channel.serverId);
            }
        } else if (currentServerId && currentServerId !== "all") {
            // If in a specific server but no channel selected, pre-select the server
            setSelectedServerId(currentServerId);
        }
        
        setFiles([]);
        setIsEditing(false);
        setIsDialogOpen(true);
    }, [availableModels, currentChannelId, availableChannels, currentServerId]);

    // Handle editing exam - modify to respect server context
    const handleEditExam = (exam: Exam) => {
        console.log("Editing exam:", exam); // Debug log
        
        // Create a full copy of the exam to avoid reference issues
        const examCopy = JSON.parse(JSON.stringify(exam));
        
        // Ensure boolean fields have proper default values if they're undefined
        examCopy.allowReferences = examCopy.allowReferences ?? false;
        examCopy.shuffleQuestions = examCopy.shuffleQuestions ?? false;
        
        setCurrentExam(examCopy);
        setFiles([]);
        setIsEditing(true);
        
        // When editing, set the selected server based on the exam's channel
        if (exam.channelId) {
            const channel = availableChannels.find(c => c.id === exam.channelId);
            if (channel) {
            setSelectedServerId(channel.serverId);
            }
        } else if (currentServerId && currentServerId !== "all") {
            // If in a specific server context, use that
            setSelectedServerId(currentServerId);
        }
        
        setIsDialogOpen(true);
    };

    // Handle showing delete confirmation dialog
    const handleShowDeleteConfirm = (id: string) => {
        setExamToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    // Handle deleting exam
    const handleDeleteExam = async () => {
        if (!examToDelete) return;
        
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/exam/${examToDelete}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete exam');

            setExams(exams.filter(exam => exam.id !== examToDelete));
            toast({
                title: "Success",
                description: "Exam deleted successfully"
            });
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error('Failed to delete exam:', error);
            toast({
                title: "Error",
                description: "Failed to delete exam",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
            setExamToDelete(null);
        }
    };

    // Handle form submission with improved deadline handling
    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            
            // Validate form
            if (!currentExam.name || !currentExam.modelId) {
                toast({
                    title: "Error",
                    description: "Name and model are required",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            console.log("Submitting exam data:", currentExam);
            if (currentExam.deadline) {
                console.log("With deadline:", new Date(currentExam.deadline).toLocaleString());
            } else {
                console.log("No deadline set");
            }

            // Create FormData to handle file uploads
            const formData = new FormData();
            
            // Make sure we're sending a clean object without circular references
            const examData = {...currentExam};
            
            // Remove unnecessary nested objects that the API doesn't need
            if (examData.model) delete examData.model;
            if (examData.channel) delete examData.channel;
            if (examData.field) delete examData.field;
            
            // Ensure deadline is properly formatted or undefined
            if (examData.deadline === '') {
                examData.deadline = undefined;
            }
            
            formData.append('data', JSON.stringify(examData));

            // Add files if available
            files.forEach(file => {
                formData.append('files', file);
            });

            // Handle API request
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing
                ? `/api/admin/exam/${currentExam.id}`
                : '/api/admin/exam';

            console.log(`Sending ${method} request to ${url}`);
            
            const res = await fetch(url, {
                method,
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("API error:", data);
                throw new Error(data.error || 'Something went wrong');
            }

            // Update local state
            if (isEditing) {
                setExams(exams.map(exam =>
                    exam.id === data.id ? data : exam
                ));
            } else {
                setExams([data, ...exams]);
            }

            setIsDialogOpen(false);
            toast({
                title: "Success",
                description: `Exam ${isEditing ? 'updated' : 'created'} successfully`
            });
        } catch (error) {
            console.error('Failed to save exam:', error);
            toast({
                title: "Error",
                description: `Failed to ${isEditing ? 'update' : 'create'} exam: ${error}`,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };    // Handle toggle properties for exams
    const handleToggleActive = async (exam: Exam) => {
        try {
            // Determine which property was toggled based on differences from original exam
            let property = 'isActive';
            let successMessage = '';
            
            if (exam.isActive !== exams.find(e => e.id === exam.id)?.isActive) {
                property = 'isActive';
                successMessage = `Exam ${!exam.isActive ? 'activated' : 'deactivated'} successfully`;
            } 
            else if (exam.allowReferences !== exams.find(e => e.id === exam.id)?.allowReferences) {
                property = 'allowReferences';
                successMessage = `References ${!exam.allowReferences ? 'allowed' : 'disabled'} successfully`;
            }
            else if (exam.shuffleQuestions !== exams.find(e => e.id === exam.id)?.shuffleQuestions) {
                property = 'shuffleQuestions';
                successMessage = `Question shuffling ${!exam.shuffleQuestions ? 'enabled' : 'disabled'} successfully`;
            }
            
            // Send request to toggle endpoint
            const res = await fetch(`/api/admin/exam/${exam.id}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ property }),
            });

            if (!res.ok) throw new Error(`Failed to toggle ${property}`);

            const data = await res.json();

            // Update local state
            setExams(exams.map(e =>
                e.id === exam.id ? data : e
            ));
            
            toast({
                title: "Success",
                description: successMessage
            });
        } catch (error) {
            console.error('Failed to toggle exam status:', error);
            toast({
                title: "Error",
                description: "Failed to update exam status",
                variant: "destructive"
            });
        }
    };

    // Handle subject selection
    const handleSubjectSelect = (channelId: string) => {
        setCurrentExam({ ...currentExam, channelId });
        setIsSubjectDialogOpen(false);
    };

    // Restructure channels by server for the dialog
    useEffect(() => {
        const channelsByServer: { [key: string]: { id: string; name: string }[] } = {};
        
        availableChannels.forEach(channel => {
            if (!channelsByServer[channel.serverId]) {
                channelsByServer[channel.serverId] = [];
            }
            channelsByServer[channel.serverId].push({
                id: channel.id,
                name: channel.name
            });
        });
        
        setServerChannels(channelsByServer);
    }, [availableChannels]);

    // Filter and sort exams based on search, filter, and sort options
    const filteredAndSortedExams = useMemo(() => {
        return exams
            .filter(exam => {
                // Search by name or description
                const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase())
                
                // Filter by active status
                const matchesFilter = filterOption === "all" ||
                                      (filterOption === "active" && exam.isActive) ||
                                      (filterOption === "inactive" && !exam.isActive) ||
                                      (filterOption === "references" && exam.allowReferences) ||
                                      (filterOption === "shuffled" && exam.shuffleQuestions);
                
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                // Sort by name, date, or custom order
                if (sortOption === "name-asc") {
                    return a.name.localeCompare(b.name);
                } else if (sortOption === "name-desc") {
                    return b.name.localeCompare(a.name);
                } else if (sortOption === "newest") {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                } else if (sortOption === "oldest") {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                
                return 0;
            });
    }, [exams, searchQuery, filterOption, sortOption]);

    return (
        <div className="container mx-auto py-8">        <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Quản lý bài kiểm tra</h1>
                <div className="flex items-center gap-2">
                    {/* View mode toggle buttons */}
                    <div className="border rounded-md p-1 flex gap-1 mr-2">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className="px-2 py-1 "
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className="px-2 py-1 "
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={handleAddExam} className="bg-green-600 hover:bg-green-700 text-white group">
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm bài kiểm tra mới
                    </Button>
                </div>
            </div>            {/* Search and filter bar */}
            <div className="mb-12 p-4 rounded-lg border bg-white shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 mb-2 md:mb-0">
                        <Input
                            placeholder="Tìm kiếm bài kiểm tra..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    {filterOption === "all" && "Tất cả"}
                                    {filterOption === "active" && "Đang hoạt động"}
                                    {filterOption === "inactive" && "Ngừng hoạt động"}
                                    {filterOption === "references" && "Có tài liệu tham khảo"}
                                    {filterOption === "shuffled" && "Đã xáo trộn câu hỏi"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Chọn bộ lọc</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setFilterOption("all")}>
                                    Tất cả
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("active")}>
                                    Đang hoạt động
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("inactive")}>
                                    Ngừng hoạt động
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("references")}>
                                    Có tài liệu tham khảo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("shuffled")}>
                                    Đã xáo trộn câu hỏi
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <ArrowDownAZ className="h-4 w-4" />
                                    {sortOption === "name-asc" && "Tên A-Z"}
                                    {sortOption === "name-desc" && "Tên Z-A"}
                                    {sortOption === "newest" && "Mới nhất"}
                                    {sortOption === "oldest" && "Cũ nhất"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Sắp xếp theo</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSortOption("name-asc")}>
                                    Tên A-Z
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("name-desc")}>
                                    Tên Z-A
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("newest")}>
                                    Mới nhất
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("oldest")}>
                                    Cũ nhất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAndSortedExams.map(exam => (
                        <ExamCard
                            key={exam.id}
                            exam={exam}
                            availableModels={availableModels}
                            onToggleActive={handleToggleActive}
                            onEdit={handleEditExam}
                            onDelete={handleShowDeleteConfirm}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col space-y-4">
                    {filteredAndSortedExams.map(exam => (
                        <ExamListItem
                            key={exam.id}
                            exam={exam}
                            availableModels={availableModels}
                            onToggleActive={handleToggleActive}
                            onEdit={handleEditExam}
                            onDelete={handleShowDeleteConfirm}
                        />
                    ))}
                </div>
            )}

            {/* Exam Create/Edit Dialog */}
            <ExamFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                isEditing={isEditing}
                currentExam={currentExam}
                setCurrentExam={setCurrentExam}
                files={files}
                setFiles={setFiles}
                availableModels={availableModels}
                availableChannels={availableChannels}
                onSubjectDialogOpen={() => setIsSubjectDialogOpen(true)}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                currentServerId={currentServerId}
                currentChannelId={currentChannelId}
            />

            {/* Subject Selection Dialog */}
            <SubjectSelectionDialog
                open={isSubjectDialogOpen}
                onOpenChange={setIsSubjectDialogOpen}
                selectedServerId={selectedServerId}
                onServerSelect={setSelectedServerId}
                onSubjectSelect={handleSubjectSelect}
                currentExamChannelId={currentExam.channelId}
                currentServerId={currentServerId}
                serverOptions={getAvailableServersForDialog()}
                serverChannels={serverChannels}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDeleteExam}
                isLoading={isLoading}
            />
        </div>
    );
}