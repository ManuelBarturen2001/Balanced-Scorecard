"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  UserPlus,
  FileText,
  Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AssignedIndicator, User } from '@/lib/types';
import { getAllAssignedIndicators, getAllUsers } from '@/lib/data';

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

export default function AsignadorDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allAssignments, allUsers] = await Promise.all([
          getAllAssignedIndicators(),
          getAllUsers()
        ]);
        
        // Filtrar asignaciones por facultad del asignador
        const asignadorAssignments = allAssignments.filter(assignment => {
          // Aquí deberías implementar la lógica para filtrar por facultad del asignador
          return true; // Por ahora mostramos todas
        });
        
        setAssignments(asignadorAssignments);
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

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    assignment => assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected'
  ).length;
  const pendingAssignments = assignments.filter(
    assignment => assignment.overallStatus === 'Pending'
  ).length;
  const activeAssignments = assignments.filter(
    assignment => assignment.overallStatus === 'Submitted'
  ).length;

  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  // Agrupar asignaciones por fecha
  const assignmentsByDate = assignments.reduce((acc, assignment) => {
    // Manejar tanto objetos Timestamp de Firestore como fechas normales
    let date: Date;
    if (assignment.assignedDate && typeof assignment.assignedDate === 'object' && 'seconds' in assignment.assignedDate) {
      // Es un Timestamp de Firestore
      const timestamp = assignment.assignedDate as { seconds: number };
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Es una fecha normal
      date = new Date(assignment.assignedDate);
    }
    
    const dateString = date.toLocaleDateString();
    if (!acc[dateString]) {
      acc[dateString] = [];
    }
    acc[dateString].push(assignment);
    return acc;
  }, {} as Record<string, AssignedIndicator[]>);

  const recentAssignments = assignments
    .sort((a, b) => {
      // Manejar tanto objetos Timestamp de Firestore como fechas normales
      let dateA: Date, dateB: Date;
      
      if (a.assignedDate && typeof a.assignedDate === 'object' && 'seconds' in a.assignedDate) {
        const timestampA = a.assignedDate as { seconds: number };
        dateA = new Date(timestampA.seconds * 1000);
      } else {
        dateA = new Date(a.assignedDate);
      }
      
      if (b.assignedDate && typeof b.assignedDate === 'object' && 'seconds' in b.assignedDate) {
        const timestampB = b.assignedDate as { seconds: number };
        dateB = new Date(timestampB.seconds * 1000);
      } else {
        dateB = new Date(b.assignedDate);
      }
      
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const getStudentName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    return student?.name || 'Usuario desconocido';
  };

  const getFacultyName = (facultyId: string) => {
    // Aquí podrías implementar la lógica para obtener el nombre de la facultad
    return facultyId || 'Facultad no especificada';
  };

  const getJuryNames = (juryIds: string[]) => {
    return juryIds.map(id => {
      const juryMember = users.find(u => u.id === id);
      return juryMember?.name || 'Calificador desconocido';
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Asignador</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.name}. Aquí puedes gestionar las asignaciones de tu facultad.
          </p>
        </div>
        <Button onClick={() => window.location.href = '/assign-indicators'}>
          <UserPlus className="h-4 w-4 mr-2" />
          Asignar Indicador
        </Button>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignaciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Asignaciones creadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Evaluaciones finalizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeAssignments}</div>
            <p className="text-xs text-muted-foreground">
              En proceso de evaluación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Sin iniciar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progreso general */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Asignaciones</CardTitle>
          <CardDescription>
            Progreso general de todas las asignaciones de tu facultad
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
              {completionRate > 50 ? '¡Excelente progreso!' : 'Continúa asignando'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
          <TabsTrigger value="by-date">Por Fecha</TabsTrigger>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Recientes</CardTitle>
              <CardDescription>
                Tus asignaciones más recientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tienes asignaciones recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {getStudentName(assignment.userId)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Asignación #{assignment.id} • {getFacultyName(assignment.userId)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Jurado: {getJuryNames(assignment.jury || [])}
                          </p>
                        </div>
                      </div>
                                             <div className="flex items-center gap-2">
                         <Badge 
                           className={statusColors[assignment.overallStatus || 'Pending']}
                         >
                           {statusTranslations[assignment.overallStatus || 'Pending']}
                         </Badge>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-date" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones por Fecha</CardTitle>
              <CardDescription>
                Organizadas por fecha de asignación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(assignmentsByDate).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay asignaciones para mostrar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(assignmentsByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, dateAssignments]) => (
                      <div key={date} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{date}</h4>
                          <Badge variant="outline">
                            {dateAssignments.length} asignaciones
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {dateAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {getStudentName(assignment.userId)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  #{assignment.id}
                                </p>
                              </div>
                              <Badge 
                                className={statusColors[assignment.overallStatus || 'Pending']}
                                variant="outline"
                              >
                                {statusTranslations[assignment.overallStatus || 'Pending']}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Activas</CardTitle>
              <CardDescription>
                Asignaciones en proceso de evaluación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeAssignments === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p>No hay asignaciones activas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments
                    .filter(assignment => assignment.overallStatus === 'Submitted')
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                                                   <div>
                           <p className="font-medium">
                             {getStudentName(assignment.userId)}
                           </p>
                           <p className="text-sm text-blue-600">
                             En evaluación por: {getJuryNames(assignment.jury || [])}
                           </p>
                         </div>
                       </div>
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
              <CardTitle>Asignaciones Completadas</CardTitle>
              <CardDescription>
                Evaluaciones finalizadas exitosamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedAssignments === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aún no hay asignaciones completadas</p>
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
                              Evaluado por: {getJuryNames(assignment.jury || [])}
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
      </Tabs>
    </div>
  );
} 