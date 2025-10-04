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
  Timer,
  FileDown,
  Download
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AssignedIndicator, VerificationStatus, User } from '@/lib/types';
import { isPast, format } from 'date-fns';
import { es } from 'date-fns/locale';
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
      return vm.status === 'Pending' && due && isPast(due);
    });
    return overdue ? 'Overdue' : 'Pending';
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

  const totalEvaluations = normalized.length;
  const completedEvaluations = normalized.filter(
    assignment => assignment.derivedStatus === 'Approved' || assignment.derivedStatus === 'Rejected'
  ).length;
  const pendingEvaluations = normalized.filter(
    assignment => assignment.derivedStatus === 'Submitted'
  ).length;
  const overdueEvaluations = normalized.filter(
    assignment => assignment.derivedStatus === 'Overdue'
  ).length;

  const completionRate = totalEvaluations > 0 ? (completedEvaluations / totalEvaluations) * 100 : 0;

  const recentEvaluations = normalized
    .sort((a, b) => (b.assignedDateObj?.getTime() || 0) - (a.assignedDateObj?.getTime() || 0))
    .slice(0, 5);

  const getStudentName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    return student?.name || 'Usuario desconocido';
  };

  const getFacultyName = (facultyId: string) => {
    // Aquí podrías implementar la lógica para obtener el nombre de la facultad
    return facultyId || 'Facultad no especificada';
  };

  // Reportes para Calificador
  const generatePDFReport = async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Reporte de Calificador', 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${format(new Date(), 'dd-MMM-yyyy', { locale: es })}`, 40, 60);

    // Resumen
    // @ts-ignore
    doc.autoTable({
      startY: 90,
      styles: { fontSize: 10 },
      head: [['Total', 'Completadas', 'Pendientes', 'Vencidas']],
      body: [[totalEvaluations, completedEvaluations, pendingEvaluations, overdueEvaluations]]
    });

    // Evaluaciones recientes
    doc.text('Evaluaciones Recientes', 40, (doc as any).lastAutoTable.finalY + 30);
    // @ts-ignore
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 40,
      styles: { fontSize: 9 },
      head: [['ID', 'Responsable', 'Estado', 'Asignada']],
      body: normalized.slice(0, 50).map(a => [
        a.id || '-',
        getStudentName(a.userId),
        statusTranslations[a.derivedStatus || 'Pending'],
        a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
      ])
    });

    doc.save(`reporte-calificador-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateExcelReport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const resumen = [
      ['Reporte de Calificador'],
      ['Fecha', format(new Date(), 'dd-MMM-yyyy', { locale: es })],
      [],
      ['Total', totalEvaluations],
      ['Completadas', completedEvaluations],
      ['Pendientes', pendingEvaluations],
      ['Vencidas', overdueEvaluations],
    ];
    const resumenSheet = XLSX.utils.aoa_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

    const header = ['ID', 'Responsable', 'Estado', 'Asignada'];
    const rows = normalized.map(a => [
      a.id || '-',
      getStudentName(a.userId),
      statusTranslations[a.derivedStatus || 'Pending'],
      a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
    ]);
    const detalleSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, detalleSheet, 'Detalle');
    XLSX.writeFile(wb, `reporte-calificador-${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="flex gap-2">
          <Button onClick={async () => await generatePDFReport()} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Reporte PDF
          </Button>
          <Button onClick={async () => await generateExcelReport()} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Reporte Excel
          </Button>
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
                    .filter(assignment => assignment.derivedStatus === 'Submitted')
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
                              Presentado el {new Date().toLocaleDateString()}
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
                    .filter(assignment => assignment.derivedStatus === 'Overdue')
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
                              Vencida el {assignment.dueDateObj ? format(assignment.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'}
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
                    .filter(assignment => assignment.derivedStatus === 'Approved' || assignment.derivedStatus === 'Rejected')
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
                            Asignada el {assignment.assignedDateObj ? format(assignment.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={statusColors[assignment.derivedStatus || 'Pending']}
                        >
                          {statusTranslations[assignment.derivedStatus || 'Pending']}
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