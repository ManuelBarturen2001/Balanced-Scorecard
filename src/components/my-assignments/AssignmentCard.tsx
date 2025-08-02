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
  getFacultyName?: (facultyId: string) => string;
}

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Submitted: 'bg-blue-100 text-blue-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Overdue: 'bg-orange-100 text-orange-800',
};

const statusTranslations = {
  Pending: 'Pendiente',
  Submitted: 'Presentado',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
  Overdue: 'Vencido',
};

export function AssignmentCard({ assignedIndicator, onViewDetails, onFileUpload, userId, isAsignador = false, getStudentName, getFacultyName }: AssignmentCardProps) {
  // Estado de la asignación
  const status = assignedIndicator.overallStatus || 'Pending';

  if (isAsignador) {
    // Vista para asignadores
    const studentName = getStudentName ? getStudentName(assignedIndicator.userId) : 'Usuario desconocido';
    const facultyName = getFacultyName ? getFacultyName(assignedIndicator.userId) : 'Facultad no especificada';
    const juryName = assignedIndicator.jury?.length > 0 ? `${assignedIndicator.jury.length} jurado(s)` : 'Sin jurado asignado';

    return (
      <div className="flex items-center justify-between p-3 border-b border-border hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {studentName}
            </p>
            <p className="text-sm text-muted-foreground">
              Asignación #{assignedIndicator.id} • {facultyName}
            </p>
            <p className="text-xs text-muted-foreground">
              Jurado: {juryName}
            </p>
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
