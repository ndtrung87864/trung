import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SubjectSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedServerId: string | null;
    onServerSelect: (serverId: string) => void;
    onSubjectSelect: (channelId: string) => void;
    currentExamChannelId?: string;
    currentServerId?: string | "all";
    serverOptions: [string, string][];
    serverChannels: { [key: string]: { id: string; name: string }[] };
}

export default function SubjectSelectionDialog({
    open,
    onOpenChange,
    selectedServerId,
    onServerSelect,
    onSubjectSelect,
    currentExamChannelId,
    currentServerId,
    serverOptions,
    serverChannels
}: SubjectSelectionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Chọn môn học</DialogTitle>
                    <DialogDescription>
                        {currentServerId && currentServerId !== "all" 
                            ? "Chọn môn học từ lớp học này" 
                            : "Chọn lớp học và môn học tương ứng"}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-2 py-2">
                    {/* Left column - Classes/Servers - Only show if not in a specific server context */}
                    <div className={`border rounded-md p-1 ${currentServerId && currentServerId !== "all" ? 'hidden' : ''}`}>
                        <h3 className="text-sm font-medium mb-1 px-1">Lớp học</h3>
                        <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
                            {serverOptions.map(([serverId, serverName]) => (
                                <Button
                                    key={serverId}
                                    variant={selectedServerId === serverId ? "secondary" : "ghost"}
                                    className="w-full justify-start h-8 text-xs px-2"
                                    onClick={() => onServerSelect(serverId)}
                                >
                                    {serverName}
                                </Button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Right column - Subjects/Channels */}
                    <div className={`border rounded-md p-1 ${currentServerId && currentServerId !== "all" ? 'col-span-2' : ''}`}>
                        <h3 className="text-sm font-medium mb-1 px-1">Môn học</h3>
                        <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
                            {selectedServerId ? (
                                serverChannels[selectedServerId]?.map(channel => (
                                    <Button
                                        key={channel.id}
                                        variant={currentExamChannelId === channel.id ? "secondary" : "ghost"}
                                        className="w-full justify-start h-8 text-xs px-2"
                                        onClick={() => onSubjectSelect(channel.id)}
                                    >
                                        {channel.name}
                                    </Button>
                                )) || (
                                    <p className="text-xs text-muted-foreground p-1">
                                        Không có môn học nào
                                    </p>
                                )
                            ) : (
                                <p className="text-xs text-muted-foreground p-1">
                                    {currentServerId && currentServerId !== "all" 
                                        ? "Đang tải môn học..." 
                                        : "Chọn lớp học trước"}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                <DialogFooter className="pt-1">
                    <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                        Đóng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
