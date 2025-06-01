"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Book, ChevronRight, FileText, Search, Grid3X3, List, Trophy, Filter, SortAsc, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface ExercisePageClientProps {
    serverData: {
        id: string;
        name: string;
        channels: Array<{
            id: string;
            name: string;
            exercises: Array<{
                id: string;
                name: string;
            }>;
        }>;
    };
}

const ExercisePageClient = ({ serverData }: ExercisePageClientProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("name-asc");
    const [filterOption, setFilterOption] = useState("all");

    // Filter channels to only show those with exercises
    const channelsWithExercises = serverData.channels.filter(channel => channel.exercises.length > 0);

    // Apply search, filter, and sort
    const filteredAndSortedChannels = useMemo(() => {
        let filtered = channelsWithExercises;

        // Apply search
        if (searchQuery.trim()) {
            filtered = filtered.filter(channel =>
                channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                channel.exercises.some(exercise => 
                    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Apply filter
        switch (filterOption) {
            case "high-exercise":
                filtered = filtered.filter(channel => channel.exercises.length >= 5);
                break;
            case "low-exercise":
                filtered = filtered.filter(channel => channel.exercises.length < 5);
                break;
            case "medium-exercise":
                filtered = filtered.filter(channel => channel.exercises.length >= 2 && channel.exercises.length < 5);
                break;
            default:
                // "all" - no additional filtering
                break;
        }

        // Apply sort
        switch (sortOption) {
            case "name-asc":
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "name-desc":
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "exercises-asc":
                filtered.sort((a, b) => a.exercises.length - b.exercises.length);
                break;
            case "exercises-desc":
                filtered.sort((a, b) => b.exercises.length - a.exercises.length);
                break;
            default:
                break;
        }

        return filtered;
    }, [channelsWithExercises, searchQuery, sortOption, filterOption]);

    // Count total exercises across filtered channels
    const totalExercises = filteredAndSortedChannels.reduce((sum, channel) => sum + channel.exercises.length, 0);
    const totalChannels = filteredAndSortedChannels.length;
    const averageExercisesPerChannel = totalChannels > 0 ? (totalExercises / totalChannels).toFixed(1) : 0;

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery("");
        setSortOption("name-asc");
        setFilterOption("all");
    };

    // Check if any filters are active
    const hasActiveFilters = searchQuery.trim() !== "" || sortOption !== "name-asc" || filterOption !== "all";

    return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 py-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalExercises}</p>
                                    <p className="text-blue-600 dark:text-blue-400 text-sm">Tổng bài tập</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                                    <Book className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{totalChannels}</p>
                                    <p className="text-purple-600 dark:text-purple-400 text-sm">Môn học có bài tập</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                                    <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{averageExercisesPerChannel}</p>
                                    <p className="text-green-600 dark:text-green-400 text-sm">Trung bình/môn</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 py-6">
                {/* Search and Controls */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                                type="search"
                                placeholder="Tìm kiếm môn học, bài tập..." 
                                className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Filter Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Lọc
                                    {filterOption !== "all" && (
                                        <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center">
                                            1
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Lọc theo số bài tập</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setFilterOption("all")}>
                                    <span className={filterOption === "all" ? "font-medium" : ""}>
                                        Tất cả môn học
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("high-exercise")}>
                                    <span className={filterOption === "high-exercise" ? "font-medium" : ""}>
                                        Nhiều bài tập (≥5)
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("medium-exercise")}>
                                    <span className={filterOption === "medium-exercise" ? "font-medium" : ""}>
                                        Trung bình (2-4 bài)
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterOption("low-exercise")}>
                                    <span className={filterOption === "low-exercise" ? "font-medium" : ""}>
                                        Ít bài tập (&lt;2)
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Sort Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <SortAsc className="w-4 h-4" />
                                    Sắp xếp
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Sắp xếp theo</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSortOption("name-asc")}>
                                    <span className={sortOption === "name-asc" ? "font-medium" : ""}>
                                        Tên A-Z
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("name-desc")}>
                                    <span className={sortOption === "name-desc" ? "font-medium" : ""}>
                                        Tên Z-A
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("exercises-desc")}>
                                    <span className={sortOption === "exercises-desc" ? "font-medium" : ""}>
                                        Nhiều bài tập nhất
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOption("exercises-asc")}>
                                    <span className={sortOption === "exercises-asc" ? "font-medium" : ""}>
                                        Ít bài tập nhất
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-2">
                                <X className="w-4 h-4" />
                                Xóa bộ lọc
                            </Button>
                        )}
                    </div>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {searchQuery.trim() && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Tìm kiếm: &quot;{searchQuery}&quot;
                                <button onClick={() => setSearchQuery("")} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {filterOption !== "all" && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Lọc: {
                                    filterOption === "high-exercise" ? "Nhiều bài tập" :
                                    filterOption === "medium-exercise" ? "Trung bình" :
                                    filterOption === "low-exercise" ? "Ít bài tập" : ""
                                }
                                <button onClick={() => setFilterOption("all")} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {sortOption !== "name-asc" && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Sắp xếp: {
                                    sortOption === "name-desc" ? "Tên Z-A" :
                                    sortOption === "exercises-desc" ? "Nhiều bài tập" :
                                    sortOption === "exercises-asc" ? "Ít bài tập" : ""
                                }
                                <button onClick={() => setSortOption("name-asc")} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                    </div>
                )}

                <Tabs defaultValue="grid" className="w-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Danh sách môn học ({totalChannels})
                        </h2>
                        <TabsList className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <TabsTrigger value="grid" className="flex items-center gap-2">
                                <Grid3X3 className="w-4 h-4" />
                                Lưới
                            </TabsTrigger>
                            <TabsTrigger value="list" className="flex items-center gap-2">
                                <List className="w-4 h-4" />
                                Danh sách
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Grid View */}
                    <TabsContent value="grid">
                        {filteredAndSortedChannels.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                    <FileText className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    {hasActiveFilters ? "Không tìm thấy kết quả" : "Chưa có môn học nào có bài tập"}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    {hasActiveFilters 
                                        ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả."
                                        : "Hiện tại chưa có môn học nào có bài tập được thiết lập. Hãy liên hệ giảng viên để biết thêm thông tin!"
                                    }
                                </p>
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                                        Xóa bộ lọc
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAndSortedChannels.map((channel) => (
                                    <Card key={channel.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                                        <Book className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {channel.name}
                                                        </CardTitle>
                                                    </div>
                                                </div>
                                                <Badge variant="default">
                                                    {channel.exercises.length} bài
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="py-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Số bài tập</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {channel.exercises.length}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Trạng thái</span>
                                                    <Badge 
                                                        variant="default"
                                                        className="text-xs"
                                                    >
                                                        Có sẵn
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                        
                                        <CardFooter className="pt-4">
                                            <Link href={`/servers/${serverData.id}/exercises/${channel.id}`} className="w-full">
                                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white group">
                                                    <span>Xem chi tiết</span>
                                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* List View */}
                    <TabsContent value="list">
                        {filteredAndSortedChannels.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                    <FileText className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    {hasActiveFilters ? "Không tìm thấy kết quả" : "Chưa có môn học nào có bài tập"}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    {hasActiveFilters 
                                        ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả."
                                        : "Hiện tại chưa có môn học nào có bài tập được thiết lập. Hãy liên hệ giảng viên để biết thêm thông tin!"
                                    }
                                </p>
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                                        Xóa bộ lọc
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredAndSortedChannels.map((channel) => (
                                    <div 
                                        key={channel.id}
                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                                    <Book className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {channel.name}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                                        {channel.exercises.length} bài tập có sẵn
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <Badge 
                                                    variant="default"
                                                    className="px-3 py-1"
                                                >
                                                    {channel.exercises.length} bài tập
                                                </Badge>
                                                
                                                <Link href={`/servers/${serverData.id}/exercises/${channel.id}`}>
                                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white group">
                                                        <span>Xem chi tiết</span>
                                                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default ExercisePageClient;
