"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Award,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RouteProtector } from '@/components/dashboard/RouteProtector';
import { AssignedIndicator, VerificationStatus } from '@/lib/types';
import { isPast, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllAssignedIndicators } from '@/lib/data';

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Submitted: 'bg-blue-100 text-blue-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Overdue: 'bg-orange-100 text-orange-800',
  Observed: 'bg-amber-100 text-amber-800',
};

const statusTranslations = {
  Pending: 'Pendiente',
  Submitted: 'Presentado',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
  Overdue: 'Vencido',
  Observed: 'Observado',
};

export default function UsuarioDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const allAssignments = await getAllAssignedIndicators();
        const userAssignments = allAssignments.filter(
          assignment => assignment.userId === user?.id
        );
        setAssignments(userAssignments);
      } catch (error) {
        console.error('Error loading assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAssignments();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (typeof date === 'object' && 'seconds' in date) return new Date((date as any).seconds * 1000);
    if (typeof date === 'object' && typeof (date as any).toDate === 'function') return (date as any).toDate();
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  };

  const deriveStatus = (a: AssignedIndicator): VerificationStatus => {
    const base = a.overallStatus || 'Pending';
    if (base === 'Approved' || base === 'Rejected' || base === 'Submitted') return base;
    const overdue = a.assignedVerificationMethods?.some(vm => {
      const due = parseDate((vm as any).dueDate);
      return (vm.status === 'Pending' || vm.status === 'Observed') && due && isPast(due);
    });
    return overdue ? 'Overdue' : (base === 'Observed' ? 'Observed' : 'Pending');
  };

  const normalized = assignments.map(a => ({
    ...a,
    derivedStatus: deriveStatus(a),
    assignedDateObj: parseDate((a as any).assignedDate),
    dueDateObj: (() => {
      const dates = (a.assignedVerificationMethods || []).map(vm => parseDate((vm as any).dueDate)).filter(Boolean) as Date[];
      if (dates.length === 0) return parseDate((a as any).dueDate);
      return new Date(Math.min(...dates.map(d => d.getTime())));
    })()
  }));

  const totalAssignments = normalized.length;
  const completedAssignments = normalized.filter(a => a.derivedStatus === 'Approved').length;
  const pendingAssignments = normalized.filter(a => a.derivedStatus === 'Pending').length;
  const overdueAssignments = normalized.filter(a => a.derivedStatus === 'Overdue').length;

  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  const recentAssignments = normalized
    .sort((a, b) => (b.assignedDateObj?.getTime() || 0) - (a.assignedDateObj?.getTime() || 0))
    .slice(0, 5);

  return (
    <RouteProtector allowedRoles={['responsable']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Usuario</h1>
            <p className="text-muted-foreground">
              Bienvenido, {user?.name}. Aquí puedes ver tu progreso y asignaciones.
            </p>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignaciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Asignaciones recibidas
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
              Aprobadas exitosamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">
              En proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progreso general */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso General</CardTitle>
          <CardDescription>
            Tu progreso en todas las asignaciones
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
              {completionRate > 50 ? '¡Excelente progreso!' : 'Continúa trabajando'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Asignaciones Recientes</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
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
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Asignación #{assignment.id}</p>
                          <p className="text-sm text-muted-foreground">
                            
                            Asignada el {assignment.assignedDateObj ? format(assignment.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'} | Vence el {assignment.dueDateObj ? format(assignment.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={statusColors[assignment.derivedStatus || 'Pending']}
                        >
                          {statusTranslations[assignment.derivedStatus || 'Pending']}
                        </Badge>
                        <Button variant="outline" size="sm">
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

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Vencidas</CardTitle>
              <CardDescription>
                Asignaciones que requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueAssignments === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p>¡Excelente! No tienes asignaciones vencidas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {normalized
                    .filter(assignment => assignment.derivedStatus === 'Overdue')
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium">Asignación #{assignment.id}</p>
                            <p className="text-sm text-red-600">
                              Vencida el {assignment.dueDateObj ? format(assignment.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'}
                            </p>
                          </div>
                        </div>
                        <Button variant="destructive" size="sm">
                          Completar ahora
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
              <CardTitle>Asignaciones Completadas</CardTitle>
              <CardDescription>
                Tus asignaciones aprobadas exitosamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedAssignments === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aún no tienes asignaciones completadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {normalized
                    .filter(assignment => assignment.derivedStatus === 'Approved')
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">Asignación #{assignment.id}</p>
                            <p className="text-sm text-green-600">
                              Completada exitosamente
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Aprobada
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
    </RouteProtector>
  );
} 