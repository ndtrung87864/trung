import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // 1. Lấy toàn bộ dữ liệu user và hoạt động
        const profiles = await db.profile.findMany({
            include: {
                servers: {
                    include: {
                        channels: {
                            include: {
                                exams: true,
                                exercises: true
                            }
                        }
                    }
                },
                members: {
                    include: {
                        server: true
                    }
                }
            }
        });

        // 2. Lấy tất cả AI Models (sử dụng đúng tên bảng)
        const aiModels = await db.model.findMany({
            include: {
                Exam: {
                    where: {
                        createdAt: { gte: startDate }
                    }
                },
                Exercise: {
                    where: {
                        createdAt: { gte: startDate }
                    }
                },
                chatboxes: {
                    where: {
                        createdAt: { gte: startDate }
                    }
                }
            }
        });

        // 3. Lấy tất cả kết quả thi với thông tin chi tiết
        const examResults = await db.examResult.findMany({
            where: {
                createdAt: { gte: startDate }
            }
        });

        // 4. Lấy tất cả kết quả bài tập
        const exerciseResults = await db.exerciseResult.findMany({
            where: {
                createdAt: { gte: startDate }
            }
        });

        // 5. Lấy tất cả chatbox
        const chatboxes = await db.chatbox.findMany({
            where: {
                createdAt: { gte: startDate }
            },
            include: {
                model: true,
                field: true
            }
        });

        // 6. Lấy thông tin về servers và channels
        const servers = await db.server.findMany({
            include: {
                channels: {
                    include: {
                        field: true,
                        exams: {
                            include: {
                                model: true
                            }
                        },
                        exercises: {
                            include: {
                                model: true
                            }
                        }
                    }
                },
                members: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        // 7. Lấy dữ liệu về fields (chủ đề/môn học)
        const fields = await db.field.findMany({
            include: {
                Channel: {
                    include: {
                        exams: true,
                        exercises: true
                    }
                },
                chatboxes: {
                    where: {
                        createdAt: { gte: startDate }
                    }
                }
            }
        });

        // 8. Phân tích dữ liệu AI Models chi tiết
        const modelAnalysis = aiModels.map((model: any) => {
            // Get exam và exercise results thông qua relationship - sửa tên property
            const modelExamResults = examResults.filter(result =>
                model.Exam.some((exam: any) => exam.id === result.examId)
            );
            const modelExerciseResults = exerciseResults.filter(result =>
                model.Exercise.some((exercise: any) => exercise.id === result.exerciseId)
            );

            const allResults = [...modelExamResults, ...modelExerciseResults];
            const scores = allResults.map(r => Number(r.score));
            const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

            // Phân tích theo server (từ exam và exercise)
            const serverUsage: Record<string, any> = {};

            model.Exam.forEach((exam: any) => {
                const examResultsCount = modelExamResults.filter(r => r.examId === exam.id).length;
                // Find server through channels
                const server = servers.find(s =>
                    s.channels.some(ch => ch.exams.some(e => e.id === exam.id))
                );
                const serverName = server?.name || 'Unknown';

                if (!serverUsage[serverName]) {
                    serverUsage[serverName] = { exams: 0, exercises: 0, totalResults: 0 };
                }
                serverUsage[serverName].exams++;
                serverUsage[serverName].totalResults += examResultsCount;
            });

            model.Exercise.forEach((exercise: any) => {
                const exerciseResultsCount = modelExerciseResults.filter(r => r.exerciseId === exercise.id).length;
                const server = servers.find(s =>
                    s.channels.some(ch => ch.exercises.some(e => e.id === exercise.id))
                );
                const serverName = server?.name || 'Unknown';

                if (!serverUsage[serverName]) {
                    serverUsage[serverName] = { exams: 0, exercises: 0, totalResults: 0 };
                }
                serverUsage[serverName].exercises++;
                serverUsage[serverName].totalResults += exerciseResultsCount;
            });

            // Score distribution
            const scoreRanges = {
                excellent: scores.filter(s => s >= 8).length,
                good: scores.filter(s => s >= 6 && s < 8).length,
                average: scores.filter(s => s >= 4 && s < 6).length,
                poor: scores.filter(s => s < 4).length
            };

            return {
                id: model.id,
                name: model.name,
                description: model.description,
                totalExams: model.Exam.length,
                totalExercises: model.Exercise.length,
                totalResults: allResults.length,
                totalChatboxes: model.chatboxes.length,
                avgScore: Number(avgScore.toFixed(2)),
                scoreDistribution: scoreRanges,
                serverUsage,
                performance: avgScore >= 8 ? 'Excellent' : avgScore >= 6 ? 'Good' : avgScore >= 4 ? 'Average' : 'Poor',
                lastUsed: model.updatedAt,
                createdAt: model.createdAt
            };
        });

        // 9. Phân tích theo server
        const serverAnalysis = servers.map((server: any) => {
            const serverExamResults = examResults.filter(result =>
                server.channels.some((ch: any) => ch.exams.some((ex: any) => ex.id === result.examId))
            );
            const serverExerciseResults = exerciseResults.filter(result =>
                server.channels.some((ch: any) => ch.exercises.some((ex: any) => ex.id === result.exerciseId))
            );
            const allResults = [...serverExamResults, ...serverExerciseResults];

            const scores = allResults.map(r => Number(r.score));
            const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

            // Model usage trong server này
            const modelUsage: Record<string, any> = {};
            server.channels.forEach((channel: any) => {
                [...channel.exams, ...channel.exercises].forEach((item: any) => {
                    const modelName = item.model?.name || 'Unknown';
                    if (!modelUsage[modelName]) {
                        modelUsage[modelName] = { count: 0, results: 0 };
                    }
                    modelUsage[modelName].count++;

                    // Count results for this item
                    const itemResults = item.id.includes('exam') ?
                        examResults.filter(r => r.examId === item.id).length :
                        exerciseResults.filter(r => r.exerciseId === item.id).length;
                    modelUsage[modelName].results += itemResults;
                });
            });

            return {
                id: server.id,
                name: server.name,
                imageUrl: server.imageUrl,
                memberCount: server.members.length,
                channelCount: server.channels.length,
                totalExams: server.channels.reduce((sum: number, ch: any) => sum + ch.exams.length, 0),
                totalExercises: server.channels.reduce((sum: number, ch: any) => sum + ch.exercises.length, 0),
                totalResults: allResults.length,
                avgScore: Number(avgScore.toFixed(2)),
                modelUsage,
                activity: {
                    activeMembers: server.members.filter((m: any) =>
                        new Date(m.profile.updatedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length,
                    recentResults: allResults.filter(r =>
                        new Date(r.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length
                },
                createdAt: server.createdAt
            };
        });

        // 10. Phân tích theo field/chủ đề
        const fieldAnalysis = fields.map((field: any) => {
            const fieldExamResults = examResults.filter(result =>
                field.Channel.some((ch: any) => ch.exams.some((ex: any) => ex.id === result.examId))
            );
            const fieldExerciseResults = exerciseResults.filter(result =>
                field.Channel.some((ch: any) => ch.exercises.some((ex: any) => ex.id === result.exerciseId))
            );
            const allResults = [...fieldExamResults, ...fieldExerciseResults];

            const scores = allResults.map(r => Number(r.score));
            const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

            return {
                id: field.id,
                name: field.name,
                description: field.description,
                channelCount: field.Channel.length,
                totalExams: field.Channel.reduce((sum: number, ch: any) => sum + ch.exams.length, 0),
                totalExercises: field.Channel.reduce((sum: number, ch: any) => sum + ch.exercises.length, 0),
                totalResults: allResults.length,
                totalChatboxes: field.chatboxes.length,
                avgScore: Number(avgScore.toFixed(2)),
                difficulty: avgScore >= 7 ? 'Easy' : avgScore >= 5 ? 'Medium' : avgScore >= 3 ? 'Hard' : 'Very Hard',
                popularityScore: allResults.length + field.chatboxes.length
            };
        });

        // 11. User activity analysis
        const userAnalysis = {
            totalUsers: profiles.length,
            activeUsers: profiles.filter(p =>
                new Date(p.updatedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length,
            newUsers: profiles.filter(p =>
                new Date(p.createdAt) >= startDate
            ).length,
            usersByRole: {
                ADMIN: profiles.filter(p => p.role === UserRole.ADMIN).length,
                USER: profiles.filter(p => p.role === UserRole.USER).length
            },
            serverOwners: profiles.filter(p => p.servers.length > 0).length,
            avgServersPerUser: profiles.length > 0 ?
                profiles.reduce((sum, p) => sum + p.servers.length, 0) / profiles.length : 0
        };

        // 12. Performance trends (daily/weekly)
        const performanceTrends: Record<string, any> = {
            daily: {},
            weekly: {},
            monthly: {}
        };

        // Group results by date
        [...examResults, ...exerciseResults].forEach(result => {
            const date = new Date(result.createdAt).toISOString().split('T')[0];
            if (!performanceTrends.daily[date]) {
                performanceTrends.daily[date] = { count: 0, totalScore: 0, avgScore: 0 };
            }
            performanceTrends.daily[date].count++;
            performanceTrends.daily[date].totalScore += Number(result.score);
            performanceTrends.daily[date].avgScore =
                performanceTrends.daily[date].totalScore / performanceTrends.daily[date].count;
        });

        // 13. System health metrics
        const modelDistribution: Record<string, number> = {};
        modelAnalysis.forEach((model: any) => {
            modelDistribution[model.name] = model.totalResults;
        });

        const systemHealth = {
            totalAssessments: examResults.length + exerciseResults.length,
            totalChatboxes: chatboxes.length,
            avgSystemScore: [...examResults, ...exerciseResults].length > 0 ?
                [...examResults, ...exerciseResults].reduce((sum, r) => sum + Number(r.score), 0) /
                [...examResults, ...exerciseResults].length : 0,
            modelDistribution,
            serverActivity: serverAnalysis.sort((a, b) => b.totalResults - a.totalResults),
            topFields: fieldAnalysis.sort((a, b) => b.popularityScore - a.popularityScore).slice(0, 10)
        };

        return NextResponse.json({
            models: modelAnalysis,
            servers: serverAnalysis,
            fields: fieldAnalysis,
            users: userAnalysis,
            performanceTrends,
            systemHealth,
            examResults: examResults.map(r => ({
                id: r.id,
                score: Number(r.score),
                examName: r.examName,
                userName: r.userName,
                createdAt: r.createdAt
            })),
            exerciseResults: exerciseResults.map(r => ({
                id: r.id,
                score: Number(r.score),
                exerciseName: r.exerciseName,
                userName: r.userName,
                createdAt: r.createdAt
            })),
            metadata: {
                dataRange: `${startDate.toISOString()} to ${new Date().toISOString()}`,
                totalRecords: {
                    models: aiModels.length,
                    servers: servers.length,
                    fields: fields.length,
                    users: profiles.length,
                    examResults: examResults.length,
                    exerciseResults: exerciseResults.length,
                    chatboxes: chatboxes.length
                },
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("[COMPREHENSIVE_DATA_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}