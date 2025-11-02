"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar 
} from 'lucide-react';
import { AssignedIndicator } from '@/lib/types';
import { isPast } from 'date-fns';

interface CompactViewProps {
  assignments: AssignedIndicator[];
}

export function CompactView({ assignments }: CompactViewProps) {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });

  useEffect(() => {
    const calculateStats = () => {
      const total = assignments.length;
      let completed = 0;
      let pending = 0;
      let overdue = 0;

      assignments.forEach(assignment => {
        const isCompleted = assignment.assignedVerificationMethods?.every(
          method => method.status === "Approved"
        );
        const hasPendingMethods = assignment.assignedVerificationMethods?.some(
          method => method.status === "Pending"
        );
        const hasOverdueMethods = assignment.assignedVerificationMethods?.some(
          method => method.status === "Pending" && isPast(new Date(method.dueDate))
        );

        if (isCompleted) completed++;
        if (hasPendingMethods) pending++;
        if (hasOverdueMethods) overdue++;
      });

      setStats({ total, completed, pending, overdue });
    };

    calculateStats();
  }, [assignments]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Asignaciones</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Indicadores asignados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completados</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completed}</div>
          <p className="text-xs text-muted-foreground">
            Aprobados por el jurado
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">
            En espera de envío o revisión
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.overdue}</div>
          <p className="text-xs text-muted-foreground">
            Plazo de entrega expirado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}