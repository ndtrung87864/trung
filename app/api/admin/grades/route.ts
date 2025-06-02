import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET - Lấy danh sách điểm từ ExamResult
export async function GET(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");
        const examId = searchParams.get("examId");
        const userId = searchParams.get("userId");

        // Build filter conditions
        const whereConditions: any = {};

        if (examId) {
            whereConditions.examId = examId;
        }

        if (userId) {
            whereConditions.userId = userId;
        }

        // Nếu có serverId, lọc qua exam -> channel -> server
        if (serverId) {
            whereConditions.exam = {
                channel: {
                    serverId: serverId
                }
            };
        }

        const examResults = await db.examResult.findMany({
            where: whereConditions,
            include: {
                exam: {
                    include: {
                        channel: {
                            include: {
                                server: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Lấy thông tin user cho mỗi result
        const resultsWithUsers = await Promise.all(
            examResults.map(async (result) => {
                const user = await db.profile.findUnique({
                    where: { id: result.userId },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        imageUrl: true
                    }
                });

                return {
                    ...result,
                    user
                };
            })
        );

        return NextResponse.json(resultsWithUsers);
    } catch (error) {
        console.error("[GRADES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST - Tạo điểm thủ công
export async function POST(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { examId, userId, score, examName, userName, duration } = await req.json();

        if (!examId || !userId || score === undefined) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Kiểm tra exam tồn tại
        const exam = await db.exam.findUnique({
            where: { id: examId }
        });

        if (!exam) {
            return new NextResponse("Exam not found", { status: 404 });
        }

        // Kiểm tra user tồn tại
        const user = await db.profile.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Tạo ExamResult mới
        const examResult = await db.examResult.create({
            data: {
                examId,
                userId,
                score,
                examName: examName || exam.name,
                userName: userName || user.name,
                duration: duration || "00:00:00",
                answers: [] // Thêm trường answers bắt buộc, có thể là mảng rỗng hoặc dữ liệu phù hợp
            },
            include: {
                exam: {
                    include: {
                        channel: {
                            include: {
                                server: true
                            }
                        }
                    }
                }
            }
        });

        // Thêm thông tin user
        const resultWithUser = {
            ...examResult,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                imageUrl: user.imageUrl
            }
        };

        return NextResponse.json(resultWithUser);
    } catch (error) {
        console.error("[GRADES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Xóa kết quả thi
export async function DELETE(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const resultId = searchParams.get("id");

        if (!resultId) {
            return new NextResponse("Missing result ID", { status: 400 });
        }

        const deletedResult = await db.examResult.delete({
            where: { id: resultId }
        });

        return NextResponse.json(deletedResult);
    } catch (error) {
        console.error("[GRADES_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}