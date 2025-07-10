import type { LucideIcon } from 'lucide-react';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string; // URL to avatar image
  isFirstLogin?: boolean; // Optional, used to track first login
}

export interface Indicator {
  id: string;
  name: string;
  moreInformationLink: string;
  verificationMethods: string[];
}

export interface Perspective {
  id: string;
  name: string;
  icon?: LucideIcon;
}

// IMPORTANT: These status values are used as keys and in logic.
// Translation happens at the display layer.
export type VerificationStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Overdue';

export interface VerificationMethod {
  name: string;
}

export interface MockFile {
  name: string;
  url: string; 
  uploadedAt?: Date; 
  size?: number; 
  type?: string; 
}

export interface AssignedVerificationMethod {
  name: string;
  status: VerificationStatus;
  submittedFile?: MockFile | null;
  notes?: string;
  dueDate?: Date; 
}

export interface AssignedIndicator {
  id?: string; 
  userId: string;
  indicatorId: string;
  dueDate?:Date;
  perspectiveId: string;
  assignedVerificationMethods: AssignedVerificationMethod[];
  overallStatus?: VerificationStatus; 
  assignedDate: Date;
  jury: string[];
}

export interface NavItemConfig {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  disabled?: boolean;
}

// Helper for status translations
export const statusTranslations: Record<VerificationStatus, string> = {
  Pending: "Pendiente",
  Submitted: "Presentado",
  Approved: "Aprobado",
  Rejected: "Rechazado",
  Overdue: "Vencido",
};
