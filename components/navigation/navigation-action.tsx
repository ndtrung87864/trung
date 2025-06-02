"use client";

import { Plus, Shield } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

export const NavigatorAction = () => {
    const { onOpen } = useModal();
    return (
        <div className="flex flex-col items-center w-full gap-y-2">
            <ActionTooltip
                side="right"
                align="center"
                label="Thêm mới lớp học"
            >
                <button
                    onClick={() => onOpen("createServer")}
                    className="group flex items-center"
                >
                    <div className="flex md-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] 
                transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700
                group-hover:bg-emerald-500"
                    >
                        <Plus
                            className="group-hover:text-white transition text-emerald-500"
                            size={25}
                        />
                    </div>
                </button>
            </ActionTooltip>
        </div>
    )
}
