import { isPast } from 'date-fns';
import type { AssignedIndicator, AssignedVerificationMethod, VerificationStatus } from './types';

/**
 * Función utilitaria para parsear fechas de diferentes formatos (Firestore Timestamp, Date, string, number)
 */
export function parseDate(date: any): Date | null {
  if (!date) return null;
  
  try {
    let dateObj: Date;
    
    if (date.seconds) {
      // Firestore Timestamp
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'object' && date.toDate) {
      // Firestore Timestamp con método toDate
      dateObj = date.toDate();
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
      return null;
    }
    
    return dateObj;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Calcula el estado correcto de un método de verificación considerando si está vencido
 */
export function calculateVerificationMethodStatus(method: AssignedVerificationMethod): VerificationStatus {
  // Si ya está aprobado o rechazado, mantener ese estado
  if (method.status === 'Approved' || method.status === 'Rejected') {
    return method.status;
  }
  
  // Si está en estado 'Submitted', mantener ese estado
  if (method.status === 'Submitted') {
    return method.status;
  }
  
  // Si es 'Pending', verificar si está vencido
  if (method.status === 'Pending' && method.dueDate) {
    const dueDate = parseDate(method.dueDate);
    if (dueDate && isPast(dueDate)) {
      return 'Overdue';
    }
  }
  
  return method.status || 'Pending';
}

/**
 * Calcula el estado general de una asignación considerando todos sus métodos de verificación
 */
export function calculateOverallStatus(assignment: AssignedIndicator): VerificationStatus {
  // Si ya tiene un estado final (Approved o Rejected), mantenerlo
  if (assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected') {
    return assignment.overallStatus;
  }
  
  const methods = assignment.assignedVerificationMethods || [];
  
  // Si no hay métodos de verificación, es Pending
  if (methods.length === 0) {
    return 'Pending';
  }
  
  // Calcular estado de cada método
  const methodStatuses = methods.map(method => calculateVerificationMethodStatus(method));
  
  // Si todos los métodos están aprobados, el estado general es Approved
  if (methodStatuses.every(status => status === 'Approved')) {
    return 'Approved';
  }
  
  // Si algún método fue rechazado, el estado general es Rejected
  if (methodStatuses.some(status => status === 'Rejected')) {
    return 'Rejected';
  }
  
  // Si algún método fue enviado para revisión, el estado general es Submitted
  if (methodStatuses.some(status => status === 'Submitted')) {
    return 'Submitted';
  }
  
  // Si algún método está vencido, el estado general es Overdue
  if (methodStatuses.some(status => status === 'Overdue')) {
    return 'Overdue';
  }
  
  // En cualquier otro caso, es Pending
  return 'Pending';
}

/**
 * Obtiene los colores de estado correctos según los requerimientos:
 * - Rojo: Vencido (Overdue) y Rechazado (Rejected)
 * - Verde: Completado/Aprobado (Approved)
 * - Amarillo: Pendiente (Pending)
 * - Azul: Presentado/Enviado (Submitted)
 */
export const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300', // Amarillo - Pendiente
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',     // Azul - Presentado
  Approved: 'bg-green-100 text-green-800 border-green-300',   // Verde - Completado/Aprobado
  Rejected: 'bg-red-100 text-red-800 border-red-300',        // Rojo - Rechazado
  Overdue: 'bg-red-100 text-red-800 border-red-300',         // Rojo - Vencido
} as const;

/**
 * Obtiene la clase de color de fondo para tarjetas según el estado
 */
export const STATUS_CARD_COLORS = {
  Pending: 'border-yellow-200 bg-yellow-50',    // Amarillo - Pendiente
  Submitted: 'border-blue-200 bg-blue-50',      // Azul - Presentado
  Approved: 'border-green-200 bg-green-50',     // Verde - Completado/Aprobado
  Rejected: 'border-red-200 bg-red-50',         // Rojo - Rechazado
  Overdue: 'border-red-200 bg-red-50',          // Rojo - Vencido
} as const;

/**
 * Obtiene el color del texto según el estado
 */
export const STATUS_TEXT_COLORS = {
  Pending: 'text-yellow-800',    // Amarillo - Pendiente
  Submitted: 'text-blue-800',    // Azul - Presentado
  Approved: 'text-green-800',    // Verde - Completado/Aprobado
  Rejected: 'text-red-800',      // Rojo - Rechazado
  Overdue: 'text-red-800',       // Rojo - Vencido
} as const;

/**
 * Traducciones de estados
 */
export const STATUS_TRANSLATIONS = {
  Pending: 'Pendiente',
  Submitted: 'Presentado',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
  Overdue: 'Vencido',
} as const;