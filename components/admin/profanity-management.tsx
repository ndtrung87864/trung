"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, BarChart3, List, AlertTriangle } from "lucide-react";
import { ProfanityStats } from "./profanity-stats";
import { ProfanityWords } from "./profanity-words";
import { ProfanityViolations } from "./profanity-violations";
import { useModal } from "@/hooks/use-modal-store";

export const ProfanityManagement = () => {
    const [activeTab, setActiveTab] = useState("stats");
    const { onOpen } = useModal();

    return (
        <div className="flex flex-col h-full">
            {/* Header - fixed */}
            <div className="p-8 pb-0 pt-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold tracking-tight">Quản lý từ cấm</h2>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <div className="sticky top-0 z-10 bg-background pb-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="stats" className="flex items-center gap-2" onClick={() => setActiveTab("stats")}>
                                <BarChart3 className="h-4 w-4" />
                                Thống kê
                            </TabsTrigger>
                            <TabsTrigger value="words" className="flex items-center gap-2" onClick={() => setActiveTab("words")}>
                                <List className="h-4 w-4" />
                                Quản lý từ cấm
                            </TabsTrigger>
                            <TabsTrigger value="violations" className="flex items-center gap-2" onClick={() => setActiveTab("violations")}>
                                <AlertTriangle className="h-4 w-4" />
                                Vi phạm
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 px-8 pb-8 overflow-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsContent value="stats" className="space-y-4">
                        <ProfanityStats />
                    </TabsContent>

                    <TabsContent value="words" className="space-y-4">
                        <ProfanityWords />
                    </TabsContent>

                    <TabsContent value="violations" className="space-y-4">
                        <ProfanityViolations />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};