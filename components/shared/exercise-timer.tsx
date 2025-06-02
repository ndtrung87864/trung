"use client";

import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

interface ExerciseTimerProps {
  initialTimeLeft: number;
  totalTime: number;
  exerciseId: string;
  exerciseType: 'multiple-choice' | 'essay' | 'written';
  onTimeUp?: () => void;
  onTimerUpdate?: (timeLeft: number) => void;
  saveTimerState?: (timeLeft: number, totalTime: number) => void;
  isFinished?: boolean;
}

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function getTimerClass(timeLeft: number, totalTime: number): string {
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

export const ExerciseTimer = ({
  initialTimeLeft,
  totalTime,
  exerciseId,
  exerciseType,
  onTimeUp,
  onTimerUpdate,
  saveTimerState,
  isFinished = false
}: ExerciseTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLeft);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load timer value from localStorage
  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);
  
  // Timer countdown
  useEffect(() => {
    // Stop timer if exercise is finished
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

  if (isFinished) {
    return (
      <div className="flex items-center justify-center my-2">
        <div className="px-3 py-2 rounded text-base flex items-center bg-green-100 text-green-700">
          <Clock className="h-4 w-4 mr-2" />
          <span className="whitespace-nowrap">Đã hoàn thành</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center my-2">
      <div className={`px-3 py-2 rounded text-base flex items-center transition-all duration-300 ${getTimerClass(timeLeft, totalTime)}`}>
        <Clock className="h-4 w-4 mr-2" />
        <span className="whitespace-nowrap">
          Thời gian: {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
};
