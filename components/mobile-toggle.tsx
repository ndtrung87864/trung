"use client";

import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerSidebar } from "@/components/server/server-sidebar-client";
import { useEffect, useState } from "react";

interface MobileToggleProps {
  serverId: string;
}

export const MobileToggle = ({
  serverId
}: MobileToggleProps) => {
  const [serverData, setServerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        const response = await fetch(`/api/servers/${serverId}`);
        if (!response.ok) throw new Error("Failed to fetch server data");
        const data = await response.json();
        setServerData(data);
      } catch (error) {
        console.error("Error fetching server data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (serverId) {
      fetchServerData();
    }
  }, [serverId]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 flex gap-0">
        <div className="w-[72px]">
          <ServerSidebar serverId={serverId} />
        </div>
        <Separator orientation="vertical" />
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : serverData ? (
            <ServerSidebar 
              serverId={serverId} 
              serverData={serverData} 
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Server not found</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};