"use client";

import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ExerciseSearchProps {
    onSearch: (searchTerm: string, statusFilter: string) => void;
}

export const ExerciseSearch = ({}: ExerciseSearchProps) => {
    return (
        <div className="flex items-center gap-4 opacity-70">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm bài tập..."
                    className="pl-9"
                    disabled
                />
            </div>

            <Button variant="outline" size="sm" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Bộ lọc
            </Button>
        </div>
    );
};
