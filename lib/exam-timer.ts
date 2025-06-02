/**
 * Shared timer utility for exam and essay taking
 */

// Timer storage keys
export const EXAM_TIMER_KEY_PREFIX = "exam_session_";
export const ESSAY_TIMER_KEY_PREFIX = "essay_exam_timer_";

// Get storage keys for exams
export const getExamTimerKey = (examId: string) => `${EXAM_TIMER_KEY_PREFIX}${examId}`;
// Essay timer key for localStorage
export const getEssayTimerKey = (examId: string) => `essay_timer_${examId}`;

// Timer info interface
export interface TimerInfo {
  timeLeft: number;
  totalTime: number;
  examId: string;
  examType: 'multiple-choice' | 'essay';
}

/**
 * Check if a timer is active for an exam
 */
export const isTimerActive = (examId: string, type: 'multiple-choice' | 'essay' = 'multiple-choice'): boolean => {
  try {
    const key = type === 'multiple-choice' ? getExamTimerKey(examId) : getEssayTimerKey(examId);
    const timerData = localStorage.getItem(key);
    
    if (!timerData) return false;
    
    const data = JSON.parse(timerData);
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      return expiresAt > now;
    }
    return false;
  } catch (error) {
    console.error("Error checking timer status:", error);
    return false;
  }
};

/**
 * Get timer information for an exam
 */
export const getTimerInfo = (examId: string, type: 'multiple-choice' | 'essay' = 'multiple-choice'): TimerInfo | null => {
  try {
    const key = type === 'multiple-choice' 
      ? getExamTimerKey(examId) 
      : getEssayTimerKey(examId);
    
    const timerData = localStorage.getItem(key);
    if (!timerData) return null;
    
    const data = JSON.parse(timerData);
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      const remainingTime = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      let totalTime = data.totalTime;
      if (!totalTime) {
        // Default to 1 hour if not specified
        totalTime = 3600;
      }
      
      return {
        timeLeft: remainingTime,
        totalTime,
        examId,
        examType: type
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting timer info:", error);
    return null;
  }
};

/**
 * Parse minutes from prompt string
 */
export const parseMinutesFromPrompt = (prompt?: string | null): number => {
  if (!prompt) return 0;
  const match = prompt.match(/(\d+)\s*phút/);
  if (match) return parseInt(match[1], 10);
  return 0;
};

/**
 * Format timer display (MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

/**
 * Get a CSS class for styling the timer based on time remaining
 */
export const getTimerClass = (timeLeft: number, totalTime: number): string => {
  if (totalTime === 0) return "bg-gray-200 text-black";
  const percent = timeLeft / totalTime;
  if (timeLeft <= 10) {
    return "bg-pink-100 text-red-600 font-bold animate-pulse";
  }
  if (percent > 0.75) {
    return "bg-gray-200 text-black";
  }
  if (percent > 0.5) {
    return "bg-green-100 text-green-700 font-semibold";
  }
  if (percent > 0.25) {
    return "bg-yellow-100 text-yellow-800 font-semibold";
  }
  return "bg-orange-100 text-orange-700 font-semibold";
};

/**
 * Format deadline in HH:mm dd/MM/yyyy format
 */
export const formatDeadline = (dateString?: string | null): string => {
  if (!dateString) return "Không có hạn nộp";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Ngày không hợp lệ";
    
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit", 
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    console.error("Error formatting deadline:", error);
    return "Lỗi định dạng ngày";
  }
};

/**
 * Check if deadline has passed
 */
export const isDeadlinePassed = (deadlineStr?: string | null): boolean => {
  if (!deadlineStr) return false;
  try {
    const deadline = new Date(deadlineStr);
    const now = new Date();
    return now > deadline;
  } catch (error) {
    console.error("Error checking deadline:", error);
    return false;
  }
};
