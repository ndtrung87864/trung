import { db } from "@/lib/db";
import Link from "next/link";
import { Book, ChevronRight, FileText, Search, Grid3X3, List, BookOpen, Trophy, Clock, Users, Filter, SortAsc } from "lucide-react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ExamPageClient from "@/components/exam/exam-page";

interface ServerIdPageProps {
    params: Promise<{
        serverId: string;
    }>;
}
interface ServerIdPageProps {
    params: Promise<{
        serverId: string;
    }>;
}

const ExamPage = async ({ params }: ServerIdPageProps) => {
    const profile = await currentProfile();

    if (!profile) {
        return redirect("/");
    }

    const { serverId } = await params;
    
    // Using your existing query logic to fetch channels with exams
    const serverData = await db.server.findMany({
        where: { id: serverId },
        include: {
            channels: {
                where: { 
                    type: "TEXT",
                    NOT: {
                        name: "general"
                    }
                },
                include: {
                    exams: true,
                }
            },
        }
    });
    
    // Get the server (should only be one since we're querying by ID)
    const server = serverData[0];
    
    if (!server) {
        return redirect("/servers");
    }

    return <ExamPageClient serverData={server} />;
}

export default ExamPage;

// const ExamPage = async ({ params }: ServerIdPageProps) => {
//     const profile = await currentProfile();

//     if (!profile) {
//         return redirect("/");
//     }

//     const { serverId } = await params;
    
//     // Using your existing query logic to fetch channels with exams
//     const serverData = await db.server.findMany({
//         where: { id: serverId },
//         include: {
//             channels: {
//                 where: { 
//                     type: "TEXT",
//                     NOT: {
//                         name: "general"
//                     }
//                 },
//                 include: {
//                     exams: true,
//                 }
//             },
//         }
//     });
    
//     // Get the server (should only be one since we're querying by ID)
//     const server = serverData[0];
    
//     if (!server) {
//         return redirect("/servers");
//     }
    
//     // Count total exams across all channels
//     const totalExams = server.channels.reduce((sum, channel) => sum + channel.exams.length, 0);
//     const totalChannels = server.channels.length;
//     const averageExamsPerChannel = totalChannels > 0 ? (totalExams / totalChannels).toFixed(1) : 0;

//     return (
//         <div className="flex-1 bg-gray-50 dark:bg-gray-900">
//             {/* Header Section */}
//             <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
//                 <div className="px-6 py-6">
//                     {/* <div className="flex items-center justify-between mb-6">
//                         <div>
//                             <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
//                                 {server.name}
//                             </h1>
//                             <p className="text-gray-600 dark:text-gray-400">
//                                 Khám phá và thực hành với bộ sưu tập bài kiểm tra đa dạng từ các môn học khác nhau
//                             </p>
//                         </div>
//                         <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
//                             <BookOpen className="w-4 h-4 mr-2" />
//                             Hệ thống quản lý bài kiểm tra
//                         </Button>
//                     </div> */}

//                     {/* Stats Row */}
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                         <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
//                             <div className="flex items-center">
//                                 <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
//                                     <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
//                                 </div>
//                                 <div className="ml-4">
//                                     <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalExams}</p>
//                                     <p className="text-blue-600 dark:text-blue-400 text-sm">Tổng bài kiểm tra</p>
//                                 </div>
//                             </div>
//                         </div>
                        
//                         <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
//                             <div className="flex items-center">
//                                 <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
//                                     <Book className="w-5 h-5 text-purple-600 dark:text-purple-400" />
//                                 </div>
//                                 <div className="ml-4">
//                                     <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{totalChannels}</p>
//                                     <p className="text-purple-600 dark:text-purple-400 text-sm">Môn học</p>
//                                 </div>
//                             </div>
//                         </div>
                        
//                         <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
//                             <div className="flex items-center">
//                                 <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
//                                     <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
//                                 </div>
//                                 <div className="ml-4">
//                                     <p className="text-2xl font-bold text-green-900 dark:text-green-100">{averageExamsPerChannel}</p>
//                                     <p className="text-green-600 dark:text-green-400 text-sm">Trung bình/môn</p>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Content Section */}
//             <div className="px-6 py-6">
//                 {/* Search and Controls */}
//                 <div className="flex flex-col lg:flex-row gap-4 mb-6">
//                     <div className="flex-1">
//                         <div className="relative">
//                             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//                             <Input 
//                                 type="search"
//                                 placeholder="Tìm kiếm môn học, bài kiểm tra..." 
//                                 className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
//                             />
//                         </div>
//                     </div>
                    
//                     <div className="flex gap-2">
//                         <Button variant="outline" size="sm" className="flex items-center gap-2">
//                             <Filter className="w-4 h-4" />
//                             Lọc
//                         </Button>
//                         <Button variant="outline" size="sm" className="flex items-center gap-2">
//                             <SortAsc className="w-4 h-4" />
//                             Sắp xếp
//                         </Button>
//                     </div>
//                 </div>

//                 <Tabs defaultValue="grid" className="w-full">
//                     <div className="flex justify-between items-center mb-6">
//                         <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
//                             Danh sách môn học ({totalChannels})
//                         </h2>
//                         <TabsList className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
//                             <TabsTrigger value="grid" className="flex items-center gap-2">
//                                 <Grid3X3 className="w-4 h-4" />
//                                 Lưới
//                             </TabsTrigger>
//                             <TabsTrigger value="list" className="flex items-center gap-2">
//                                 <List className="w-4 h-4" />
//                                 Danh sách
//                             </TabsTrigger>
//                         </TabsList>
//                     </div>

//                     {/* Grid View */}
//                     <TabsContent value="grid">
//                         {server.channels.length === 0 ? (
//                             <div className="text-center py-16">
//                                 <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
//                                     <FileText className="w-10 h-10 text-gray-400" />
//                                 </div>
//                                 <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
//                                     Chưa có môn học nào
//                                 </h3>
//                                 <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
//                                     Lớp học này chưa có môn học nào được thiết lập. Hãy thêm môn học đầu tiên để bắt đầu!
//                                 </p>
//                             </div>
//                         ) : (
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                                 {server.channels.map((channel, index) => (
//                                     <Card key={channel.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group">
//                                         <CardHeader className="pb-4">
//                                             <div className="flex items-center justify-between">
//                                                 <div className="flex items-center gap-3">
//                                                     <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
//                                                         <Book className="w-5 h-5 text-blue-600 dark:text-blue-400" />
//                                                     </div>
//                                                     <div>
//                                                         <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
//                                                             {channel.name}
//                                                         </CardTitle>
//                                                     </div>
//                                                 </div>
//                                                 <Badge variant={channel.exams.length > 0 ? "default" : "secondary"}>
//                                                     {channel.exams.length} bài
//                                                 </Badge>
//                                             </div>
//                                         </CardHeader>
                                        
//                                         <CardContent className="py-4">
//                                             <div className="space-y-3">
//                                                 <div className="flex justify-between text-sm">
//                                                     <span className="text-gray-600 dark:text-gray-400">Số bài kiểm tra</span>
//                                                     <span className="font-medium text-gray-900 dark:text-white">
//                                                         {channel.exams.length}
//                                                     </span>
//                                                 </div>
//                                                 <div className="flex justify-between text-sm">
//                                                     <span className="text-gray-600 dark:text-gray-400">Trạng thái</span>
//                                                     <Badge 
//                                                         variant={channel.exams.length > 0 ? "default" : "secondary"}
//                                                         className="text-xs"
//                                                     >
//                                                         {channel.exams.length > 0 ? "Có sẵn" : "Trống"}
//                                                     </Badge>
//                                                 </div>
//                                             </div>
//                                         </CardContent>
                                        
//                                         <CardFooter className="pt-4">
//                                             <Link href={`/servers/${serverId}/exams/${channel.id}`} className="w-full">
//                                                 <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white group">
//                                                     <span>Xem chi tiết</span>
//                                                     <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
//                                                 </Button>
//                                             </Link>
//                                         </CardFooter>
//                                     </Card>
//                                 ))}
//                             </div>
//                         )}
//                     </TabsContent>

//                     {/* List View */}
//                     <TabsContent value="list">
//                         {server.channels.length === 0 ? (
//                             <div className="text-center py-16">
//                                 <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
//                                     <FileText className="w-10 h-10 text-gray-400" />
//                                 </div>
//                                 <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
//                                     Chưa có môn học nào
//                                 </h3>
//                                 <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
//                                     Lớp học này chưa có môn học nào được thiết lập. Hãy thêm môn học đầu tiên để bắt đầu!
//                                 </p>
//                             </div>
//                         ) : (
//                             <div className="space-y-4">
//                                 {server.channels.map((channel, index) => (
//                                     <div 
//                                         key={channel.id}
//                                         className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-all duration-200"
//                                     >
//                                         <div className="flex items-center justify-between">
//                                             <div className="flex items-center gap-4">
//                                                 <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
//                                                     <Book className="w-6 h-6 text-blue-600 dark:text-blue-400" />
//                                                 </div>
//                                                 <div>
//                                                     <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
//                                                         {channel.name}
//                                                     </h3>
//                                                     <p className="text-gray-600 dark:text-gray-400 text-sm">
//                                                         {channel.exams.length} bài kiểm tra có sẵn
//                                                     </p>
//                                                 </div>
//                                             </div>
                                            
//                                             <div className="flex items-center gap-4">
//                                                 <Badge 
//                                                     variant={channel.exams.length > 0 ? "default" : "secondary"}
//                                                     className="px-3 py-1"
//                                                 >
//                                                     {channel.exams.length} bài kiểm tra
//                                                 </Badge>
                                                
//                                                 <Link href={`/servers/${serverId}/exams/${channel.id}`}>
//                                                     <Button className="bg-blue-600 hover:bg-blue-700 text-white group">
//                                                         <span>Xem chi tiết</span>
//                                                         <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
//                                                     </Button>
//                                                 </Link>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </TabsContent>
//                 </Tabs>
//             </div>
//         </div>
//     );
// }

// export default ExamPage;