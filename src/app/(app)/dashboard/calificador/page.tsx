"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileCheck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  Users,
  Star,
  Timer
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AssignedIndicator, VerificationStatus, User } from '@/lib/types';
import { getAllAssignedIndicators, getAllUsers } from '@/lib/data';
import { formatDateSpanish } from '@/lib/dateUtils';

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

export default function CalificadorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allAssignments, allUsers] = await Promise.all([
          getAllAssignedIndicators(),
          getAllUsers()
        ]);
        
        // Filtrar asignaciones donde el usuario actual es parte del jurado
        const calificadorAssignments = allAssignments.filter(
          assignment => assignment.jury?.includes(user?.id || '')
        );
        
        setAssignments(calificadorAssignments);
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalEvaluations = assignments.length;
  const completedEvaluations = assignments.filter(
    assignment => assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected'
  ).length;
  const pendingEvaluations = assignments.filter(
    assignment => assignment.overallStatus === 'Submitted'
  ).length;
  const overdueEvaluations = assignments.filter(
    assignment => assignment.overallStatus === 'Overdue'
  ).length;

  const completionRate = totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0;

  const recentEvaluations = assignments
    .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
    .slice(0, 5);

  const getStudentName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    return student?.name || 'Usuario desconocido';
  };

  const getFacultyName = (facultyId: string) => {
    // Aquí podrías implementar la lógica para obtener el nombre de la facultad
    return facultyId || 'Facultad no especificada';
  };

  const handleViewDetails = (assignmentId: string) => {
    // Para calificadores, ir a la página de calificación general
    // Pasamos el ID como parámetro para que la página pueda mostrar directamente esa asignación
    router.push(`/admin/grading?assignment=${assignmentId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Calificador</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.name}. Aquí puedes gestionar tus evaluaciones.
          </p>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluaciones</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Evaluaciones asignadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Evaluaciones finalizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Por evaluar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progreso general */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Evaluación</CardTitle>
          <CardDescription>
            Tu progreso en todas las evaluaciones asignadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tasa de Completación</span>
              <span className="text-sm font-bold">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {completionRate > 50 ? '¡Excelente trabajo!' : 'Continúa evaluando'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones Pendientes</CardTitle>
              <CardDescription>
                Evaluaciones que requieren tu atención
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingEvaluations === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p>¡Excelente! No tienes evaluaciones pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                                     {assignments
                     .filter(assignment => assignment.overallStatus === 'Submitted')
                     .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileCheck className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">
                              {getStudentName(assignment.userId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Asignación #{assignment.id} • {getFacultyName(assignment.userId)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Presentado el {formatDateSpanish(new Date())}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            Por evaluar
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(assignment.id!)}
                          >
                            Evaluar ahora
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones Vencidas</CardTitle>
              <CardDescription>
                Evaluaciones que requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueEvaluations === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Timer className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p>¡Perfecto! No tienes evaluaciones vencidas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments
                    .filter(assignment => assignment.overallStatus === 'Overdue')
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium">
                              {getStudentName(assignment.userId)}
                            </p>
                            <p className="text-sm text-red-600">
                              Vencida el {assignment.dueDate ? formatDateSpanish(assignment.dueDate) : 'Fecha no disponible'}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleViewDetails(assignment.id!)}
                        >
                          Evaluar urgente
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones Completadas</CardTitle>
              <CardDescription>
                Tus evaluaciones finalizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedEvaluations === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aún no has completado evaluaciones</p>
                </div>
              ) : (
                <div className="space-y-3">
                                     {assignments
                     .filter(assignment => assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected')
                     .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">
                              {getStudentName(assignment.userId)}
                            </p>
                            <p className="text-sm text-green-600">
                              Evaluación completada
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={
                            assignment.overallStatus === 'Approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {assignment.overallStatus === 'Approved' ? 'Aprobada' : 'Rechazada'}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones Recientes</CardTitle>
              <CardDescription>
                Tus evaluaciones más recientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvaluations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tienes evaluaciones recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvaluations.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {getStudentName(assignment.userId)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Asignación #{assignment.id} • {getFacultyName(assignment.userId)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Asignada el {formatDateSpanish(assignment.assignedDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={statusColors[assignment.overallStatus || 'Pending']}
                        >
                          {statusTranslations[assignment.overallStatus || 'Pending']}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(assignment.id!)}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 