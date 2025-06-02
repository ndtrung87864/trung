"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";

interface ExamSearchProps {
  data: {
    label: string;
    type: "server" | "channel";
    data: {
      id: string;
      name: string;
      icon?: React.ReactNode;
      serverName?: string;
      serverId?: string;
    }[] | null;
  }[]
}

export const ExamSearch = ({
  data
}: ExamSearchProps) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    }

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const onClick = ({ id, type }: { id: string, type: string }) => {
    setOpen(false);

    if (type === "server") {
      return router.push(`/exams?serverId=${id}`);
    }

    if (type === "channel") {
      // Extract the server ID from the data
      const channelData = data
        .find(group => group.type === "channel")
        ?.data?.find(item => item.id === id);
      
      // If we can find the server ID associated with this channel, include it in the URL
      const serverId = channelData?.serverId;
      
      if (serverId) {
        return router.push(`/exams?serverId=${serverId}&channelId=${id}`);
      } else {
        return router.push(`/exams?channelId=${id}`);
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group px-2 py-2 rounded-md flex items-center w-full gap-x-2
        hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition"
      >
        <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        
        <p className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition">
          Tìm kiếm
        </p>
        
        <kbd
            className="pointer-events-none inline-flex h-5 select-none items-center
                    gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]
                    font-medium text-muted-foreground ml-auto"
        >
            <span className="text-xs">CTRL</span>K
        </kbd>
      </button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex justify-center pt-4">
          <DialogTitle className="text-center font-semibold">Tìm kiếm</DialogTitle>
        </div>
        <CommandInput placeholder="Tìm kiếm lớp học, kênh..." />
        <CommandList>
          <CommandEmpty>
            Không tìm thấy kết quả
          </CommandEmpty>
          {data.map(({ label, type, data }) => {
            if (!data?.length) return null;

            return (
              <CommandGroup key={label} heading={label}>
                {data?.map(({ id, name, icon, serverName }) => {
                  return (
                    <CommandItem
                      key={id}
                      onSelect={() => onClick({ id, type })}
                    >
                      {icon}
                      <span className="ml-2">{name}</span>
                      {serverName && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({serverName})
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  )
};
