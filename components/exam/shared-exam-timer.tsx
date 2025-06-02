"use client";

import { useEffect, useState, useRef } from "react";
import { formatTime, getTimerClass } from "@/lib/exam-timer";
import ClientOnly from "@/components/ClientOnly";

interface SharedExamTimerProps {
  initialTimeLeft: number;
  totalTime: number;
  onTimeUp?: () => void;
  onTimerUpdate?: (timeLeft: number) => void;
  saveTimerState?: (timeLeft: number, totalTime: number) => void;
  isFinished?: boolean; // Add this prop to stop the timer when exam is finished
}

export const SharedExamTimer = ({
  initialTimeLeft,
  totalTime,
  onTimeUp,
  onTimerUpdate,
  saveTimerState,
  isFinished = false // Default to false
}: SharedExamTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load timer value from localStorage
  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);
  
  // Timer countdown
  useEffect(() => {
    // Stop timer if exam is finished
    if (isFinished) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    
    if (timeLeft <= 0) {
      if (onTimeUp) {
        onTimeUp();
      }
      return;
    }
    
    timerRef.current = setTimeout(() => {
      const newTimeLeft = timeLeft - 1;
      setTimeLeft(newTimeLeft);
      
      if (onTimerUpdate) {
        onTimerUpdate(newTimeLeft);
      }
      
      // Save timer state to localStorage if provided
      if (saveTimerState) {
        saveTimerState(newTimeLeft, totalTime);
      }
      
      // Check if time is up and trigger onTimeUp callback
      if (newTimeLeft <= 0 && onTimeUp) {
        onTimeUp();
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, totalTime, onTimeUp, onTimerUpdate, saveTimerState, isFinished]);

  return (
    <ClientOnly>
      <div className={`flex items-center justify-center px-4 py-2 rounded text-base text-center w-fit transition-all duration-300 ${getTimerClass(timeLeft, totalTime)}`}>
        Thời gian còn lại: {formatTime(timeLeft)}
      </div>
    </ClientOnly>
  );
};
