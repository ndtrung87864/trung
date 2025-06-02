"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import axios from "axios";

interface ExerciseSubjectSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedServerId?: string;
    onServerSelect: (serverId: string) => void;
    onSubjectSelect: (channelId: string, channelName: string) => void; // Modified to include channelName
    currentExerciseChannelId?: string;
    currentServerId?: string;
    serverOptions: [string, string][]; // [serverId, serverName]
    serverChannels: Record<string, { id: string; name: string; type: string }[]>;
    serverSelectionDisabled?: boolean; // New prop to disable server selection
}

export default function ExerciseSubjectSelectionDialog({
    open,
    onOpenChange,
    selectedServerId,
    onServerSelect,
    onSubjectSelect,
    currentExerciseChannelId,
    currentServerId,
    serverOptions = [],
    serverChannels = {},
    serverSelectionDisabled = false,
}: ExerciseSubjectSelectionDialogProps) {
    // Track the local selected server to manage the UI state
    const [localSelectedServerId, setLocalSelectedServerId] = useState<string | undefined>(selectedServerId || currentServerId);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [localServerOptions, setLocalServerOptions] = useState<[string, string][]>(serverOptions || []);
    const [localServerChannels, setLocalServerChannels] = useState<Record<string, { id: string; name: string; type: string }[]>>(serverChannels || {});
    
    // Keep track of whether server is restricted to a specific ID from URL
    const [isServerRestricted, setIsServerRestricted] = useState(false);
    const [restrictedServerId, setRestrictedServerId] = useState<string | undefined>(undefined);
    
    // Update the local selected server when the prop changes
    useEffect(() => {
        setLocalSelectedServerId(selectedServerId || currentServerId);
        
        // If serverSelectionDisabled is true, it likely means we have a URL-specified serverId
        // Instead of disabling the dropdown completely, we'll filter to only show that server
        if (serverSelectionDisabled && selectedServerId) {
            setIsServerRestricted(true);
            setRestrictedServerId(selectedServerId);
        }
    }, [selectedServerId, currentServerId, serverSelectionDisabled]);
    
    // Get filtered channels for the currently selected server - exclude "general" channels
    const availableChannels = localSelectedServerId 
        ? (localServerChannels[localSelectedServerId] || [])
            .filter(channel => 
                channel.type === "TEXT" && 
                channel.name.toLowerCase() !== "general"
            )
        : [];
    
    // Fetch servers for the current user
    // Define server data type
    interface ServerData {
        id: string;
        name: string;
    }
    
    const fetchUserServers = async () => {
        setIsLoading(true);
        setLoadingError(null);
        try {
            // Modify the API call to filter by serverId if restricted
            const endpoint = restrictedServerId 
                ? `/api/servers?serverId=${restrictedServerId}` 
                : "/api/servers";
            
            const res = await axios.get<ServerData[]>(endpoint, {
                headers: { 'Cache-Control': 'no-cache' },
                timeout: 5000 // 5 second timeout
            });
            if (res.data && Array.isArray(res.data)) {
                // Transform server data to [id, name] format
                const options: [string, string][] = res.data.map((server: ServerData) => [server.id, server.name]);
                setLocalServerOptions(options);
                
                // If no server is selected but we have servers, select the first one
                if (!localSelectedServerId && options.length > 0) {
                    setLocalSelectedServerId(options[0][0]);
                    onServerSelect(options[0][0]);
                }
            }
        } catch (error) {
            console.error("Error fetching servers:", error);
            setLoadingError("Không thể tải danh sách lớp học");
        } finally {
            setIsLoading(false);
        }
    };

    // Define a type for the channel data
    interface ChannelData {
        id: string;
        name: string;
        type: string;
    }
    
    // Fetch channels for a selected server
    const fetchServerChannels = async (serverId: string) => {
        if (!serverId) return;
        
        // If we already have channels for this server, don't fetch again
        if (localServerChannels[serverId] && localServerChannels[serverId].length > 0) {
            return;
        }
        
        setIsLoading(true);
        setLoadingError(null);
        
        try {
            const res = await axios.get<ChannelData[]>(`/api/servers/${serverId}/channels`, {
                headers: { 'Cache-Control': 'no-cache' },
                timeout: 5000 // 5 second timeout
            });
            
            if (res.data) {
                // Filter to include all TEXT channels except "general"
                const channels = res.data
                    .filter((channel: ChannelData) => 
                        channel.type === "TEXT" && 
                        channel.name.toLowerCase() !== "general"
                    );
                
                setLocalServerChannels(prev => ({
                    ...prev,
                    [serverId]: channels
                }));
            }
        } catch (error) {
            console.error(`Error fetching channels for server ${serverId}:`, error);
            setLoadingError(`Không thể tải danh sách môn học cho lớp này`);
            
            // Set empty channels to prevent continuous loading attempts
            setLocalServerChannels(prev => ({
                ...prev,
                [serverId]: []
            }));
        } finally {
            setIsLoading(false);
        }
    };

    // Load servers when dialog opens
    useEffect(() => {
        if (!open) return;
        
        // Use serverOptions if available, otherwise fetch from API
        if (!serverOptions || serverOptions.length === 0) {
            fetchUserServers();
        } else {
            setLocalServerOptions(serverOptions);
            
            // If no server is selected but we have a current server, select it
            if (!localSelectedServerId && currentServerId) {
                setLocalSelectedServerId(currentServerId);
            }
            
            // If we already have a selected server, immediately fetch its channels
            if (selectedServerId || currentServerId) {
                const serverToUse = selectedServerId || currentServerId;
                if (serverToUse) {
                    // Slight delay to ensure state updates complete
                    setTimeout(() => fetchServerChannels(serverToUse), 0);
                }
            }
        }
    }, [open, serverOptions, selectedServerId, currentServerId]);

    // Load channels when server is selected
    useEffect(() => {
        if (!localSelectedServerId || !open) return;
        fetchServerChannels(localSelectedServerId);
    }, [localSelectedServerId, open]);
    
    // Handler for selecting a server
    const handleServerSelect = (serverId: string) => {
        setLocalSelectedServerId(serverId);
        onServerSelect(serverId);
    };
    
    // Handler for selecting a channel (subject)
    const handleChannelSelect = (channel: { id: string; name: string }) => {
        // Find the server name for display
        const serverName = localServerOptions.find(option => option[0] === localSelectedServerId)?.[1] || "";
        
        // Pass both channel ID and name to the parent component
        onSubjectSelect(channel.id, `${channel.name} [${serverName}]`);
        onOpenChange(false); // Close dialog after selection
    };

    // Retry loading button handler
    const handleRetryLoading = () => {
        if (localSelectedServerId) {
            fetchServerChannels(localSelectedServerId);
        } else {
            fetchUserServers();
        }
    };

    // Filter server options if we're restricted to a specific server
    const filteredServerOptions = isServerRestricted && restrictedServerId
        ? localServerOptions.filter(([serverId]) => serverId === restrictedServerId)
        : localServerOptions;
    
    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Chọn lớp và môn học</DialogTitle>
                    <DialogDescription>
                        {isServerRestricted 
                            ? "Chọn môn học từ lớp học đã chỉ định"
                            : "Chọn lớp học và môn học cho bài tập này"}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Lớp học:</h3>
                        <Select 
                            value={localSelectedServerId} 
                            onValueChange={handleServerSelect}
                            disabled={isLoading || isServerRestricted}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={isLoading ? "Đang tải..." : "Chọn lớp học"} />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredServerOptions.map(([serverId, serverName]) => (
                                    <SelectItem key={serverId} value={serverId}>
                                        {serverName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isServerRestricted && (
                            <p className="text-xs text-blue-600">
                                Lớp học đã được chỉ định từ URL
                            </p>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Môn học:</h3>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-md">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                <p className="text-sm text-muted-foreground">Đang tải danh sách môn học...</p>
                            </div>
                        ) : loadingError ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-destructive/10 rounded-md">
                                <p className="text-sm text-destructive mb-2">{loadingError}</p>
                                <Button 
                                    size="sm" 
                                    onClick={handleRetryLoading}
                                >
                                    Tải lại
                                </Button>
                            </div>
                        ) : localSelectedServerId ? (
                            availableChannels.length > 0 ? (
                                <ScrollArea className="h-[200px]">
                                    <div className="space-y-1">
                                        {availableChannels.map(channel => (
                                            <Button 
                                                key={channel.id}
                                                variant={channel.id === currentExerciseChannelId ? "default" : "outline"}
                                                className="w-full justify-start"
                                                onClick={() => handleChannelSelect(channel)}
                                            >
                                                {channel.name}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center p-4">
                                    Không có môn học nào trong lớp này.
                                </p>
                            )
                        ) : (
                            <p className="text-sm text-muted-foreground text-center p-4">
                                Vui lòng chọn lớp học trước.
                            </p>
                        )}
                    </div>
                </div>
                
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Hủy bỏ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
