"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileCheck, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminGradingTable } from '@/components/admin/grading/AdminGradingTable';
import { getCollection } from '@/lib/firebase-functions';
import type { AssignedIndicator } from '@/lib/types';

export default function GradingPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [assignmentsToGrade, setAssignmentsToGrade] = useState<AssignedIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Obtener el ID de la asignación desde los parámetros de la URL
  const assignmentId = searchParams.get('assignment');

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        try {
          // Obtener todas las asignaciones que necesitan calificación
          const allAssignments = await getCollection<AssignedIndicator>('assigned_indicator');
          
          console.log('All assignments:', allAssignments);
          console.log('User ID:', user?.id);
          console.log('User role:', user?.role);
          
          // Filtrar asignaciones donde el calificador actual es parte del jurado
          // Y que tienen archivos subidos y necesitan calificación
          const assignmentsWithFiles = allAssignments.filter(assignment => 
            assignment.jury?.includes(user?.id || '')
          );
          
          console.log('Filtered assignments:', assignmentsWithFiles);
          console.log('Assignments with jury:', allAssignments.filter(assignment => 
            assignment.jury?.includes(user?.id || '')
          ));
          
          setAssignmentsToGrade(assignmentsWithFiles);
        } catch (error) {
          console.error('Error fetching grading data:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading && !user) {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading]);

  // Calcular estadísticas basadas en asignaciones completas, no métodos individuales
  const totalEvaluations = assignmentsToGrade.length;
  
  // Completadas: asignaciones donde TODOS los métodos están aprobados
  const completedEvaluations = assignmentsToGrade.filter(assignment => 
    assignment.assignedVerificationMethods?.every(method => method.status === 'Approved')
  );
  
  // Pendientes: todas las asignaciones que no están completamente aprobadas
  const pendingEvaluations = assignmentsToGrade.filter(assignment => 
    !assignment.assignedVerificationMethods?.every(method => method.status === 'Approved')
  );

  // Calcular progreso basado en asignaciones completadas vs total de asignaciones
  const totalProgress = totalEvaluations > 0 
    ? (completedEvaluations.length / totalEvaluations) * 100 
    : 0;

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 container mx-auto py-2">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-2/5 rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md mt-2" />
          </CardHeader>
          <CardContent className="p-0 md:p-2">
            <div className="space-y-2 p-4">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
              <p className="text-muted-foreground">Debes iniciar sesión para acceder a la calificación.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar si el usuario es calificador
  if (user.role !== 'calificador' && user.role !== 'admin') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
              <p className="text-muted-foreground">Solo los calificadores pueden acceder a esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Mensaje informativo si se accede con un ID específico */}
        {assignmentId && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Mostrando detalles de la asignación #{assignmentId}. 
                  Puedes evaluar esta asignación específica o ver todas las evaluaciones pendientes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Header con estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Evaluaciones</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvaluations}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedEvaluations.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingEvaluations.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso</CardTitle>
              <Star className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{Math.round(totalProgress)}%</div>
              <Progress value={totalProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Tabla de calificación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Evaluaciones Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminGradingTable 
              onAssignmentUpdate={() => {}} // Función vacía por ahora
              searchTerm=""
              onSearchTermChange={() => {}}
              currentUser={user}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}