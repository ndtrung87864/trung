"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Grid3X3, List, Filter, ArrowDownAZ } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import the shared Exercise type
import { Exercise } from "@/types/exercise";

// Import components
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseFormDialog } from "./ExerciseFormDialog";
import ExerciseListItem from "./ExerciseListItem";

interface ExerciseManagementProps {
    exercises: Exercise[];
    models: { id: string; name: string }[];
    fields: { id: string; name: string }[];
    servers: [string, string][]; // [serverId, serverName]
    serverChannels: Record<string, { id: string; name: string; type: string }[]>;
    currentServerId?: string | "all";
    currentChannelId?: string | "all" | null;
}

export const ExerciseManagement = ({ 
    exercises: initialExercises, 
    models, 
    fields, 
    servers, 
    serverChannels,
    currentServerId = "all",
    currentChannelId = null
}: ExerciseManagementProps) => {
    const router = useRouter();
    const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
    
    // Add state for filtering and sorting
    const [searchQuery, setSearchQuery] = useState("");
    const [filterOption, setFilterOption] = useState<"all" | "active" | "inactive" | "references" | "shuffled">("all");
    const [sortOption, setSortOption] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("name-asc");
    
    // Add state for view mode toggle with localStorage persistence
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    
    // Load view mode preference from localStorage
    useEffect(() => {
        const savedViewMode = typeof window !== 'undefined' ? localStorage.getItem('exerciseViewMode') : null;
        if (savedViewMode === 'grid' || savedViewMode === 'list') {
            setViewMode(savedViewMode);
        }
    }, []);
    
    // Save view mode preference to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('exerciseViewMode', viewMode);
        }
    }, [viewMode]);

    // Update filtered exercises when exercises prop changes
    useEffect(() => {
        setExercises(initialExercises);
    }, [initialExercises]);

    // Handle refresh with debounce to prevent multiple refreshes
    const handleRefresh = useCallback(() => {
        if (isRefreshing) return;
        
        setIsRefreshing(true);
        
        // Use setTimeout to ensure state updates complete before refresh
        setTimeout(() => {
            router.refresh();
            setIsRefreshing(false);
        }, 100);
    }, [router, isRefreshing]);

    // Handle dialog close with proper cleanup
    const handleDialogClose = useCallback(() => {
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setCurrentExercise(null);
        
        // Then refresh after a short delay
        setTimeout(() => {
            handleRefresh();
        }, 200);
    }, [handleRefresh]);

    const handleCreateExercise = () => {
        setIsCreateDialogOpen(true);
    };
    
    const handleEditExercise = (exercise: Exercise) => {
        setCurrentExercise(exercise);
        setIsEditDialogOpen(true);
    };

    // Filter and sort exercises based on search, filter, and sort options
    const filteredAndSortedExercises = useMemo(() => {
        return exercises
            .filter(exercise => {
                // Search by name or description
                const matchesSearch = (exercise.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                     (exercise.description || "").toLowerCase().includes(searchQuery.toLowerCase());
                
                // Filter by status
                const matchesFilter = filterOption === "all" ||
                                     (filterOption === "active" && exercise.isActive) ||
                                     (filterOption === "inactive" && !exercise.isActive) ||
                                     (filterOption === "references" && exercise.allowReferences) ||
                                     (filterOption === "shuffled" && exercise.shuffleQuestions);
                
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                // Sort by name, date, or custom order
                if (sortOption === "name-asc") {
                    return (a.name || "").localeCompare(b.name || "");
                } else if (sortOption === "name-desc") {
                    return (b.name || "").localeCompare(a.name || "");
                } else if (sortOption === "newest") {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                } else if (sortOption === "oldest") {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                
                return 0;
            });
    }, [exercises, searchQuery, filterOption, sortOption]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header with title and add button */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Quản lý bài tập</h1>
                <div className="flex items-center gap-2">
                    {/* View mode toggle buttons */}
                    <div className="border rounded-md p-1 flex gap-1 mr-2">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className="px-2 py-1"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className="px-2 py-1"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button 
                        onClick={handleCreateExercise} 
                        disabled={isCreateDialogOpen || isRefreshing}
                        className="bg-green-600 hover:bg-green-700 text-white group"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm bài tập mới
                    </Button>
                </div>
            </div>

            {/* Search and filter bar */}
            <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 mb-2 md:mb-0">
                        <Input
                            placeholder="Tìm kiếm bài tập..."
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
                        </DropdownMenu>
                        
                        <DropdownMenu>
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

            {/* Display status with count */}
            <div className="text-muted-foreground">
                {currentServerId === "all" 
                    ? `Hiển thị ${filteredAndSortedExercises.length} bài tập từ tất cả lớp học`
                    : currentChannelId 
                    ? `Hiển thị ${filteredAndSortedExercises.length} bài tập từ môn học này`
                    : `Hiển thị ${filteredAndSortedExercises.length} bài tập từ lớp học này`
                }
            </div>

            {/* Exercise Grid or List based on viewMode */}
            {filteredAndSortedExercises.length === 0 ? (
                <div className="text-center py-12">
                    <h3 className="text-lg font-semibold mb-2">Chưa có bài tập nào</h3>
                    <p className="text-muted-foreground mb-4">
                        {currentServerId === "all" 
                            ? "Hiện chưa có bài tập nào trong hệ thống."
                            : "Hiện chưa có bài tập nào cho khu vực này."
                        }
                    </p>
                    <Button onClick={handleCreateExercise} disabled={isCreateDialogOpen || isRefreshing}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo bài tập đầu tiên
                    </Button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedExercises.map((exercise) => (
                        <ExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            models={models}
                            onEdit={handleEditExercise}
                            onRefresh={handleRefresh}
                            serverId={currentServerId || "all"}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col space-y-4">
                    {filteredAndSortedExercises.map((exercise) => (
                        <ExerciseListItem
                            key={exercise.id}
                            exercise={exercise}
                            models={models}
                            onEdit={handleEditExercise}
                            onRefresh={handleRefresh}
                        />
                    ))}
                </div>
            )}

            {/* Create Exercise Dialog */}
            {isCreateDialogOpen && (
                <ExerciseFormDialog
                    isOpen={isCreateDialogOpen}
                    onClose={handleDialogClose}
                    models={models}
                    fields={fields}
                    servers={servers}
                    serverChannels={serverChannels}
                />
            )}
            
            {/* Edit Exercise Dialog */}
            {isEditDialogOpen && currentExercise && (
                <ExerciseFormDialog
                    isOpen={isEditDialogOpen}
                    onClose={handleDialogClose}
                    exercise={{
                        ...currentExercise,
                        files: currentExercise.files || [],
                        channel: currentExercise.channel || undefined
                    }}
                    models={models}
                    fields={fields}
                    servers={servers}
                    serverChannels={serverChannels}
                    isEdit={true}
                />
            )}
        </div>
    );
};

export default ExerciseManagement;
