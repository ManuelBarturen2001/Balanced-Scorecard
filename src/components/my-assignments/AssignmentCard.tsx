"use client";

import type { AssignedIndicator } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignmentCardProps {
  assignedIndicator: AssignedIndicator;
  onViewDetails: (indicator: AssignedIndicator) => void;
  onFileUpload: (assignedIndicatorId: string, verificationMethodId: string, file: File) => void;
  userId: string;
  isAsignador?: boolean;
  getStudentName?: (userId: string) => string;
  getFacultyName?: (userId: string) => string;
  getSchoolName?: (userId: string) => string;
  getOfficeName?: (userId: string) => string;
  getPerspectiveName?: (perspectiveId: string) => string | undefined;
  getJuryNames?: (juryIds: string[]) => string;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Submitted: 'bg-blue-100 text-blue-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Overdue: 'bg-orange-100 text-orange-800',
  Observed: 'bg-purple-100 text-purple-800',
};

const statusTranslations: Record<string, string> = {
  Pending: 'Pendiente',
  Submitted: 'Presentado',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
  Overdue: 'Vencido',
  Observed: 'Observado',
};

export function AssignmentCard({ assignedIndicator, onViewDetails, onFileUpload, userId, isAsignador = false, getStudentName, getFacultyName, getSchoolName, getOfficeName, getPerspectiveName, getJuryNames }: AssignmentCardProps) {
  // Estado de la asignación
  const status = assignedIndicator.overallStatus || 'Pending' as const;

  if (isAsignador) {
    // Vista para asignadores
    const studentName = getStudentName ? getStudentName(assignedIndicator.userId) : 'Usuario desconocido';
    const facultyName = getFacultyName ? getFacultyName(assignedIndicator.userId) : 'Sin facultad';
    const schoolName = getSchoolName ? getSchoolName(assignedIndicator.userId) : 'Sin escuela';
    const officeName = getOfficeName ? getOfficeName(assignedIndicator.userId) : 'Sin oficina';
    const perspectiveName = getPerspectiveName ? getPerspectiveName(assignedIndicator.perspectiveId || '') : 'Sin perspectiva';
    const juryName = getJuryNames 
      ? getJuryNames(assignedIndicator.jury || [])
      : (assignedIndicator.jury && assignedIndicator.jury.length > 0 
          ? `${assignedIndicator.jury.length} jurado(s)` 
          : 'Sin jurado asignado');
    
    // Determinar si es facultad u oficina basado en los datos del usuario
    const hasFaculty = facultyName && !facultyName.includes('Sin facultad');
    const hasOffice = officeName && !officeName.includes('Sin oficina');
    
    // Formatear fecha de vencimiento
    const dueDate = assignedIndicator.dueDate 
      ? new Date(assignedIndicator.dueDate instanceof Date ? assignedIndicator.dueDate : assignedIndicator.dueDate).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) 
      : 'Sin fecha límite';

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onViewDetails(assignedIndicator)}>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-foreground">
              {studentName}
            </p>
          </div>
          
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><span className="font-medium">Perspectiva:</span> {perspectiveName}</p>
            <p>
              <span className="font-medium">{hasFaculty ? 'Facultad:' : 'Oficina:'}</span> {
                hasFaculty 
                  ? `${facultyName}${schoolName !== 'Sin escuela' ? ` - ${schoolName}` : ''}`
                  : officeName
              }
            </p>
            <p><span className="font-medium">Jurado:</span> {juryName}</p>
            <p><span className="font-medium">Fecha de Vencimiento:</span> {dueDate}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge 
            className={cn(
              "text-xs whitespace-nowrap",
              statusColors[status] || statusColors.Pending
            )}
          >
            {statusTranslations[status] || status}
          </Badge>
        </div>
      </div>
    );
  } else {
    // Vista para usuarios normales
    const indicatorName = assignedIndicator.indicatorId || 'Indicador sin nombre';
    const dueDate = assignedIndicator.dueDate ? new Date(assignedIndicator.dueDate).toLocaleDateString() : 'Sin fecha límite';
    
    // Calcular progreso
    const totalMethods = assignedIndicator.assignedVerificationMethods?.length || 0;
    const completedMethods = assignedIndicator.assignedVerificationMethods?.filter(method => 
      method.status === 'Approved'
    ).length || 0;
    const progressPercentage = totalMethods > 0 ? (completedMethods / totalMethods) * 100 : 0;

    return (
      <div className="flex items-center justify-between p-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onViewDetails(assignedIndicator)}>
        <div className="flex items-center gap-3 flex-1">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {indicatorName}
            </p>
            <p className="text-sm text-muted-foreground">
              Progreso: {completedMethods}/{totalMethods} • Vence: {dueDate}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        <Badge 
          className={cn(
            "text-xs whitespace-nowrap",
            statusColors[status] || statusColors.Pending
          )}
        >
          {statusTranslations[status] || status}
        </Badge>
      </div>
    );
  }
}
