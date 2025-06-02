import { format, isAfter, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Shared timer utility for exercise taking
 */

// Timer storage keys
export const EXERCISE_TIMER_KEY_PREFIX = "exercise_session_";
export const ESSAY_EXERCISE_TIMER_KEY_PREFIX = "essay_exercise_timer_";

// Get storage keys for exercises
export const getExerciseTimerKey = (exerciseId: string) => `${EXERCISE_TIMER_KEY_PREFIX}${exerciseId}`;
// Essay timer key for localStorage
export const getEssayExerciseTimerKey = (exerciseId: string) => `essay_exercise_timer_${exerciseId}`;

// Timer info interface
export interface TimerInfo {
  timeLeft: number;
  totalTime: number;
  exerciseId: string;
  exerciseType: 'multiple-choice' | 'essay' | 'written';
}

/**
 * Check if a timer is active for an exercise
 */
export const isTimerActive = (exerciseId: string, type: 'multiple-choice' | 'essay' | 'written' = 'multiple-choice'): boolean => {
  try {
    const key = type === 'multiple-choice' ? getExerciseTimerKey(exerciseId) : getEssayExerciseTimerKey(exerciseId);
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
 * Get timer information for an exercise
 */
export const getTimerInfo = (exerciseId: string, type: 'multiple-choice' | 'essay' | 'written' = 'multiple-choice'): TimerInfo | null => {
  try {
    const key = type === 'multiple-choice' 
      ? getExerciseTimerKey(exerciseId) 
      : getEssayExerciseTimerKey(exerciseId);
    
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
        exerciseId,
        exerciseType: type
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting timer info:", error);
    return null;
  }
};

/**
 * Format deadline for display
 */
export function formatDeadline(deadline?: string | null): string {
  if (!deadline) return "Không có hạn";
  
  try {
    const date = parseISO(deadline);
    return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
  } catch (error) {
    return "Không hợp lệ";
  }
}

/**
 * Check if deadline has passed
 */
export function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline) return false;
  
  try {
    const date = parseISO(deadline);
    return isAfter(new Date(), date);
  } catch (error) {
    return false;
  }
}

/**
 * Parse minutes from prompt text
 */
export function parseMinutesFromPrompt(prompt?: string | null): number {
  if (!prompt) return 0;
  const match = prompt.match(/(\d+)\s*phút/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

/**
 * Format time for display
 */
export function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Get timer color class based on remaining time
 */
export function getTimerClass(timeLeft: number, totalTime: number): string {
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
}

/**
 * Get time remaining until deadline
 */
export function getTimeRemaining(deadline?: string | null): {
  isExpired: boolean;
  timeText: string;
} {
  if (!deadline) {
    return { isExpired: false, timeText: "Không có hạn" };
  }

  try {
    const date = parseISO(deadline);
    const now = new Date();
    const isExpired = isAfter(now, date);
    
    if (isExpired) {
      return { isExpired: true, timeText: "Đã hết hạn" };
    }

    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return { isExpired: false, timeText: `Còn ${diffDays} ngày` };
    } else if (diffHours > 0) {
      return { isExpired: false, timeText: `Còn ${diffHours} giờ` };
    } else if (diffMinutes > 0) {
      return { isExpired: false, timeText: `Còn ${diffMinutes} phút` };
    } else {
      return { isExpired: false, timeText: "Sắp hết hạn" };
    }
  } catch (error) {
    return { isExpired: false, timeText: "Không hợp lệ" };
  }
}
