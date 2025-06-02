import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");
        const examId = searchParams.get("examId");

        // Build filter conditions cho ExamResult
        const whereConditions: any = {};

        if (examId) {
            whereConditions.examId = examId;
        }

        if (serverId) {
            whereConditions.exam = {
                channel: {
                    serverId: serverId
                }
            };
        }

        // Lấy tất cả kết quả thi
        const examResults = await db.examResult.findMany({
            where: whereConditions,
            select: {
                score: true,
                examId: true,
                exam: {
                    select: {
                        name: true,
                        channel: {
                            select: {
                                server: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (examResults.length === 0) {
            return NextResponse.json({
                totalStudents: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                passRate: 0,
                gradeDistribution: []
            });
        }

        const scores = examResults.map(result => Number(result.score));
        const totalStudents = scores.length;
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalStudents;
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);
        const passRate = (scores.filter(score => score >= 5).length / totalStudents) * 100;

        // Phân phối điểm
        const gradeRanges = [
            { range: "0-2", min: 0, max: 2, count: 0 },
            { range: "2-4", min: 2, max: 4, count: 0 },
            { range: "4-6", min: 4, max: 6, count: 0 },
            { range: "6-8", min: 6, max: 8, count: 0 },
            { range: "8-10", min: 8, max: 10, count: 0 }
        ];

        scores.forEach(score => {
            gradeRanges.forEach(range => {
                if (score >= range.min && (score < range.max || (range.max === 10 && score === 10))) {
                    range.count++;
                }
            });
        });

        return NextResponse.json({
            totalStudents,
            averageScore: Math.round(averageScore * 100) / 100,
            highestScore,
            lowestScore,
            passRate: Math.round(passRate * 100) / 100,
            gradeDistribution: gradeRanges
        });
    } catch (error) {
        console.error("[GRADES_STATISTICS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}