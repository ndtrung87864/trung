"use client";

import axios from "axios";
import qs from "query-string";
import {
    Check,
    Clock,
    Loader2,
    X,
    UserCheck,
    UserX,
    AlertCircle
} from "lucide-react";
import { useState } from "react";
import { MemberStatus } from "@prisma/client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { useModal } from "@/hooks/use-modal-store";
import { ServerWithMembersWithProfile } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/user-avatar";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const PendingMembersModal = () => {
    const router = useRouter();
    const { onOpen, isOpen, onClose, type, data } = useModal();
    const [loadingId, setLoadingId] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

    const isModalOpen = isOpen && type === "pendingMembers";
    const { server } = data as { server: ServerWithMembersWithProfile };

    // Lọc chỉ những member có status PENDING
    const pendingMembers = server?.members?.filter(member => member.status === "PENDING") || [];

    const onApprove = async (memberId: string) => {
        try {
            setLoadingId(memberId);
            const url = qs.stringifyUrl({
                url: `/api/servers/${server.id}/members/${memberId}/approve`,
                query: {
                    serverId: server.id,
                }
            });

            const response = await axios.patch(url);
            router.refresh();
            onOpen("pendingMembers", { server: response.data });
            toast.success("Đã duyệt thành viên thành công!");
        } catch (error) {
            console.error(error);
            toast.error("Có lỗi xảy ra khi duyệt thành viên!");
        } finally {
            setLoadingId("");
        }
    };

    const onReject = async (memberId: string) => {
        try {
            setLoadingId(memberId);
            const url = qs.stringifyUrl({
                url: `/api/servers/${server.id}/members/${memberId}/reject`,
                query: {
                    serverId: server.id,
                }
            });

            const response = await axios.patch(url, { 
                reason: rejectReason || "Không phù hợp với server" 
            });
            
            router.refresh();
            onOpen("pendingMembers", { server: response.data });
            setRejectReason("");
            setShowRejectInput(null);
            toast.success("Đã từ chối thành viên!");
        } catch (error) {
            console.error(error);
            toast.error("Có lỗi xảy ra khi từ chối thành viên!");
        } finally {
            setLoadingId("");
        }
    };

    const formatDate = (date: Date | string | null) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleString('vi-VN');
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white text-black overflow-hidden max-w-2xl">
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Duyệt thành viên
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-500">
                        {pendingMembers.length} yêu cầu đang chờ duyệt
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="mt-8 max-h-[500px] pr-6">
                    {pendingMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Không có yêu cầu nào
                            </h3>
                            <p className="text-gray-500">
                                Hiện tại không có yêu cầu tham gia nào đang chờ duyệt.
                            </p>
                        </div>
                    ) : (
                        pendingMembers.map((member) => (
                            <div key={member.id} className="flex items-start gap-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                <UserAvatar src={member.profile.imageUrl} />
                                
                                <div className="flex-1">
                                    <div className="flex items-center gap-x-2 mb-2">
                                        <h4 className="text-sm font-semibold">
                                            {member.profile.name}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Chờ duyệt
                                        </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-zinc-500 mb-2">
                                        {member.profile.email}
                                    </p>
                                    
                                    <p className="text-xs text-zinc-400">
                                        Yêu cầu lúc: {formatDate(member.requestedAt)}
                                    </p>

                                    {/* Reject reason input */}
                                    {showRejectInput === member.id && (
                                        <div className="mt-3">
                                            <Textarea
                                                placeholder="Nhập lý do từ chối (tùy chọn)..."
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                className="mb-2"
                                                rows={2}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-col gap-y-2">
                                    {loadingId === member.id ? (
                                        <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
                                    ) : (
                                        <>
                                            {showRejectInput === member.id ? (
                                                <div className="flex gap-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => onReject(member.id)}
                                                        className="text-xs"
                                                    >
                                                        <UserX className="w-3 h-3 mr-1" />
                                                        Xác nhận từ chối
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowRejectInput(null);
                                                            setRejectReason("");
                                                        }}
                                                        className="text-xs"
                                                    >
                                                        Hủy
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => onApprove(member.id)}
                                                        className="bg-green-600 hover:bg-green-700 text-xs"
                                                    >
                                                        <UserCheck className="w-3 h-3 mr-1" />
                                                        Duyệt
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setShowRejectInput(member.id)}
                                                        className="text-xs"
                                                    >
                                                        <UserX className="w-3 h-3 mr-1" />
                                                        Từ chối
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};