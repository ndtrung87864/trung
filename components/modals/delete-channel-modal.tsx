"use client";

import qs from "query-string";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";



export const DeleteChannelModal = () => {
    const { isOpen, onClose, type, data } = useModal();
    const router = useRouter();

    const isModalOpen = isOpen && type === "deleteChannel";
    const { server, channel } = data;

    const [isLoading, setIsLoading] = useState(false);

    const handleDeleteChannel = async () => {
        try {
            setIsLoading(true);
            const url = qs.stringifyUrl({
                url: `/api/channels/${channel?.id}`,
                query: {
                    serverId: server?.id,
                }
            });

            await axios.delete(url);
            router.push(`/servers/${server?.id}`);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            router.refresh();
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white text-black p-0 overflow-hidden">
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Xóa kênh
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-500">
                        Bạn có chắc chắn muốn làm điều này? <br />
                        Lớp <span className="text-indigo-500 font-semibold"> #{channel?.name}</span> sẽ bị xóa vĩnh viễn.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="bg-gray-100 px-6 py-4">
                    <div className="flex items-center justify-between w-full">
                        <Button
                            disabled={isLoading}
                            onClick={onClose}
                            variant="ghost"
                        >
                            Hủy
                        </Button>
                        <Button
                            disabled={isLoading}
                            onClick={handleDeleteChannel}
                            variant="primary"
                        >
                            Xác nhận
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};