"use client";

import qs from "query-string";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Video, VideoOff } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";

export const ChatVideoButton = () => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const isVideo = searchParams?.get("video");

    const onClick = () => {
        const url = qs.stringifyUrl({
            url: pathname || "",
            query: {
                video: isVideo ? undefined : true,
            },
        }, { skipEmptyString: true });
        
        router.push(url);
    }

    const Icon = isVideo ? VideoOff : Video;
    const tooltipLable = isVideo ? "Kết thúc cuộc gọi" : "Bắt đầu cuộc gọi";
    return (
        <ActionTooltip side="bottom" label={tooltipLable}>
            <button onClick={onClick} className="hover:opacity-75 transition mr-4">
                <Icon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
            </button>
        </ActionTooltip>
    )
}