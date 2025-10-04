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
import { AssignedIndicator, User, Faculty, ProfessionalSchool, Office, Perspective } from '@/lib/types';
import { getAllAssignedIndicators, getAllUsers, getAllFaculties, getAllProfessionalSchools, getAllOffices, getAllPerspectives } from '@/lib/data';
import { calculateOverallStatus, STATUS_COLORS, STATUS_TRANSLATIONS } from '@/lib/status-utils';
import { generateProfessionalPDF, generateProfessionalExcel } from '@/lib/report-utils';


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
        
        // Filtrar por assignerId si está disponible - ESTO ES LO QUE NECESITAS PARA EL PUNTO 4
        const asignadorAssignments = allAssignments.filter((assignment: any) => {
          // Verificar si el assignment tiene assignerId y coincide con el usuario actual
          if (assignment.assignerId && user?.id) {
            return assignment.assignerId === user.id;
          }
          // Si no hay assignerId, mostrar todas (compatibilidad hacia atrás)
          return true;
        }).map(assignment => ({
          ...assignment,
          calculatedStatus: calculateOverallStatus(assignment)
        }));
        
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

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    assignment => assignment.calculatedStatus === 'Approved' || assignment.calculatedStatus === 'Rejected'
  ).length;
  const pendingAssignments = assignments.filter(
    assignment => assignment.calculatedStatus === 'Pending'
  ).length;
  const activeAssignments = assignments.filter(
    assignment => assignment.calculatedStatus === 'Submitted'
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
    acc[dateString].push({
      ...assignment,
      calculatedStatus: calculateOverallStatus(assignment)
    });
    return acc;
  }, {} as Record<string, (AssignedIndicator & { calculatedStatus: any })[]>);

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
    .slice(0, 5)
    .map(assignment => ({
      ...assignment,
      calculatedStatus: calculateOverallStatus(assignment)
    }));

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
    if (!dueDate) return 'Sin fecha límite';
    const date = new Date(dueDate);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Funciones para generar reportes
  const generatePDFReport = () => {
    generateProfessionalPDF({
      title: 'Reporte de Asignador',
      user: user,
      date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      stats: {
        total: totalAssignments,
        completed: completedAssignments,
        active: activeAssignments,
        pending: pendingAssignments,
        overdue: assignments.filter(a => calculateOverallStatus(a) === 'Overdue').length,
        completionRate: completionRate.toFixed(1) + '%'
      },
      assignments: assignments,
      users: users,
      faculties: faculties
    });
  };

  const generateExcelReport = () => {
    generateProfessionalExcel({
      title: 'Reporte de Asignador',
      user: user,
      date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      stats: {
        total: totalAssignments,
        completed: completedAssignments,
        active: activeAssignments,
        pending: pendingAssignments,
        overdue: assignments.filter(a => calculateOverallStatus(a) === 'Overdue').length,
        completionRate: completionRate.toFixed(1) + '%'
      },
      assignments: assignments,
      users: users,
      faculties: faculties
    });
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
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/assign-indicators'}>
            <UserPlus className="h-4 w-4 mr-2" />
            Asignar Indicador
          </Button>
          <Button onClick={generatePDFReport} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Reporte PDF
          </Button>
          <Button onClick={generateExcelReport} variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reporte Excel
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
                            <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId)}</p>
                            <p><span className="font-medium">{locationInfo.type}:</span> {locationInfo.value}</p>
                            <p><span className="font-medium">Jurado:</span> {getJuryNames(assignment.jury || [])}</p>
                            <p><span className="font-medium">Fecha de Vencimiento:</span> {formatDueDate(assignment.dueDate)}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            className={STATUS_COLORS[assignment.calculatedStatus || 'Pending']}
                          >
                            {STATUS_TRANSLATIONS[assignment.calculatedStatus || 'Pending']}
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
                                    <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId)}</p>
                                    <p><span className="font-medium">{locationInfo.type}:</span> {locationInfo.value}</p>
                                    <p><span className="font-medium">Jurado:</span> {getJuryNames(assignment.jury || [])}</p>
                                    <p><span className="font-medium">Fecha de Vencimiento:</span> {formatDueDate(assignment.dueDate)}</p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                  <Badge 
                                    className={STATUS_COLORS[assignment.calculatedStatus || 'Pending']}
                                    variant="outline"
                                  >
                                    {STATUS_TRANSLATIONS[assignment.calculatedStatus || 'Pending']}
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
                    .filter(assignment => calculateOverallStatus(assignment) === 'Submitted')
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
                              <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId)}</p>
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
                    .filter(assignment => {
                      const status = calculateOverallStatus(assignment);
                      return status === 'Approved' || status === 'Rejected';
                    })
                    .map((assignment) => {
                      const locationInfo = getLocationInfo(assignment.userId);
                      const calculatedStatus = calculateOverallStatus(assignment);
                      const isApproved = calculatedStatus === 'Approved';
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
                              <p><span className="font-medium">Perspectiva:</span> {getPerspectiveName(assignment.perspectiveId)}</p>
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
  );
} 