import { db } from '@/lib/db';
import { ProfanitySeverity, ViolationAction, ViolationContext } from '@prisma/client';

interface WordCacheItem {
    id: string;
    word: string;
    severity: ProfanitySeverity;
    replacement: string | null;
}

interface FilterResult {
    cleanText: string;
    hasViolation: boolean;
    violatedWords: Array<{
        word: string;
        position: number;
        replacement: string;
        severity: ProfanitySeverity;
    }>;
    maxSeverity: ProfanitySeverity;
}

// Cache để tối ưu performance
let wordsCache: Map<string, WordCacheItem> = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

class ProfanityFilter {
    // Load từ cấm từ database với thông tin replacement
    private async loadWordsFromDatabase(): Promise<Map<string, WordCacheItem>> {
        try {
            const now = Date.now();
            
            // Kiểm tra cache
            if (wordsCache.size > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
                return wordsCache;
            }

            const profanityWords = await db.profanityWord.findMany({
                where: {
                    isActive: true
                },
                select: {
                    id: true,
                    word: true,
                    severity: true,
                    replacement: true
                }
            });

            wordsCache.clear();
            profanityWords.forEach(word => {
                wordsCache.set(word.word.toLowerCase(), {
                    id: word.id,
                    word: word.word.toLowerCase(),
                    severity: word.severity,
                    replacement: word.replacement
                });
            });
            
            lastCacheUpdate = now;
            console.log(`Loaded ${profanityWords.length} profanity words to cache`);
            
            return wordsCache;
        } catch (error) {
            console.error('Error loading words from database:', error);
            return new Map();
        }
    }

    // Escape regex characters
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Tìm tất cả vi phạm trong text
    private async findViolations(text: string): Promise<Array<{
        word: string;
        position: number;
        length: number;
        replacement: string;
        severity: ProfanitySeverity;
        wordId: string;
    }>> {
        await this.loadWordsFromDatabase();
        
        const violations: Array<{
            word: string;
            position: number;
            length: number;
            replacement: string;
            severity: ProfanitySeverity;
            wordId: string;
        }> = [];
        
        const normalizedText = text.toLowerCase();

        // Duyệt qua tất cả từ cấm trong cache
        for (const [word, wordData] of wordsCache) {
            const regex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'gi');
            let match;

            while ((match = regex.exec(normalizedText)) !== null) {
                violations.push({
                    word: word,
                    position: match.index,
                    length: word.length,
                    replacement: wordData.replacement || "***", // Sử dụng replacement hoặc mặc định ***
                    severity: wordData.severity,
                    wordId: wordData.id
                });
            }
        }

        // Sắp xếp theo vị trí để thay thế đúng thứ tự
        return violations.sort((a, b) => a.position - b.position);
    }

    // Kiểm tra có chứa từ cấm không
    async check(text: string): Promise<boolean> {
        const violations = await this.findViolations(text);
        return violations.length > 0;
    }

    // Filter text với replacement tùy chỉnh
    async filter(text: string): Promise<FilterResult> {
        const violations = await this.findViolations(text);
        
        if (violations.length === 0) {
            return {
                cleanText: text,
                hasViolation: false,
                violatedWords: [],
                maxSeverity: 'LOW'
            };
        }

        // Thay thế từ cuối về đầu để không ảnh hưởng đến vị trí
        let cleanText = text;
        const sortedViolations = violations.sort((a, b) => b.position - a.position);

        for (const violation of sortedViolations) {
            const beforeText = cleanText.substring(0, violation.position);
            const afterText = cleanText.substring(violation.position + violation.length);
            cleanText = beforeText + violation.replacement + afterText;
        }

        // Tìm severity cao nhất
        const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        const maxSeverity = violations.reduce((max, v) => {
            return severityLevels[v.severity] > severityLevels[max] ? v.severity : max;
        }, 'LOW' as ProfanitySeverity);

        return {
            cleanText,
            hasViolation: true,
            violatedWords: violations.map(v => ({
                word: v.word,
                position: v.position,
                replacement: v.replacement,
                severity: v.severity
            })),
            maxSeverity
        };
    }

    // Log vi phạm vào database
    private async logViolation(
        originalText: string,
        filteredText: string,
        violatedWords: Array<{word: string, position: number, replacement: string, severity: ProfanitySeverity}>,
        userId: string,
        userName: string,
        contextType: ViolationContext = 'CHAT',
        contextId?: string,
        serverId?: string,
        maxSeverity: ProfanitySeverity = 'LOW'
    ): Promise<string | undefined> {
        try {
            const violation = await db.profanityViolation.create({
                data: {
                    originalText,
                    filteredText,
                    violatedWords: violatedWords.map(vw => ({
                        word: vw.word,
                        position: vw.position,
                        replacement: vw.replacement
                    })),
                    userId,
                    userName,
                    contextType,
                    contextId,
                    serverId,
                    action: this.getActionForSeverity(maxSeverity),
                    severity: maxSeverity,
                    isReported: maxSeverity === 'CRITICAL'
                }
            });

            // Cập nhật usage count cho từng từ vi phạm
            const uniqueWords = [...new Set(violatedWords.map(vw => vw.word))];
            await Promise.all(
                uniqueWords.map(word => {
                    const wordData = wordsCache.get(word);
                    if (wordData) {
                        return db.profanityWord.update({
                            where: { id: wordData.id },
                            data: {
                                usageCount: { increment: 1 },
                                lastUsed: new Date()
                            }
                        });
                    }
                    return Promise.resolve();
                })
            );

            return violation.id;
        } catch (error) {
            console.error('Error logging violation:', error);
            return undefined;
        }
    }

    // Xác định action dựa trên severity
    private getActionForSeverity(severity: ProfanitySeverity): ViolationAction {
        switch (severity) {
            case 'LOW':
                return 'WARN';
            case 'MEDIUM':
                return 'FILTER';
            case 'HIGH':
                return 'BLOCK';
            case 'CRITICAL':
                return 'REPORT';
            default:
                return 'FILTER';
        }
    }

    // Thay thế từ cấm và log vi phạm
    async cleanAndLog(
        text: string, 
        userId: string, 
        userName: string,
        contextType: ViolationContext = 'CHAT',
        contextId?: string,
        serverId?: string
    ): Promise<{cleanText: string, hasViolation: boolean, violationId?: string}> {
        const result = await this.filter(text);
        
        if (result.hasViolation) {
            const violationId = await this.logViolation(
                text,
                result.cleanText,
                result.violatedWords,
                userId,
                userName,
                contextType,
                contextId,
                serverId,
                result.maxSeverity
            );

            return {
                cleanText: result.cleanText,
                hasViolation: true,
                violationId
            };
        }

        return {
            cleanText: result.cleanText,
            hasViolation: false
        };
    }

    // Thay thế từ cấm đơn giản (không log)
    async clean(text: string): Promise<string> {
        const result = await this.filter(text);
        return result.cleanText;
    }

    // Reload cache
    async reloadCache(): Promise<void> {
        wordsCache.clear();
        lastCacheUpdate = 0;
        await this.loadWordsFromDatabase();
    }

    // Clear cache
    clearCache(): void {
        wordsCache.clear();
        lastCacheUpdate = 0;
    }

    // Lấy thống kê vi phạm
    async getViolationStats(serverId?: string, userId?: string) {
        try {
            const where: any = {};
            if (serverId) where.serverId = serverId;
            if (userId) where.userId = userId;

            const stats = await db.profanityViolation.groupBy({
                by: ['severity'],
                where,
                _count: {
                    id: true
                }
            });

            const totalViolations = await db.profanityViolation.count({ where });
            
            return {
                totalViolations,
                bySeverity: stats
            };
        } catch (error) {
            console.error('Error getting violation stats:', error);
            return { totalViolations: 0, bySeverity: [] };
        }
    }
}

// Export singleton instance
export const profanityFilter = new ProfanityFilter();