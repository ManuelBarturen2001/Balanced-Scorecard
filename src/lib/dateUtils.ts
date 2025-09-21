import { format, parse, parseISO, isPast, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Utility functions for handling dates in the system
 * Handles Spanish date formats from the database and provides consistent formatting
 */

// Spanish month names mapping
const SPANISH_MONTHS: { [key: string]: string } = {
  'enero': '01',
  'febrero': '02',
  'marzo': '03',
  'abril': '04',
  'mayo': '05',
  'junio': '06',
  'julio': '07',
  'agosto': '08',
  'septiembre': '09',
  'octubre': '10',
  'noviembre': '11',
  'diciembre': '12',
};

/**
 * Parses Spanish date format from database
 * Handles formats like: "30 de agosto de 2025, 10:10:00 a.m. UTC-5"
 */
export function parseSpanishDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  try {
    // Remove UTC timezone info and clean the string
    const cleanedDate = dateString.replace(/\s*UTC[+-]\d+\s*$/, '').trim();
    
    // Pattern to match Spanish date format: "30 de agosto de 2025, 10:10:00 a.m."
    const spanishDatePattern = /^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(a\.m\.|p\.m\.)$/i;
    const match = cleanedDate.match(spanishDatePattern);
    
    if (match) {
      const [, day, monthName, year, hour, minute, second, period] = match;
      
      // Convert Spanish month name to number
      const monthNum = SPANISH_MONTHS[monthName.toLowerCase()];
      if (!monthNum) {
        console.warn(`Unknown Spanish month: ${monthName}`);
        return null;
      }
      
      // Convert 12-hour format to 24-hour format
      let hour24 = parseInt(hour, 10);
      const isPM = period.toLowerCase().includes('p.m.');
      
      if (isPM && hour24 !== 12) {
        hour24 += 12;
      } else if (!isPM && hour24 === 12) {
        hour24 = 0;
      }
      
      // Create ISO string and parse it
      const isoString = `${year}-${monthNum}-${day.padStart(2, '0')}T${hour24.toString().padStart(2, '0')}:${minute}:${second}`;
      const parsedDate = parseISO(isoString);
      
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    
    // Fallback: try to parse as regular date
    const fallbackDate = new Date(dateString);
    if (isValid(fallbackDate) && !isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Spanish date:', error, 'Date string:', dateString);
    return null;
  }
}

/**
 * Safely parses any date format and returns a Date object
 */
export function safeParseDate(date: any): Date | null {
  if (!date) return null;
  
  try {
    let dateObj: Date | null = null;
    
    // Handle Firestore timestamp
    if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } 
    // Handle Date objects
    else if (date instanceof Date) {
      dateObj = date;
    } 
    // Handle Firestore Timestamp objects
    else if (typeof date === 'object' && date.toDate) {
      dateObj = date.toDate();
    } 
    // Handle numeric timestamps
    else if (typeof date === 'number') {
      dateObj = new Date(date);
    } 
    // Handle string dates
    else if (typeof date === 'string') {
      // First try to parse as Spanish date
      dateObj = parseSpanishDate(date);
      
      // If that fails, try regular parsing
      if (!dateObj) {
        dateObj = new Date(date);
        if (!isValid(dateObj) || isNaN(dateObj.getTime())) {
          dateObj = null;
        }
      }
    } 
    // Handle other types
    else {
      dateObj = new Date(date);
      if (!isValid(dateObj) || isNaN(dateObj.getTime())) {
        dateObj = null;
      }
    }
    
    // Final validation
    if (dateObj && isValid(dateObj) && !isNaN(dateObj.getTime()) && dateObj.getTime() !== 0) {
      return dateObj;
    }
    
    return null;
  } catch (error) {
    console.error('Error in safeParseDate:', error, 'Input:', date);
    return null;
  }
}

/**
 * Formats a date with consistent Spanish formatting
 */
export function formatDate(date: any, formatStr: string = 'dd-MMM-yyyy'): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return 'Fecha no disponible';
  }
  
  try {
    return format(parsedDate, formatStr, { locale: es });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Fecha no disponible';
  }
}

/**
 * Formats a date for display in Spanish locale
 */
export function formatDateSpanish(date: any, options?: Intl.DateTimeFormatOptions): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return 'Fecha no disponible';
  }
  
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat('es-ES', defaultOptions).format(parsedDate);
  } catch (error) {
    console.error('Error formatting date with Intl:', error);
    return formatDate(date);
  }
}

/**
 * Checks if a date is in the past
 */
export function isDatePast(date: any): boolean {
  const parsedDate = safeParseDate(date);
  if (!parsedDate) return false;
  
  try {
    return isPast(parsedDate);
  } catch (error) {
    console.error('Error checking if date is past:', error);
    return false;
  }
}

/**
 * Formats file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets a relative time string (e.g., "hace 2 días")
 */
export function getRelativeTime(date: any): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return 'Fecha desconocida';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) {
    return 'Ahora mismo';
  } else if (diffInMinutes < 60) {
    return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
  } else if (diffInHours < 24) {
    return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
  } else if (diffInDays < 30) {
    return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`;
  } else {
    return formatDate(parsedDate, 'dd/MM/yyyy');
  }
}

export default {
  parseSpanishDate,
  safeParseDate,
  formatDate,
  formatDateSpanish,
  isDatePast,
  formatFileSize,
  getRelativeTime,
};