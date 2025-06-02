import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to normalize Vietnamese text to folder-friendly format
export function normalizeNameForStorage(name: string): string {
  // Remove diacritical marks (accents)
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[^a-z0-9_.-]/g, ""); // Remove any other non-alphanumeric characters except underscores, dots, and hyphens

  return normalized;
}

// Sort exams by numerical order
export interface Exam {
  name: string;
  [key: string]: unknown;
}

export function sortExamsByNumber(exams: Exam[]) {
  return [...exams].sort((a, b) => {
    // Extract numbers from exam names
    const numA = a.name.match(/\d+/);
    const numB = b.name.match(/\d+/);

    // If both have numbers, compare them numerically
    if (numA && numB) {
      return parseInt(numA[0], 10) - parseInt(numB[0], 10);
    }

    // If only one has a number, prioritize it
    if (numA) return -1;
    if (numB) return 1;

    // If neither has numbers, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

// Utility function to handle Prisma Decimal objects
export function toNumber(decimal: unknown): number {
  if (decimal === null || decimal === undefined) {
    return 0;
  }
  
  // If it's already a number, return it
  if (typeof decimal === 'number') {
    return decimal;
  }
  
  // If it's a Decimal object from Prisma (has toString method)
  if (decimal && typeof decimal === 'object' && 'toString' in decimal) {
    try {
      return parseFloat(decimal.toString());
    } catch (err) {
      console.error('Error converting Decimal to number:', err);
      return 0;
    }
  }
  
  // For string values that represent numbers
  if (typeof decimal === 'string') {
    try {
      return parseFloat(decimal);
    } catch {
      return 0;
    }
  }
  
  return 0;
}

// Function to format date string nicely
export function formatDate(dateString: string | Date | undefined | null) {
  if (!dateString) return "Không có thông tin";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Ngày không hợp lệ";
    }
    
    // Format using Intl API
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Lỗi định dạng ngày";
  }
}
