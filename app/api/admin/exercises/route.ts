import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET - Lấy danh sách bài tập cho admin với thống kê
export async function GET(req: Request) {
    try {
        
        const profile = await currentProfile();

        if (!profile) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");
        const channelId = searchParams.get("channelId");
        const isActive = searchParams.get("isActive");
        const search = searchParams.get("search");
        const modelId = searchParams.get("modelId");
        const limit = searchParams.get("limit");
        const offset = searchParams.get("offset");
        // Build filter conditions
        const whereConditions: any = {};

        if (serverId && serverId !== "all") {
            whereConditions.channel = {
                serverId: serverId
            };
        }

        if (channelId) {
            whereConditions.channelId = channelId;
        }

        if (isActive !== null && isActive !== undefined && isActive !== "") {
            whereConditions.isActive = isActive === "true";
        }

        if (modelId) {
            whereConditions.modelId = modelId;
        }

        if (search) {
            whereConditions.OR = [
                {
                    name: {
                        contains: search,
                        mode: "insensitive"
                    }
                },
                {
                    description: {
                        contains: search,
                        mode: "insensitive"
                    }
                }
            ];
        }


        // Get total count for pagination
        const totalCount = await db.exercise.count({
            where: whereConditions
        });

        // Build query options with proper includes for exercise results
        const queryOptions: any = {
            where: whereConditions,
            include: {
                model: true,
                files: true,
                channel: {
                    include: {
                        server: true
                    }
                },
                _count: {
                    select: {
                        exerciseResults: true
                    }
                },
                // Add exercise results to get user completion data
                exerciseResults: {
                    select: {
                        id: true,
                        userId: true,
                        score: true,
                        createdAt: true,
                        submissionType: true
                    },
                    where: {
                        userId: profile.id
                    },
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        };

        // Add pagination if specified
        if (limit) {
            queryOptions.take = parseInt(limit);
        }
        if (offset) {
            queryOptions.skip = parseInt(offset);
        }

        const exercises = await db.exercise.findMany(queryOptions);

        // Get additional statistics with error handling
        let stats = { total: totalCount, active: 0, inactive: 0 };
        
        try {
            const statsData = await db.exercise.groupBy({
                by: ['isActive'],
                where: whereConditions,
                _count: {
                    id: true
                }
            });

            const activeCount = statsData.find(stat => stat.isActive === true)?._count.id || 0;
            const inactiveCount = statsData.find(stat => stat.isActive === false)?._count.id || 0;
            
            stats = {
                total: totalCount,
                active: activeCount,
                inactive: inactiveCount
            };
        } catch (statsError) {
            console.warn("[ADMIN_EXERCISES_GET] Error getting stats:", statsError);
            // Use fallback stats with total count
        }

        const result = {
            exercises,
            pagination: {
                total: totalCount,
                limit: limit ? parseInt(limit) : null,
                offset: offset ? parseInt(offset) : 0,
                hasMore: limit ? (parseInt(offset || "0") + parseInt(limit)) < totalCount : false
            },
            stats
        };
        return NextResponse.json(result);
    } catch (error) {
        console.error("[ADMIN_EXERCISES_GET] Detailed error:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        
        return NextResponse.json(
            { 
                error: "Internal server error", 
                details: error instanceof Error ? error.message : "Unknown error"
            }, 
            { status: 500 }
        );
    }
}

// ...existing code for POST and DELETE methods...
