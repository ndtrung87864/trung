import { parseISO, format } from "date-fns";

// Convert local datetime to ISO string with correct timezone
export const localToISOString = (localDateTimeString: string): string => {
    if (!localDateTimeString) return '';
    
    try {
        // Create Date object from input string (YYYY-MM-DDThh:mm format)
        const date = new Date(localDateTimeString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.error("Invalid date:", localDateTimeString);
            return '';
        }
        
        // Return ISO string (preserving time)
        console.log(`Converting ${localDateTimeString} to ISO: ${date.toISOString()}`);
        return date.toISOString();
    } catch (error) {
        console.error("Error converting to ISO:", error);
        return '';
    }
};

/**
 * Convert ISO date string to local date-time string format for input[type="datetime-local"]
 */
export function isoToLocalDateTimeString(isoString?: string | null): string {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    // Format to YYYY-MM-DDThh:mm
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("Error converting ISO to local date string:", error);
    return '';
  }
}

// Format date for display
export const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    // Use a consistent format regardless of locale
    return format(dateObj, 'HH:mm dd/MM/yyyy');
};

// Preview file with support for new URL format
export const previewFile = (file: { url: string, name: string }) => {
    // If URL is a full https://example.com/files/filename
    if (file.url.startsWith('http')) {
        // Check for new path
        if (file.url.includes('/files/') && !file.url.includes('/exam/')) {
            window.open(file.url, '_blank');
            return;
        }
        // If old format, use file view API
        const encodedPath = encodeURIComponent(file.url);
        const viewableUrl = `/api/files/view?path=${encodedPath}`;
        window.open(viewableUrl, '_blank');
        return;
    }
    
    // If URL has new format /files/[fileName] 
    if (file.url.startsWith('/files/') && !file.url.includes('/exam/')) {
        window.open(file.url, '_blank');
        return;
    }
    
    // If URL has old format /files/exam/[examId]/[fileName]
    if (file.url.startsWith('/files/exam/')) {
        const encodedPath = encodeURIComponent(file.url);
        const viewableUrl = `/api/files/view?path=${encodedPath}`;
        window.open(viewableUrl, '_blank');
        return;
    }
    
    // Other formats, redirect to view API
    const encodedPath = encodeURIComponent(file.url);
    const viewableUrl = `/api/files/view?path=${encodedPath}`;
    window.open(viewableUrl, '_blank');
};
