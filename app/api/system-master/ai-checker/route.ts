import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";

export async function GET() {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Fetch AI assistants (chatboxes) - chatbox belongs to field, field belongs to channel
        const chatboxes = await db.chatbox.findMany({
            include: {
                model: true,
                field: {
                    include: {
                        Channel: {
                            include: {
                                server: true
                            }
                        }
                    }
                }
            }
        });

        // Fetch exercises and exams
        const exams = await db.exam.findMany({
            include: {
                model: true,
                channel: {
                    include: {
                        server: true,
                        field: true
                    }
                }
            }
        });

        const exercises = await db.exercise.findMany({
            include: {
                model: true,
                channel: {
                    include: {
                        server: true,
                        field: true
                    }
                }
            }
        });

        // Fetch exam and exercise results
        const examResults = await db.examResult.findMany();
        const exerciseResults = await db.exerciseResult.findMany();

        // Fetch models
        const models = await db.model.findMany();

        // Process assistants data
        const assistants = chatboxes.map(chatbox => {
            // Get channel info through field relationship
            const channel = chatbox.field?.Channel?.[0]; // field có thể có nhiều channels

            return {
                id: chatbox.id,
                name: `${chatbox.field?.name || 'General'} Assistant`,
                type: 'CHATBOX' as const,
                status: 'ACTIVE' as const,
                modelId: chatbox.modelId,
                modelName: chatbox.model.name,
                fieldId: chatbox.fieldId,
                fieldName: chatbox.field?.name,
                channelId: channel?.id,
                channelName: channel?.name,
                serverName: channel?.server?.name,
                createdAt: chatbox.createdAt.toISOString(),
                updatedAt: chatbox.updatedAt.toISOString(),
                metrics: {
                    totalUsage: 0, // Calculate based on usage data
                    avgResponseTime: 1200,
                    successRate: 98.5,
                    userRating: 4.6
                }
            };
        });

        // Process exercises data
        const exercisesData = [
            ...exams.map(exam => {
                const results = examResults.filter(r => r.examId === exam.id);
                const avgScore = results.length > 0
                    ? results.reduce((sum, r) => sum + Number(r.score), 0) / results.length
                    : 0;

                return {
                    id: exam.id,
                    title: exam.name || 'Unnamed Exam', // Use title instead of examName
                    type: 'EXAM' as const,
                    status: 'ACTIVE' as const,
                    modelId: exam.modelId,
                    modelName: exam.model.name,
                    channelName: exam.channel?.name || '',
                    serverName: exam.channel?.server?.name || '',
                    fieldName: exam.channel?.field?.name || '',
                    difficulty: 'MEDIUM' as const,
                    createdAt: exam.createdAt.toISOString(),
                    results: {
                        total: results.length,
                        avgScore: avgScore,
                        completionRate: 85
                    },
                    hasAIAssistant: assistants.some(a => a.channelId === exam.channelId)
                };
            }),
            ...exercises.map(exercise => {
                const results = exerciseResults.filter(r => r.exerciseId === exercise.id);
                const avgScore = results.length > 0
                    ? results.reduce((sum, r) => sum + Number(r.score), 0) / results.length
                    : 0;

                return {
                    id: exercise.id,
                    title: exercise.name || 'Unnamed Exercise', // Use name instead of exerciseName
                    type: 'EXERCISE' as const,
                    status: 'ACTIVE' as const,
                    modelId: exercise.modelId,
                    modelName: exercise.model.name,
                    channelName: exercise.channel?.name || '',
                    serverName: exercise.channel?.server?.name || '',
                    fieldName: exercise.channel?.field?.name || '',
                    difficulty: 'EASY' as const,
                    createdAt: exercise.createdAt.toISOString(),
                    results: {
                        total: results.length,
                        avgScore: avgScore,
                        completionRate: 92
                    },
                    hasAIAssistant: assistants.some(a => a.channelId === exercise.channelId)
                };
            })
        ];

        // Calculate summary
        const totalAssistants = assistants.length;
        const activeAssistants = assistants.filter(a => a.status === 'ACTIVE').length;
        const totalExercises = exercisesData.length;
        const exercisesWithAssistants = exercisesData.filter(e => e.hasAIAssistant).length;
        const coverageRate = totalExercises > 0 ? (exercisesWithAssistants / totalExercises) * 100 : 0;
        const avgPerformance = exercisesData.length > 0
            ? exercisesData.reduce((sum, e) => sum + e.results.avgScore, 0) / exercisesData.length
            : 0;

        const summary = {
            totalAssistants,
            activeAssistants,
            totalExercises,
            exercisesWithAssistants,
            coverageRate,
            avgPerformance
        };

        const modelsData = models.map(model => ({
            id: model.id,
            name: model.name,
            status: 'ACTIVE',
            usage: [...exams, ...exercises, ...chatboxes].filter(item => item.modelId === model.id).length
        }));

        return NextResponse.json({
            assistants,
            exercises: exercisesData,
            models: modelsData,
            summary
        });

    } catch (error) {
        console.error("[AI_CHECKER_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}