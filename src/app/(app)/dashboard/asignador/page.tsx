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
  Filter,
  FileDown,
  Download
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RouteProtector } from '@/components/dashboard/RouteProtector';
import { AssignedIndicator, User, Faculty, ProfessionalSchool, Office, Perspective } from '@/lib/types';
import { getAllAssignedIndicators, getAllUsers, getAllFaculties, getAllProfessionalSchools, getAllOffices, getAllPerspectives } from '@/lib/data';
import { isPast, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VerificationStatus } from '@/lib/types';

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

export default function AsignadorDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allAssignments, allUsers, facultiesData, schoolsData, officesData, perspectivesData] = await Promise.all([
          getAllAssignedIndicators(),
          getAllUsers(),
          getAllFaculties(),
          getAllProfessionalSchools(),
          getAllOffices(),
          getAllPerspectives()
        ]);
        
        // Mostrar SOLO las asignaciones creadas por el asignador actual
        const asignadorAssignments = allAssignments.filter((a: any) => a.assignerId === user?.id);
        
        setAssignments(asignadorAssignments);
        setUsers(allUsers);
        setFaculties(facultiesData);
        setProfessionalSchools(schoolsData);
        setOffices(officesData);
        setPerspectives(perspectivesData);
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
  const completedAssignments = normalized.filter(a => a.derivedStatus === 'Approved' || a.derivedStatus === 'Rejected').length;
  const activeAssignments = normalized.filter(a => a.derivedStatus === 'Submitted').length;
  const pendingAssignments = normalized.filter(a => a.derivedStatus === 'Pending').length;
  const overdueAssignments = normalized.filter(a => a.derivedStatus === 'Overdue').length;

  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  // Agrupar asignaciones por fecha
  const assignmentsByDate = normalized.reduce((acc, assignment) => {
    // Manejar tanto objetos Timestamp de Firestore como fechas normales
    const date = assignment.assignedDateObj || new Date(0);
    
    const dateString = date.toLocaleDateString();
    if (!acc[dateString]) {
      acc[dateString] = [];
    }
    acc[dateString].push(assignment);
    return acc;
  }, {} as Record<string, AssignedIndicator[]>);

  const recentAssignments = normalized
    .sort((a, b) => {
      const dateA = a.assignedDateObj || new Date(0);
      const dateB = b.assignedDateObj || new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const getStudentName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    return student?.name || 'Usuario desconocido';
  };

  const getFacultyName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    if (!student?.facultyId) return 'Sin facultad';
    const faculty = faculties.find(f => f.id === student.facultyId);
    return faculty?.name || 'Sin facultad';
  };

  const getSchoolName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    if (!student?.professionalSchoolId) return 'Sin escuela';
    const school = professionalSchools.find(s => s.id === student.professionalSchoolId);
    return school?.name || 'Sin escuela';
  };

  const getOfficeName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    if (!student?.officeId) return 'Sin oficina';
    const office = offices.find(o => o.id === student.officeId);
    return office?.name || 'Sin oficina';
  };

  const getPerspectiveName = (perspectiveId: string) => {
    const perspective = perspectives.find(p => p.id === perspectiveId);
    return perspective?.name || 'Sin perspectiva';
  };

  const getJuryNames = (juryIds: string[]) => {
    if (!juryIds.length) return 'Sin jurado asignado';
    const names = juryIds
      .map(id => users.find(u => u.id === id)?.name)
      .filter(Boolean) as string[];
    return names.length ? names.join(', ') : 'Sin jurado asignado';
  };

  const formatDueDate = (dueDate: any) => {
    const d = parseDate(dueDate);
    if (!d) return 'Sin fecha límite';
    return format(d, 'dd-MMM-yyyy', { locale: es });
  };

  const getLocationInfo = (userId: string) => {
    const facultyName = getFacultyName(userId);
    const schoolName = getSchoolName(userId);
    const officeName = getOfficeName(userId);
    
    const hasFaculty = facultyName && !facultyName.includes('Sin facultad');
    const hasOffice = officeName && !officeName.includes('Sin oficina');
    
    if (hasFaculty) {
      return {
        type: 'Facultad',
        value: `${facultyName}${schoolName !== 'Sin escuela' ? ` - ${schoolName}` : ''}`
      };
    } else if (hasOffice) {
      return {
        type: 'Oficina',
        value: officeName
      };
    } else {
      return {
        type: 'Sin asignar',
        value: 'No asignado'
      };
    }
  };

  // Reportes para Asignador
  const generatePDFReport = async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Reporte de Asignador', 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${format(new Date(), 'dd-MMM-yyyy', { locale: es })}`, 40, 60);

    // Resumen
    // @ts-ignore
    doc.autoTable({
      startY: 90,
      styles: { fontSize: 10 },
      head: [['Total', 'Completadas', 'Activas', 'Pendientes']],
      body: [[totalAssignments, completedAssignments, activeAssignments, pendingAssignments]]
    });

    // Detalle
    doc.text('Asignaciones', 40, (doc as any).lastAutoTable.finalY + 30);
    // @ts-ignore
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 40,
      styles: { fontSize: 9 },
      head: [['ID', 'Responsable', 'Perspectiva', 'Estado', 'Asignada', 'Vence']],
      body: normalized.slice(0, 200).map(a => [
        a.id || '-',
        getStudentName(a.userId),
        getPerspectiveName(a.perspectiveId || ''),
        statusTranslations[a.derivedStatus || 'Pending'],
        a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
        a.dueDateObj ? format(a.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
      ])
    });

    doc.save(`reporte-asignador-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateExcelReport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const resumen = [
      ['Reporte de Asignador'],
      ['Fecha', format(new Date(), 'dd-MMM-yyyy', { locale: es })],
      [],
      ['Total', totalAssignments],
      ['Completadas', completedAssignments],
      ['Activas', activeAssignments],
      ['Pendientes', pendingAssignments],
    ];
    const resumenSheet = XLSX.utils.aoa_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

    const header = ['ID', 'Responsable', 'Perspectiva', 'Estado', 'Asignada', 'Vence'];
    const rows = normalized.map(a => [
      a.id || '-',
      getStudentName(a.userId),
      getPerspectiveName(a.perspectiveId || ''),
      statusTranslations[a.derivedStatus || 'Pending'],
      a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
      a.dueDateObj ? format(a.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
    ]);
    const detalleSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, detalleSheet, 'Detalle');
    XLSX.writeFile(wb, `reporte-asignador-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <RouteProtector allowedRoles={['asignador']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Asignador</h1>
            <p className="text-muted-foreground">
              Bienvenido, {user?.name}. Aquí puedes gestionar las asignaciones de tu facultad.
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
          <Button onClick={() => window.location.href = '/assign-indicators'}>
            <UserPlus className="h-4 w-4 mr-2" />
            Asignar Indicador
          </Button>
        </div>
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
                <div className="space-y-4">
                  {recentAssignments.map((assignment) => {
                    const locationInfo = getLocationInfo(assignment.userId);
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-foreground">
                              {getStudentName(assignment.userId)}
                            </p>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId || '')}</p>
                            <p><span className="font-medium">{locationInfo.type}:</span> {locationInfo.value}</p>
                            <p><span className="font-medium">Jurado:</span> {getJuryNames(assignment.jury || [])}</p>
                            <p><span className="font-medium">Fecha de Vencimiento:</span> {formatDueDate(assignment.dueDate)}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            className={statusColors[assignment.derivedStatus || 'Pending']}
                          >
                            {statusTranslations[assignment.derivedStatus || 'Pending']}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
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
                        <div className="space-y-3">
                          {dateAssignments.map((assignment) => {
                            const locationInfo = getLocationInfo(assignment.userId);
                            return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium text-foreground">
                                      {getStudentName(assignment.userId)}
                                    </p>
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId || '')}</p>
                                    <p><span className="font-medium">{locationInfo.type}:</span> {locationInfo.value}</p>
                                    <p><span className="font-medium">Jurado:</span> {getJuryNames(assignment.jury || [])}</p>
                                    <p><span className="font-medium">Fecha de Vencimiento:</span> {formatDueDate(assignment.dueDate)}</p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                  <Badge 
                                    className={statusColors[assignment.overallStatus || 'Pending']}
                                    //  className={statusColors[assignment.derivedStatus || 'Pending']}
                                    variant="outline"
                                  >
                                    {statusTranslations[assignment.overallStatus || 'Pending']}
                                     {/* className={statusColors[assignment.derivedStatus || 'Pending']} */}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
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
                <div className="space-y-4">
                  {assignments
                    // .filter(assignment => assignment.derivedStatus === 'Submitted')
                    .filter(assignment => assignment.overallStatus === 'Submitted')
                    .map((assignment) => {
                      const locationInfo = getLocationInfo(assignment.userId);
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <p className="font-medium text-foreground">
                                {getStudentName(assignment.userId)}
                              </p>
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId || '')}</p>
                              <p><span className="font-medium">{locationInfo.type}:</span> {locationInfo.value}</p>
                              <p><span className="font-medium">Jurado:</span> {getJuryNames(assignment.jury || [])}</p>
                              <p><span className="font-medium">Fecha de Vencimiento:</span> {formatDueDate(assignment.dueDate)}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              En Evaluación
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
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
                <div className="space-y-4">
                  {assignments
                    .filter(assignment => assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected')
                    .map((assignment) => {
                      const locationInfo = getLocationInfo(assignment.userId);
                      const isApproved = assignment.overallStatus === 'Approved';
                      return (
                        <div
                          key={assignment.id}
                          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors ${
                            isApproved 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className={`h-4 w-4 ${isApproved ? 'text-green-600' : 'text-red-600'}`} />
                              <p className="font-medium text-foreground">
                                {getStudentName(assignment.userId)}
                              </p>
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId || '')}</p>
                              <p><span className="font-medium">{locationInfo.type}:</span> {locationInfo.value}</p>
                              <p><span className="font-medium">Jurado:</span> {getJuryNames(assignment.jury || [])}</p>
                              <p><span className="font-medium">Fecha de Vencimiento:</span> {formatDueDate(assignment.dueDate)}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              className={
                                isApproved 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {isApproved ? 'Aprobada' : 'Rechazada'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
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