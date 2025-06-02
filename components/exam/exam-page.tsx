"use client";

import Link from "next/link";
import { Book, ChevronRight, FileText, Search, Grid3X3, List, Trophy, Filter, SortAsc, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Channel {
    id: string;
    name: string;
    exams: Array<{ id: string; title?: string; }>;
}

interface Server {
    id: string;
    name: string;
    channels: Channel[];
}

interface ExamPageProps {
    serverData: Server;
}

const ExamPageClient = ({ serverData }: ExamPageProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "examCount" | "newest">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [filterBy, setFilterBy] = useState<"all" | "hasExams" | "empty">("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const server = serverData;
    
    // Count total exams across all channels
    const totalExams = server.channels.reduce((sum, channel) => sum + channel.exams.length, 0);
    const totalChannels = server.channels.length;
    const averageExamsPerChannel = totalChannels > 0 ? (totalExams / totalChannels).toFixed(1) : 0;

    // Filter and sort channels
    const filteredAndSortedChannels = useMemo(() => {
        let filtered = server.channels;

        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(channel =>
                channel.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        switch (filterBy) {
            case "hasExams":
                filtered = filtered.filter(channel => channel.exams.length > 0);
                break;
            case "empty":
                filtered = filtered.filter(channel => channel.exams.length === 0);
                break;
            // "all" case doesn't need filtering
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "examCount":
                    comparison = a.exams.length - b.exams.length;
                    break;
                case "newest":
                    // Assuming we want to sort by creation date, but since it's not available,
                    // we'll sort by name as fallback
                    comparison = a.name.localeCompare(b.name);
                    break;
            }
            
            return sortOrder === "desc" ? -comparison : comparison;
        });

        return filtered;
    }, [server.channels, searchTerm, filterBy, sortBy, sortOrder]);

    const clearFilters = () => {
        setSearchTerm("");
        setFilterBy("all");
        setSortBy("name");
        setSortOrder("asc");
    };

    const hasActiveFilters = searchTerm.trim() || filterBy !== "all" || sortBy !== "name" || sortOrder !== "asc";

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
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalExams}</p>
                                    <p className="text-blue-600 dark:text-blue-400 text-sm">Tổng bài kiểm tra</p>
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
                                    <p className="text-purple-600 dark:text-purple-400 text-sm">Môn học</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                                    <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{averageExamsPerChannel}</p>
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
                                placeholder="Tìm kiếm môn học, bài kiểm tra..." 
                                className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Filter Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Lọc
                                    {filterBy !== "all" && (
                                        <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                                            1
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Lọc theo trạng thái</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => setFilterBy("all")}
                                    className={filterBy === "all" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Tất cả môn học
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => setFilterBy("hasExams")}
                                    className={filterBy === "hasExams" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Có bài kiểm tra
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => setFilterBy("empty")}
                                    className={filterBy === "empty" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Chưa có bài kiểm tra
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Sort Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <SortAsc className="w-4 h-4" />
                                    Sắp xếp
                                    {(sortBy !== "name" || sortOrder !== "asc") && (
                                        <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                                            1
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Sắp xếp theo</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => {setSortBy("name"); setSortOrder("asc");}}
                                    className={sortBy === "name" && sortOrder === "asc" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Tên A-Z
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => {setSortBy("name"); setSortOrder("desc");}}
                                    className={sortBy === "name" && sortOrder === "desc" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Tên Z-A
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => {setSortBy("examCount"); setSortOrder("desc");}}
                                    className={sortBy === "examCount" && sortOrder === "desc" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Nhiều bài kiểm tra nhất
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => {setSortBy("examCount"); setSortOrder("asc");}}
                                    className={sortBy === "examCount" && sortOrder === "asc" ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                                >
                                    Ít bài kiểm tra nhất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Clear filters button */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Xóa bộ lọc
                            </Button>
                        )}
                    </div>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {searchTerm && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                Tìm kiếm: &quot;{searchTerm}&quot;
                                <button onClick={() => setSearchTerm("")}>
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {filterBy !== "all" && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                Lọc: {filterBy === "hasExams" ? "Có bài kiểm tra" : "Chưa có bài kiểm tra"}
                                <button onClick={() => setFilterBy("all")}>
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                        {(sortBy !== "name" || sortOrder !== "asc") && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                Sắp xếp: {
                                    sortBy === "name" ? (sortOrder === "asc" ? "Tên A-Z" : "Tên Z-A") :
                                    sortBy === "examCount" ? (sortOrder === "desc" ? "Nhiều bài nhất" : "Ít bài nhất") :
                                    "Mới nhất"
                                }
                                <button onClick={() => {setSortBy("name"); setSortOrder("asc");}}>
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                    </div>
                )}

                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "list")} className="w-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Danh sách môn học ({filteredAndSortedChannels.length}/{totalChannels})
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
                                    {server.channels.length === 0 ? "Chưa có môn học nào" : "Không tìm thấy kết quả"}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    {server.channels.length === 0 
                                        ? "Lớp học này chưa có môn học nào được thiết lập. Hãy thêm môn học đầu tiên để bắt đầu!"
                                        : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để tìm thấy môn học bạn đang tìm."
                                    }
                                </p>
                                {hasActiveFilters && (
                                    <Button onClick={clearFilters} className="mt-4" variant="outline">
                                        Xóa tất cả bộ lọc
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
                                                <Badge variant={channel.exams.length > 0 ? "default" : "secondary"}>
                                                    {channel.exams.length} bài
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        
                                        <CardContent className="py-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Số bài kiểm tra</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {channel.exams.length}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Trạng thái</span>
                                                    <Badge 
                                                        variant={channel.exams.length > 0 ? "default" : "secondary"}
                                                        className="text-xs"
                                                    >
                                                        {channel.exams.length > 0 ? "Có sẵn" : "Trống"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                        
                                        <CardFooter className="pt-4">
                                            <Link href={`/servers/${server.id}/exams/${channel.id}`} className="w-full">
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
                                    {server.channels.length === 0 ? "Chưa có môn học nào" : "Không tìm thấy kết quả"}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    {server.channels.length === 0 
                                        ? "Lớp học này chưa có môn học nào được thiết lập. Hãy thêm môn học đầu tiên để bắt đầu!"
                                        : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để tìm thấy môn học bạn đang tìm."
                                    }
                                </p>
                                {hasActiveFilters && (
                                    <Button onClick={clearFilters} className="mt-4" variant="outline">
                                        Xóa tất cả bộ lọc
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
                                                        {channel.exams.length} bài kiểm tra có sẵn
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <Badge 
                                                    variant={channel.exams.length > 0 ? "default" : "secondary"}
                                                    className="px-3 py-1"
                                                >
                                                    {channel.exams.length} bài kiểm tra
                                                </Badge>
                                                
                                                <Link href={`/servers/${server.id}/exams/${channel.id}`}>
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
}

export default ExamPageClient;