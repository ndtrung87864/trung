"use client";

import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";
import { formatTime, getTimerClass } from "@/lib/exam-timer";

interface SharedExerciseTimerProps {
  initialTimeLeft: number;
  totalTime: number;
  exerciseId?: string;
  exerciseType?: string;
  onTimeUp?: () => void;
  onTimerUpdate?: (timeLeft: number) => void;
  saveTimerState?: (timeLeft: number, totalTime: number) => void;
  isFinished?: boolean;
}

export const SharedExerciseTimer = ({
  initialTimeLeft,
  totalTime,
  onTimeUp,
  onTimerUpdate,
  saveTimerState,
  isFinished = false,
}: SharedExerciseTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer countdown logic
  useEffect(() => {
    if (isFinished || timeLeft <= 0) {
      if (timeLeft <= 0 && onTimeUp) {
        onTimeUp();
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      const newTimeLeft = timeLeft - 1;
      setTimeLeft(newTimeLeft);

      // Call the onTimerUpdate callback if provided
      if (onTimerUpdate) {
        onTimerUpdate(newTimeLeft);
      }

      // Save timer state periodically (every 30 seconds)
      if (saveTimerState && newTimeLeft > 0 && newTimeLeft % 30 === 0) {
        saveTimerState(newTimeLeft, totalTime);
      }

      // If time is up, call the onTimeUp callback
      if (newTimeLeft <= 0 && onTimeUp) {
        onTimeUp();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isFinished, onTimeUp, onTimerUpdate, saveTimerState, totalTime]);

  // Update timeLeft when initialTimeLeft changes
  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);

  return (
    <div
      className={`px-3 py-2 rounded-md border text-sm font-medium flex items-center gap-2 transition-all duration-300 ${getTimerClass(
        timeLeft,
        totalTime
      )}`}
    >
      <Clock className="h-4 w-4" />
      <span>Thời gian: {formatTime(timeLeft)}</span>
    </div>
  );
};
