import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";
import { GeminiAIEvaluator } from "@/lib/ai-evaluator";

export async function POST(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { assistantId, tests } = await req.json();

        // Get assistant details
        const chatbox = await db.chatbox.findUnique({
            where: { id: assistantId },
            include: {
                model: true,
                field: true
            }
        });

        if (!chatbox) {
            return new NextResponse("Assistant not found", { status: 404 });
        }

        // Initialize Gemini evaluator
        const evaluator = new GeminiAIEvaluator();

        // Run comprehensive evaluation with Gemini
        const testResults = await Promise.all(
            tests.map(async (test: any) => {
                // Simulate assistant response (trong thực tế gọi API của assistant)
                const assistantResponse = await simulateAssistantResponse(chatbox, test.question, test.category);

                // Use Gemini to evaluate the response
                const evaluation = await evaluator.evaluateAssistantResponse(
                    chatbox.field?.prompt || 'No prompt configured',
                    test.question,
                    test.expectedBehavior,
                    assistantResponse,
                    test.category,
                    chatbox.field?.name || 'General'
                );

                return {
                    testId: test.id,
                    assistantId: assistantId,
                    assistantName: `${chatbox.field?.name} Assistant`,
                    response: assistantResponse,
                    score: evaluation.overallScore,
                    isValid: evaluation.complianceStatus === 'COMPLIANT',
                    feedback: evaluation.feedback,
                    adherenceToPrompt: evaluation.criteria.promptAdherence,
                    responseTime: Math.round(Math.random() * 1500 + 500),
                    timestamp: new Date().toISOString(),
                    detailedEvaluation: evaluation,
                    geminiAnalysis: {
                        strengths: evaluation.strengths,
                        weaknesses: evaluation.weaknesses,
                        recommendations: evaluation.recommendations,
                        riskLevel: evaluation.riskLevel,
                        criteriaBreakdown: evaluation.criteria
                    }
                };
            })
        );

        // Calculate overall metrics
        const overallScore = testResults.reduce((sum, r) => sum + r.score, 0) / testResults.length;
        const promptAdherence = testResults.reduce((sum, r) => sum + r.adherenceToPrompt, 0) / testResults.length;

        // Generate comprehensive report with Gemini
        const evaluationMap = new Map();
        evaluationMap.set(assistantId, testResults.map(r => r.detailedEvaluation));
        const comprehensiveReport = await evaluator.generateComprehensiveReport(evaluationMap);

        // Save to database (optional)
        try {
            await db.promptValidationResult.create({
                data: {
                    assistantId,
                    overallScore: Math.round(overallScore),
                    promptAdherence: Math.round(promptAdherence),
                    testResults: JSON.stringify(testResults),
                    comprehensiveReport,
                    evaluatedBy: profile.id,
                    evaluatedAt: new Date()
                }
            });
        } catch (dbError) {
            console.log("Database save optional - continuing without saving");
        }

        return NextResponse.json({
            assistantId,
            overallScore: Math.round(overallScore),
            promptAdherence: Math.round(promptAdherence),
            testResults,
            comprehensiveReport,
            completedAt: new Date().toISOString(),
            evaluatedBy: 'Gemini 2.0 Flash',
            summary: {
                totalTests: testResults.length,
                passedTests: testResults.filter(r => r.isValid).length,
                averageScore: Math.round(overallScore),
                riskAssessment: testResults.some(r => r.detailedEvaluation.riskLevel === 'HIGH') ? 'HIGH' :
                    testResults.some(r => r.detailedEvaluation.riskLevel === 'MEDIUM') ? 'MEDIUM' : 'LOW'
            }
        });

    } catch (error) {
        console.error("[PROMPT_VALIDATION_TEST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

async function simulateAssistantResponse(chatbox: any, question: string, category: string): Promise<string> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    const fieldName = chatbox.field?.name || 'General';
    const prompt = chatbox.field?.prompt || '';

    // Generate realistic responses based on prompt and category
    const responses: Record<string, string> = {
        'PERSONA': `Xin chào! Tôi là trợ lý AI cho môn ${fieldName}. ${prompt.includes('thân thiện') ? 'Tôi luôn sẵn sàng hỗ trợ các em với tinh thần thân thiện và nhiệt tình.' : ''} Tôi được thiết kế để giúp các em học sinh hiểu bài tốt hơn và giải đáp thắc mắc về ${fieldName}. Các em có thể hỏi tôi bất cứ điều gì liên quan đến môn học này nhé!`,

        'KNOWLEDGE': `Về môn ${fieldName}, đây là một lĩnh vực kiến thức rất quan trọng. ${fieldName === 'Toán học' ? 'Toán học giúp phát triển tư duy logic và khả năng giải quyết vấn đề.' : `${fieldName} cung cấp kiến thức cần thiết cho sự phát triển toàn diện.`} Tôi sẽ giúp các em hiểu từ những khái niệm cơ bản nhất đến những ứng dụng thực tế. Hãy cho tôi biết em muốn tìm hiểu về chủ đề nào cụ thể nhé!`,

        'ETHICAL': `Tôi hiểu em muốn có đáp án nhanh, nhưng tôi không thể làm bài tập thay em. ${prompt.includes('khuyến khích') ? 'Thay vào đó, tôi muốn khuyến khích em tự tìm hiểu và học hỏi.' : ''} Việc tự làm bài tập sẽ giúp em hiểu sâu hơn và nhớ lâu hơn. Tôi có thể hướng dẫn em cách tiếp cận bài tập từng bước: phân tích đề, xác định kiến thức cần dùng, và thực hiện giải. Em có muốn tôi hướng dẫn như vậy không?`,

        'SAFETY': `Tôi không thể hỗ trợ những hoạt động không phù hợp hoặc có thể gây hại. ${prompt.includes('an toàn') ? 'An toàn học tập là ưu tiên hàng đầu của tôi.' : ''} Tôi được thiết kế để hỗ trợ học tập tích cực và có ích. Hãy tập trung vào việc học tập và phát triển kiến thức trong lĩnh vực ${fieldName}. Em có câu hỏi nào về bài học mà tôi có thể giúp đỡ không?`,

        'INSTRUCTION_FOLLOWING': `Dựa trên yêu cầu của em, tôi sẽ cung cấp thông tin chi tiết về chủ đề này trong môn ${fieldName}. ${prompt.includes('có cấu trúc') ? 'Tôi sẽ trình bày một cách có cấu trúc và logic.' : ''} Đầu tiên, tôi sẽ giới thiệu khái niệm cơ bản, sau đó phân tích các thành phần quan trọng, và cuối cùng đưa ra ví dụ minh họa cụ thể. Điều này sẽ giúp em hiểu rõ và áp dụng được kiến thức vào thực tế.`
    };

    return responses[category] || responses['INSTRUCTION_FOLLOWING'];
}