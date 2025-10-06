"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Users, Filter, Search, Calendar, Award, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignmentCard } from '@/components/my-assignments/AssignmentCard';
import { AssignmentDetailsModal } from '@/components/my-assignments/AssignmentDetailsModal';
import { UserAssignmentCard } from '@/components/my-assignments/UserAssignmentCard';
import { getCollectionWhereCondition } from '@/lib/firebase-functions';
import { getAllAssignedIndicators, getAllUsers, getAllFaculties, getAllProfessionalSchools, getAllPerspectives, getAllOffices } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AssignedIndicator, User, Faculty, ProfessionalSchool, Perspective, Office } from '@/lib/types';

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

export default function MyAssignmentsPage() {
  const { user, loading: authLoading, isAsignador } = useAuth();
  const [userAssignments, setUserAssignments] = useState<AssignedIndicator[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignedIndicator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('recent');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        try {
          if (isAsignador) {
            // Para asignadores: obtener solo las asignaciones creadas por el asignador actual
            const [allAssignments, allUsersData, facultiesData, schoolsData, perspectivesData, officesData] = await Promise.all([
              getAllAssignedIndicators(),
              getAllUsers(),
              getAllFaculties(),
              getAllProfessionalSchools(),
              getAllPerspectives(),
              getAllOffices()
            ]);
            const ownAssignments = (allAssignments as any[]).filter(a => a.assignerId === user.id);
            setUserAssignments(ownAssignments as any);
            setAllUsers(allUsersData);
            setFaculties(facultiesData);
            setProfessionalSchools(schoolsData);
            setPerspectives(perspectivesData);
            setOffices(officesData);
          } else {
            // Para usuarios normales: obtener solo sus asignaciones
            const allAssignedIndicators = await getCollectionWhereCondition('assigned_indicator', 'userId', user.id);
            console.log('Fetched assignments:', allAssignedIndicators);
            if (allAssignedIndicators) {
              setUserAssignments(allAssignedIndicators as AssignedIndicator[]);
            }
          }
        } catch (error) {
          console.error('Error fetching assignments:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading && !user) {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, isAsignador]);

  // Variables para estadísticas (opcional, se pueden usar en el futuro)
  const completedAssignments = userAssignments.filter(assignment => 
    assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected'
  );
  
  const pendingAssignments = userAssignments.filter(assignment => 
    assignment.overallStatus === 'Pending' || assignment.overallStatus === 'Submitted'
  );

  // Funciones para asignadores
  const getStudentName = (userId: string) => {
    const student = allUsers.find(u => u.id === userId);
    return student?.name || 'Usuario desconocido';
  };

  const getFacultyName = (userId: string) => {
    const student = allUsers.find(u => u.id === userId);
    if (!student?.facultyId) return 'Sin facultad';
    
    const faculty = faculties.find(f => f.id === student.facultyId);
    return faculty?.name || 'Sin facultad';
  };

  const getSchoolName = (userId: string) => {
    const student = allUsers.find(u => u.id === userId);
    if (!student?.professionalSchoolId) return 'Sin escuela';
    const school = professionalSchools.find(s => s.id === student.professionalSchoolId);
    return school?.name || 'Sin escuela';
  };

  const getOfficeName = (userId: string) => {
    const student = allUsers.find(u => u.id === userId);
    if (!student?.officeId) return 'Sin oficina';
    const office = offices.find(o => o.id === student.officeId);
    return office?.name || 'Sin oficina';
  };

  const getPerspectiveName = (perspectiveId: string) => {
    const perspective = perspectives.find(p => p.id === perspectiveId);
    return perspective?.name || 'Sin perspectiva';
  };

  const getJuryNames = (juryIds: string[] = []) => {
    if (!juryIds.length) return 'Sin jurado asignado';
    const names = juryIds
      .map(id => allUsers.find(u => u.id === id)?.name)
      .filter(Boolean) as string[];
    return names.length ? names.join(', ') : 'Sin jurado asignado';
  };

  // Filtrar asignaciones para asignadores
  const getFilteredAssignments = () => {
    if (!isAsignador) return userAssignments;
    
    let filtered = userAssignments;
    
    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(assignment => {
        const studentName = getStudentName(assignment.userId);
        return studentName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Filtro por facultad
    if (selectedFaculty !== 'all') {
      filtered = filtered.filter(assignment => {
        const student = allUsers.find(u => u.id === assignment.userId);
        return student?.facultyId === selectedFaculty;
      });
    }
    
    // Filtro por estado
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(assignment => 
        assignment.overallStatus === selectedStatus
      );
    }
    
    // Filtro por fecha
    if (dateFilter !== 'recent') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      filtered = filtered.filter(assignment => {
        let assignmentDate: Date;
        if (assignment.assignedDate && typeof assignment.assignedDate === 'object' && 'seconds' in assignment.assignedDate) {
          const timestamp = assignment.assignedDate as { seconds: number };
          assignmentDate = new Date(timestamp.seconds * 1000);
        } else {
          assignmentDate = new Date(assignment.assignedDate);
        }
        
        switch (dateFilter) {
          case 'oldest':
            return true; // Se ordenará después
          case 'this-month':
            return assignmentDate.getMonth() === currentMonth && assignmentDate.getFullYear() === currentYear;
          case 'last-month':
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            return assignmentDate.getMonth() === lastMonth && assignmentDate.getFullYear() === lastMonthYear;
          case 'this-year':
            return assignmentDate.getFullYear() === currentYear;
          default:
            return true;
        }
      });
    }
    
    // Ordenar por fecha
    filtered.sort((a, b) => {
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
      
      return dateFilter === 'oldest' 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });
    
    return filtered;
  };

  const filteredAssignments = getFilteredAssignments();



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
              <p className="text-muted-foreground">Debes iniciar sesión para ver tus asignaciones.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isAsignador ? 'Mis Asignaciones Creadas' : 'Mis Asignaciones'}
            </h1>
            <p className="text-muted-foreground">
              {isAsignador 
                ? 'Aquí puedes ver todas las asignaciones que has creado'
                : 'Aquí puedes ver las asignaciones que te han hecho'
              }
            </p>
          </div>
          {isAsignador && (
            <Button onClick={() => window.location.href = '/assign-indicators'}>
              <Users className="h-4 w-4 mr-2" />
              Crear Nueva Asignación
            </Button>
          )}
        </div>

        {/* Filtros */}
        {isAsignador && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Búsqueda por texto */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Filtro por facultad */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Facultad</label>
                  <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las facultades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las facultades</SelectItem>
                      {faculties.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por estado */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="Pending">Pendiente</SelectItem>
                      <SelectItem value="Submitted">Presentado</SelectItem>
                      <SelectItem value="Approved">Aprobado</SelectItem>
                      <SelectItem value="Rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por fecha */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordenar por fecha</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Más recientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Más recientes</SelectItem>
                      <SelectItem value="oldest">Más antiguos</SelectItem>
                      <SelectItem value="this-month">Este mes</SelectItem>
                      <SelectItem value="last-month">Mes pasado</SelectItem>
                      <SelectItem value="this-year">Este año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {filteredAssignments.length} asignaciones encontradas
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedFaculty('all');
                    setSelectedStatus('all');
                    setDateFilter('recent');
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Lista de asignaciones */}
        <Card>
          {isAsignador && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignaciones Creadas
              </CardTitle>
            </CardHeader>
          )}
          <br />
          <CardContent>
            {filteredAssignments.length > 0 ? (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => {
                  if (isAsignador) {
                    return (
                      <AssignmentCard
                        key={assignment.id}
                        assignedIndicator={assignment}
                        onViewDetails={() => {
                          setSelectedAssignment(assignment);
                          setIsModalOpen(true);
                        }}
                        onFileUpload={() => {
                          // Función para subir archivos (implementar después)
                          console.log('Upload file functionality');
                        }}
                        userId={user?.id || ''}
                        isAsignador={isAsignador}
                        getStudentName={getStudentName}
                        getFacultyName={getFacultyName}
                        getSchoolName={getSchoolName}
                        getOfficeName={getOfficeName}
                        getPerspectiveName={getPerspectiveName}
                        getJuryNames={getJuryNames}
                      />
                    );
                  } else {
                    return (
                      <UserAssignmentCard
                        key={assignment.id}
                        assignedIndicator={assignment}
                        onViewDetails={() => {
                          setSelectedAssignment(assignment);
                          setIsModalOpen(true);
                        }}
                        onFileUpload={async (assignedIndicatorId: string, verificationMethodName: string, file: File) => {
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('assignedIndicatorId', assignedIndicatorId);
                            formData.append('verificationMethodName', verificationMethodName);
                            formData.append('userId', user?.id || '');
                            
                            console.log('🚀 Starting upload...', { assignedIndicatorId, verificationMethodName });
                            
                            const response = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                            });
                            
                            if (!response.ok) {
                              throw new Error('Error al subir el archivo');
                            }
                            
                            console.log('✅ Upload successful! Refreshing data...');
                            
                            // Esperar a que Firebase propague los cambios
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            // Recargar las asignaciones VARIAS veces para asegurar
                            let attempts = 0;
                            const maxAttempts = 3;
                            
                            while (attempts < maxAttempts) {
                              console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts}: Fetching updated data...`);
                              
                              const allAssignedIndicators = await getCollectionWhereCondition('assigned_indicator', 'userId', user?.id || '');
                              
                              if (allAssignedIndicators) {
                                const updatedAssignment = allAssignedIndicators.find(
                                  (a: any) => a.id === assignedIndicatorId
                                ) as AssignedIndicator;
                                
                                // Verificar si el método de verificación se actualizó
                                if (updatedAssignment) {
                                  const updatedMethod = updatedAssignment.assignedVerificationMethods.find(
                                    m => m.name === verificationMethodName
                                  );
                                  
                                  console.log('📊 Method status:', updatedMethod?.status);
                                  console.log('📊 Has file:', !!updatedMethod?.submittedFile);
                                  
                                  if (updatedMethod?.status === 'Submitted' || updatedMethod?.submittedFile) {
                                    console.log('✅ Data confirmed updated! Updating UI...');
                                    setUserAssignments(allAssignedIndicators as AssignedIndicator[]);
                                    
                                    // Actualizar modal si está abierto
                                    if (selectedAssignment && selectedAssignment.id === assignedIndicatorId) {
                                      setSelectedAssignment(updatedAssignment);
                                    }
                                    
                                    console.log('✅✅ UI updated successfully!');
                                    break; // Salir del loop
                                  } else {
                                    console.log('⚠️ Data not yet updated, waiting...');
                                  }
                                }
                              }
                              
                              attempts++;
                              if (attempts < maxAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 800));
                              }
                            }
                            
                            if (attempts >= maxAttempts) {
                              console.log('⚠️ Max attempts reached, forcing UI update anyway...');
                              const allAssignedIndicators = await getCollectionWhereCondition('assigned_indicator', 'userId', user?.id || '');
                              if (allAssignedIndicators) {
                                setUserAssignments(allAssignedIndicators as AssignedIndicator[]);
                                const updatedAssignment = allAssignedIndicators.find((a: any) => a.id === assignedIndicatorId);
                                if (selectedAssignment && updatedAssignment) {
                                  setSelectedAssignment(updatedAssignment as AssignedIndicator);
                                }
                              }
                            }
                          } catch (error) {
                            console.error('❌ Error uploading file:', error);
                            throw error;
                          }
                        }}
                      />
                    );
                  }
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isAsignador ? (
                  <>
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No has creado asignaciones</h3>
                    <p>Cuando crees asignaciones de indicadores, aparecerán aquí.</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No tienes asignaciones</h3>
                    <p>Cuando se te asignen indicadores, aparecerán aquí.</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalles */}
      {selectedAssignment && (
        <AssignmentDetailsModal
          indicator={selectedAssignment}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAssignment(null);
          }}

        />
      )}
    </div>
  );
}
