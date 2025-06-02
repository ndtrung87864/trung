"use client";

import { useState, useCallback } from "react";
import axios from "axios";

interface FilterResult {
    cleanText: string;
    hasViolation: boolean;
    violationId?: string;
}

interface UseProfanityFilterReturn {
    filterText: (
        content: string,
        contextType?: string,
        contextId?: string,
        serverId?: string
    ) => Promise<FilterResult>;
    isFiltering: boolean;
    error: string | null;
}

export const useProfanityFilter = (): UseProfanityFilterReturn => {
    const [isFiltering, setIsFiltering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filterText = useCallback(async (
        content: string,
        contextType?: string,
        contextId?: string,
        serverId?: string
    ): Promise<FilterResult> => {
        if (!content || !content.trim()) {
            return {
                cleanText: content,
                hasViolation: false
            };
        }

        setIsFiltering(true);
        setError(null);

        try {
            const response = await axios.post("/api/profanity/filter", {
                content: content.trim(),
                contextType,
                contextId,
                serverId
            });

            return {
                cleanText: response.data.cleanText,
                hasViolation: response.data.hasViolation,
                violationId: response.data.violationId
            };
        } catch (err: any) {
            console.error("Profanity filter error:", err);
            const errorMessage = err.response?.data?.message || "Failed to filter content";
            setError(errorMessage);
            
            // Fallback: trả về nội dung gốc nếu filter API lỗi
            return {
                cleanText: content,
                hasViolation: false
            };
        } finally {
            setIsFiltering(false);
        }
    }, []);

    return {
        filterText,
        isFiltering,
        error
    };
};