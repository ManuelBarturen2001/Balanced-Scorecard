import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

// Nuevo sistema de roles
export type UserRole = 'responsable' | 'calificador' | 'asignador' | 'admin' | 'supervisor';
export type RoleType = 'variante' | 'unico';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleType: RoleType;
  avatar?: string;
  isFirstLogin?: boolean;
  facultyId?: string;
  professionalSchoolId?: string;
  officeId?: string;
  bossName?: string;
  bossEmail?: string;
  // Jefes separados por facultad y oficina
  facultyBossName?: string;
  facultyBossEmail?: string;
  officeBossName?: string;
  officeBossEmail?: string;
  // Para roles variantes, pueden tener múltiples roles
  availableRoles?: UserRole[];
  // Para calificadores, especificar en qué facultades puede calificar
  calificatorFaculties?: string[];
  // Para asignadores, especificar en qué facultades puede asignar
  assignerFaculties?: string[];
  // Notificaciones del usuario
  notifications?: Notification[];
  // Estadísticas del usuario
  stats?: UserStats;
}

export interface UserStats {
  totalAssignments?: number;
  completedAssignments?: number;
  pendingAssignments?: number;
  totalEvaluations?: number;
  completedEvaluations?: number;
  pendingEvaluations?: number;
  averageScore?: number;
  lastActivity?: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  senderName?: string; // Nombre del remitente (para notificaciones manuales)
}

export interface Faculty {
  id: string;
  name: string;
  shortName: string;
}

export interface ProfessionalSchool {
  id: string;
  name: string;
  facultyId: string;
}

export interface Office {
  id: string;
  name: string;
}

export interface Indicator {
  id: string;
  name: string;
  moreInformationLink: string;
  verificationMethods: string[];
  perspectiveId?: string;
}

export interface MockFile {
  name: string;
  url: string;
  uploadedAt?: Date | Timestamp | string;
  size?: number;
  type?: string;
  fileName?: string;
  originalName?: string;
}

export interface AssignedVerificationMethod {
  name: string;
  status: VerificationStatus;
  submittedFile?: MockFile | null;
  notes?: string;
  dueDate: Date | string;
  fileHistory?: MockFile[];
}

export interface AssignedIndicator {
  id?: string;
  responsableName?: string;
  userId: string;
  indicatorId: string;
  assignerId: string;
  perspectiveId?: string;
  dueDate: Date | string;
  assignedVerificationMethods: AssignedVerificationMethod[];
  overallStatus?: VerificationStatus;
  assignedDate: Date | string;  // Quitamos el opcional
  jury?: string[];
}

export interface Perspective {
  id: string;
  name: string;
  icon?: LucideIcon;
}

export type VerificationStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Overdue' | 'Observed';

export interface VerificationMethod {
  name: string;
}

export interface NavItemConfig {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  disabled?: boolean;
}

export const statusTranslations: Record<VerificationStatus, string> = {
  Pending: "Pendiente",
  Submitted: "Presentado",
  Approved: "Aprobado",
  Rejected: "Rechazado",
  Overdue: "Vencido",
  Observed: "Observado",
};