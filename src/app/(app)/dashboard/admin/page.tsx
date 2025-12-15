"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Award,
  BarChart3,
  Users,
  FileText,
  Filter,
  Building,
  UserCheck,
  UserX,
  Download,
  FileDown,
  PieChart,
  Activity,
  Layout,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RouteProtector } from '@/components/dashboard/RouteProtector';
import { AssignedIndicator, User, Faculty, Office, ProfessionalSchool } from '@/lib/types';
import { getAllAssignedIndicators, getAllUsers, getAllFaculties, getAllOffices, getAllProfessionalSchools } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { format, isPast, isToday, isWithinInterval, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VerificationStatus } from '@/lib/types';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { SendNotificationDialog } from '@/components/admin/SendNotificationDialog';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtro de Vista: Compacto o Detallado
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  
  // Filtros para Vista Compacta
  const [compactFacultyFilter, setCompactFacultyFilter] = useState<string>('all');
  const [compactSchoolFilter, setCompactSchoolFilter] = useState<string>('all');
  const [compactOfficeFilter, setCompactOfficeFilter] = useState<string>('all');
  const [compactDateFilter, setCompactDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  
  // Filtros para Vista Detallada
  const [detailedFacultyFilter, setDetailedFacultyFilter] = useState<string>('all');
  const [detailedSchoolFilter, setDetailedSchoolFilter] = useState<string>('all');
  const [detailedOfficeFilter, setDetailedOfficeFilter] = useState<string>('all');
  const [detailedDateFrom, setDetailedDateFrom] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [detailedDateTo, setDetailedDateTo] = useState<Date | undefined>(new Date());
  // Modo de filtrado detallado: Todas o Por fecha
  const [detailedDateMode, setDetailedDateMode] = useState<'all' | 'byDate'>('byDate');
  
  // Filtros para gráfico de facultades (detallado)
  const [facultyGraphMode, setFacultyGraphMode] = useState<'faculty' | 'school'>('faculty');
  const [selectedFacultiesForGraph, setSelectedFacultiesForGraph] = useState<string[]>([]);
  const [selectedSchoolsForGraph, setSelectedSchoolsForGraph] = useState<string[]>([]);
  
  // Filtros para histograma de oficinas (detallado)
  const [selectedOfficesForHistogram, setSelectedOfficesForHistogram] = useState<string[]>([]);
  
  // Filtros para gráfico lineal (detallado)
  const [linearChartType, setLinearChartType] = useState<'faculty' | 'office'>('faculty');
  const [linearChartEntity, setLinearChartEntity] = useState<string>('all');
  
  // Filtros para tabs inferiores
  const [tabOfficeFilter, setTabOfficeFilter] = useState<string>('all');

  // Utilidad robusta para parsear fechas (Timestamp, Date, string, number)
  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    try {
      if (typeof date === 'object' && date !== null && 'seconds' in date) {
        return new Date((date as any).seconds * 1000);
      }
      if (typeof date === 'object' && date !== null && typeof (date as any).toDate === 'function') {
        return (date as any).toDate();
      }
      if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
      if (typeof date === 'number') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof date === 'string') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const deriveAssignmentStatus = (assignment: AssignedIndicator): VerificationStatus => {
    const base = assignment.overallStatus || 'Pending';
    // Si está aprobado o rechazado, mantener
    if (base === 'Approved' || base === 'Rejected') return base;
    // Si está presentado, mantener como activo
    if (base === 'Submitted') return base;
    // Evaluar vencimiento por métodos pendientes
    const overdue = assignment.assignedVerificationMethods?.some(vm => {
      const due = parseDate((vm as any).dueDate);
      return (vm.status === 'Pending' || vm.status === 'Observed') && due && isPast(due);
    });
    return overdue ? 'Overdue' : (base === 'Observed' ? 'Observed' : 'Pending');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allAssignments, allUsers, allFaculties, allOffices, allSchools] = await Promise.all([
          getAllAssignedIndicators(),
          getAllUsers(),
          getAllFaculties(),
          getAllOffices(),
          getAllProfessionalSchools()
        ]);
        
        setAssignments(allAssignments);
        setUsers(allUsers);
        setFaculties(allFaculties);
        setOffices(allOffices);
        setProfessionalSchools(allSchools);
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

  // Normalizar asignaciones con estados derivados y fechas útiles
  const normalizedAssignments = assignments.map((a) => ({
    ...a,
    derivedStatus: deriveAssignmentStatus(a),
    assignedDateObj: parseDate((a as any).assignedDate),
    // Fecha de vencimiento preferimos la más temprana de los métodos
    dueDateObj: (() => {
      const dates = (a.assignedVerificationMethods || [])
        .map(vm => parseDate((vm as any).dueDate))
        .filter(Boolean) as Date[];
      if (dates.length === 0) return parseDate((a as any).dueDate);
      return new Date(Math.min(...dates.map(d => d.getTime())));
    })()
  }));

  // Función auxiliar para filtrar por facultad, escuela profesional y oficina
  const filterByEntity = (assignment: any, facultyFilter: string, schoolFilter: string, officeFilter: string) => {
    const student = users.find(u => u.id === assignment.userId);
    if (!student) return false;
    
    // Filtro por facultad
    if (facultyFilter !== 'all' && student.facultyId !== facultyFilter) return false;
    
    // Filtro por escuela profesional
    if (schoolFilter !== 'all' && student.professionalSchoolId !== schoolFilter) return false;
    
    // Filtro por oficina
    if (officeFilter !== 'all' && student.officeId !== officeFilter) return false;
    
    return true;
  };

  // Función auxiliar para filtrar por fecha compacta
  const filterByCompactDate = (assignment: any, dateFilter: 'today' | 'week' | 'month' | 'year' | 'all') => {
    // Si no hay fecha de asignación, incluir la asignación
    if (!assignment || !assignment.assignedDateObj) return true;
    
    const now = new Date();
    const assignmentDate = assignment.assignedDateObj;
    
    try {
      switch (dateFilter) {
        case 'today':
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          return assignmentDate >= todayStart && assignmentDate <= todayEnd;
        
        case 'week':
          // Considerar la última semana
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          return assignmentDate >= weekStart && assignmentDate <= now;
        
        case 'month':
          // Considerar el último mes
          const monthStart = new Date(now);
          monthStart.setMonth(now.getMonth() - 1);
          return assignmentDate >= monthStart && assignmentDate <= now;

        case 'year':
          // Considerar el último año
          const yearStart = new Date(now);
          yearStart.setFullYear(now.getFullYear() - 1);
          return assignmentDate >= yearStart && assignmentDate <= now;

        case 'all':
          return true;
        
        default:
          return true;
      }
    } catch (error) {
      // Si hay algún error al procesar las fechas, incluir la asignación
      console.error('Error processing date filter:', error);
      return true;
    }
  };

  // Función auxiliar para filtrar por rango de fechas (detallado)
  const filterByDateRange = (assignment: any, dateFrom?: Date, dateTo?: Date) => {
    const assignmentDate = assignment.assignedDateObj;
    if (!assignmentDate) return false;
    if (!dateFrom || !dateTo) return true;
    
    return isWithinInterval(assignmentDate, { 
      start: startOfDay(dateFrom), 
      end: endOfDay(dateTo) 
    });
  };

  // Filtrar datos según vista actual (Compacto o Detallado)
  const getFilteredAssignments = () => {
    try {
      // Primero filtramos por entidad
      let filtered = normalizedAssignments.filter(assignment => {
        try {
          return filterByEntity(
            assignment,
            viewMode === 'compact' ? compactFacultyFilter : detailedFacultyFilter,
            viewMode === 'compact' ? compactSchoolFilter : detailedSchoolFilter,
            viewMode === 'compact' ? compactOfficeFilter : detailedOfficeFilter
          );
        } catch (error) {
          console.error('Error in entity filtering:', error);
          return true;
        }
      });

      // Luego aplicamos el filtro de fecha según el modo
      filtered = filtered.filter(assignment => {
        try {
          if (viewMode === 'compact') {
            return filterByCompactDate(assignment, compactDateFilter);
          } else {
            // Si el modo detallado es 'all' no filtrar por fecha
            if (detailedDateMode === 'all') return true;
            return filterByDateRange(assignment, detailedDateFrom, detailedDateTo);
          }
        } catch (error) {
          console.error('Error in date filtering:', error);
          return true;
        }
      });

      console.log(`Filtered assignments (${viewMode}):`, filtered.length);
      return filtered;
    } catch (error) {
      console.error('Error in getFilteredAssignments:', error);
      return normalizedAssignments; // En caso de error, devolver todas las asignaciones
    }
  };

  const filteredAssignments = getFilteredAssignments();

  const totalAssignments = filteredAssignments.length;
  const completedAssignments = filteredAssignments.filter(
    assignment => assignment.derivedStatus === 'Approved' || assignment.derivedStatus === 'Rejected'
  ).length;
  const pendingAssignments = filteredAssignments.filter(
    assignment => assignment.derivedStatus === 'Pending'
  ).length;
  const activeAssignments = filteredAssignments.filter(
    assignment => assignment.derivedStatus === 'Submitted'
  ).length;
  const overdueAssignments = filteredAssignments.filter(
    assignment => assignment.derivedStatus === 'Overdue'
  ).length;

  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  // Estadísticas por facultad
  const statsByFaculty = faculties.map(faculty => {
    const facultyAssignments = normalizedAssignments.filter(assignment => {
      const student = users.find(u => u.id === assignment.userId);
      return student?.facultyId === faculty.id;
    });

    return {
      faculty,
      total: facultyAssignments.length,
      completed: facultyAssignments.filter(a => a.derivedStatus === 'Approved' || a.derivedStatus === 'Rejected').length,
      pending: facultyAssignments.filter(a => a.derivedStatus === 'Pending').length,
      active: facultyAssignments.filter(a => a.derivedStatus === 'Submitted').length,
      overdue: facultyAssignments.filter(a => a.derivedStatus === 'Overdue').length,
    };
  });

  // Estadísticas por oficina
  const statsByOffice = offices.map(office => {
    const officeAssignments = normalizedAssignments.filter(assignment => {
      const student = users.find(u => u.id === assignment.userId);
      return student?.officeId === office.id;
    });

    return {
      office,
      total: officeAssignments.length,
      completed: officeAssignments.filter(a => a.derivedStatus === 'Approved' || a.derivedStatus === 'Rejected').length,
      pending: officeAssignments.filter(a => a.derivedStatus === 'Pending').length,
      active: officeAssignments.filter(a => a.derivedStatus === 'Submitted').length,
      overdue: officeAssignments.filter(a => a.derivedStatus === 'Overdue').length,
    };
  });

  // Estadísticas de usuarios por rol
  const usersByRole = {
    admin: users.filter(u => u.role === 'admin').length,
    asignador: users.filter(u => u.role === 'asignador').length,
    calificador: users.filter(u => u.role === 'calificador').length,
    responsable: users.filter(u => u.role === 'responsable').length,
  };

  // Datos para gráficos - Vista Compacta (solo 3 estados)
  const compactPieChartData = {
    labels: ['Completadas', 'Pendientes', 'Vencidas'],
    datasets: [
      {
        data: [completedAssignments, pendingAssignments, overdueAssignments],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Datos para gráficos - Vista Detallada (4 estados)
  const detailedPieChartData = {
    labels: ['Completadas', 'Activas', 'Pendientes', 'Vencidas'],
    datasets: [
      {
        data: [completedAssignments, activeAssignments, pendingAssignments, overdueAssignments],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Gráfico de facultades (para vista detallada con selección múltiple)
  const getFacultyBarChartData = () => {
    let filteredStats = statsByFaculty.filter(stat => stat.total > 0);
    
    if (facultyGraphMode === 'faculty' && selectedFacultiesForGraph.length > 0) {
      filteredStats = filteredStats.filter(stat => selectedFacultiesForGraph.includes(stat.faculty.id));
    }

    return {
      labels: filteredStats.map(stat => stat.faculty.shortName || stat.faculty.name),
      datasets: [
        {
          label: 'Total',
          data: filteredStats.map(stat => stat.total),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: 'Completadas',
          data: filteredStats.map(stat => stat.completed),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Histograma de oficinas
  const getOfficeHistogramData = () => {
    let filteredStats = statsByOffice.filter(stat => stat.total > 0);
    
    if (viewMode === 'detailed' && selectedOfficesForHistogram.length > 0) {
      filteredStats = filteredStats.filter(stat => selectedOfficesForHistogram.includes(stat.office.id));
    }

    return {
      labels: filteredStats.map(stat => stat.office.name.length > 30 ? stat.office.name.substring(0, 30) + '...' : stat.office.name),
      datasets: [
        {
          label: 'Asignaciones',
          data: filteredStats.map(stat => stat.total),
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Gráfico de usuarios por rol (Diagrama de Venn simulado como barras)
  const usersChartData = {
    labels: ['Administrador', 'Asignador', 'Calificador', 'Responsable'],
    datasets: [
      {
        label: 'Número de Usuarios',
        data: [usersByRole.admin, usersByRole.asignador, usersByRole.calificador, usersByRole.responsable],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Gráfico lineal temporal (solo en vista detallada)
  const getLinearChartData = () => {
    // Crear array de fechas para el eje X
    const dateFrom = detailedDateFrom || subMonths(new Date(), 1);
    const dateTo = detailedDateTo || new Date();
    const dates: Date[] = [];
    let currentDate = new Date(dateFrom);
    
    while (currentDate <= dateTo) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filtrar asignaciones según el tipo de entidad seleccionada
    let relevantAssignments = normalizedAssignments;
    
    if (linearChartType === 'faculty' && linearChartEntity !== 'all') {
      relevantAssignments = normalizedAssignments.filter(a => {
        const student = users.find(u => u.id === a.userId);
        return student?.facultyId === linearChartEntity;
      });
    } else if (linearChartType === 'office' && linearChartEntity !== 'all') {
      relevantAssignments = normalizedAssignments.filter(a => {
        const student = users.find(u => u.id === a.userId);
        return student?.officeId === linearChartEntity;
      });
    }

    // Contar asignaciones por fecha
    const counts = dates.map(date => {
      return relevantAssignments.filter(a => {
        const assignmentDate = a.assignedDateObj;
        if (!assignmentDate) return false;
        return assignmentDate.toDateString() === date.toDateString();
      }).length;
    });

    return {
      labels: dates.map(d => format(d, 'dd/MM', { locale: es })),
      datasets: [
        {
          label: 'Asignaciones',
          data: counts,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.4,
        },
      ],
    };
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Asignaciones por Facultad',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const getStudentName = (userId: string) => {
    const student = users.find(u => u.id === userId);
    return student?.name || 'Usuario desconocido';
  };

  const getFacultyNameByUserId = (userId: string) => {
    const student = users.find(u => u.id === userId);
    if (!student?.facultyId) return 'Facultad no especificada';
    const faculty = faculties.find(f => f.id === student.facultyId);
    return faculty?.name || 'Facultad no especificada';
  };

  const getJuryNames = (juryIds: string[]) => {
    return juryIds.map(id => {
      const juryMember = users.find(u => u.id === id);
      return juryMember?.name || 'Calificador desconocido';
    }).join(', ');
  };

  // Funciones para generar reportes
  const generatePDFReport = async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 40;

    // Función auxiliar para agregar nueva página si es necesario
    const checkPageBreak = (requiredSpace: number) => {
      if (currentY + requiredSpace > doc.internal.pageSize.height - 40) {
        doc.addPage();
        currentY = 40;
        return true;
      }
      return false;
    };

    // ===== ENCABEZADO CON LOGO =====
    try {
      // Agregar logo (usar la imagen de public/Img/UNMSM.png)
      const logoUrl = '/Img/unimsm.png';
      const img = new Image();
      img.src = logoUrl;
      
      // Cargar imagen y agregarla
      await new Promise((resolve) => {
        img.onload = () => {
          doc.addImage(img, 'PNG', 40, currentY, 60, 60);
          resolve(true);
        };
        img.onerror = () => {
          console.warn('No se pudo cargar el logo');
          resolve(false);
        };
      });
    } catch (error) {
      console.warn('Error al cargar logo:', error);
    }

    // Título Universidad
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102); // Azul oscuro
    doc.text('UNIVERSIDAD NACIONAL MAYOR DE SAN MARCOS', 120, currentY + 15, { maxWidth: pageWidth - 140 });
    
    doc.setFontSize(12);
    doc.text('(Universidad del Perú, DECANA DE AMÉRICA)', 120, currentY + 35);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('REPORTE DE ADMINISTRADOR', 120, currentY + 55);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 120, currentY + 70);
    doc.text(`Vista: ${viewMode === 'compact' ? 'Compacta' : 'Detallada'}`, 120, currentY + 85);

    currentY += 110;

    // Línea separadora
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(2);
    doc.line(40, currentY, pageWidth - 40, currentY);
    currentY += 20;

    // ===== RESUMEN EJECUTIVO =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('1. RESUMEN EJECUTIVO', 40, currentY);
    currentY += 20;

    // @ts-ignore
    doc.autoTable({
      startY: currentY,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Asignaciones', totalAssignments.toString()],
        ['Asignaciones Completadas', `${completedAssignments} (${completionRate.toFixed(1)}%)`],
        ...(viewMode === 'detailed' ? [['Asignaciones Activas', activeAssignments.toString()]] : []),
        ['Asignaciones Pendientes', pendingAssignments.toString()],
        ['Asignaciones Vencidas', overdueAssignments.toString()],
        ['Tasa de Completación', `${completionRate.toFixed(1)}%`],
      ],
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 11, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      styles: { fontSize: 10, cellPadding: 8 },
      margin: { left: 40, right: 40 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 30;
    checkPageBreak(100);

    // ===== ESTADÍSTICAS POR FACULTAD =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('2. ESTADÍSTICAS POR FACULTAD', 40, currentY);
    currentY += 20;

    const facultyData = statsByFaculty
      .filter(stat => stat.total > 0)
      .sort((a, b) => b.total - a.total);

    // @ts-ignore
    doc.autoTable({
      startY: currentY,
      head: [['Facultad', 'Total', 'Completadas', 'Activas', 'Pendientes', 'Vencidas', '% Completado']],
      body: facultyData.map(stat => [
        stat.faculty.shortName,
        stat.total,
        stat.completed,
        stat.active,
        stat.pending,
        stat.overdue,
        `${stat.total > 0 ? ((stat.completed / stat.total) * 100).toFixed(1) : 0}%`
      ]),
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: 40, right: 40 },
      columnStyles: {
        0: { cellWidth: 180 },
        1: { halign: 'center', cellWidth: 45 },
        2: { halign: 'center', cellWidth: 60 },
        3: { halign: 'center', cellWidth: 50 },
        4: { halign: 'center', cellWidth: 60 },
        5: { halign: 'center', cellWidth: 55 },
        6: { halign: 'center', cellWidth: 65 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 30;
    checkPageBreak(100);

    // ===== ESTADÍSTICAS POR OFICINA =====
    const officeData = statsByOffice
      .filter(stat => stat.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 oficinas

    if (officeData.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('3. TOP 10 OFICINAS CON MÁS ASIGNACIONES', 40, currentY);
      currentY += 20;

      // @ts-ignore
      doc.autoTable({
        startY: currentY,
        head: [['Oficina', 'Total', 'Completadas', 'Pendientes', 'Vencidas', '% Completado']],
        body: officeData.map(stat => [
          stat.office.name.length > 50 ? stat.office.name.substring(0, 47) + '...' : stat.office.name,
          stat.total,
          stat.completed,
          stat.pending,
          stat.overdue,
          `${stat.total > 0 ? ((stat.completed / stat.total) * 100).toFixed(1) : 0}%`
        ]),
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
        margin: { left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 250 },
          1: { halign: 'center', cellWidth: 50 },
          2: { halign: 'center', cellWidth: 70 },
          3: { halign: 'center', cellWidth: 70 },
          4: { halign: 'center', cellWidth: 60 },
          5: { halign: 'center', cellWidth: 75 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 30;
    }

    // Nueva página para usuarios
    doc.addPage();
    currentY = 40;

    // ===== ESTADÍSTICAS DE USUARIOS =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('4. DISTRIBUCIÓN DE USUARIOS POR ROL', 40, currentY);
    currentY += 20;

    // @ts-ignore
    doc.autoTable({
      startY: currentY,
      head: [['Rol', 'Cantidad', 'Porcentaje']],
      body: [
        ['Administradores', usersByRole.admin, `${((usersByRole.admin / users.length) * 100).toFixed(1)}%`],
        ['Asignadores', usersByRole.asignador, `${((usersByRole.asignador / users.length) * 100).toFixed(1)}%`],
        ['Calificadores', usersByRole.calificador, `${((usersByRole.calificador / users.length) * 100).toFixed(1)}%`],
        ['Responsables', usersByRole.responsable, `${((usersByRole.responsable / users.length) * 100).toFixed(1)}%`],
        ['TOTAL', users.length, '100%']
      ],
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 11, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      styles: { fontSize: 10, cellPadding: 8 },
      margin: { left: 40, right: 40 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' }
      },
      footStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' }
    });

    currentY = (doc as any).lastAutoTable.finalY + 30;
    checkPageBreak(100);

    // ===== ASIGNACIONES CRÍTICAS (VENCIDAS) =====
    const overdueList = normalizedAssignments
      .filter(a => a.derivedStatus === 'Overdue')
      .sort((a, b) => (a.dueDateObj?.getTime() || 0) - (b.dueDateObj?.getTime() || 0))
      .slice(0, 15);

    if (overdueList.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(204, 0, 0); // Rojo para alertas
      doc.text('5. ⚠️ ASIGNACIONES VENCIDAS - ATENCIÓN URGENTE', 40, currentY);
      currentY += 20;

      // @ts-ignore
      doc.autoTable({
        startY: currentY,
        head: [['Responsable', 'Facultad', 'Fecha Vencimiento', 'Días Vencidos']],
        body: overdueList.map(a => {
          const student = users.find(u => u.id === a.userId);
          const faculty = faculties.find(f => f.id === student?.facultyId);
          const daysOverdue = a.dueDateObj 
            ? Math.floor((new Date().getTime() - a.dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          
          return [
            student?.name || 'Desconocido',
            faculty?.shortName || 'N/A',
            a.dueDateObj ? format(a.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
            daysOverdue > 0 ? `${daysOverdue} días` : '-'
          ];
        }),
        headStyles: { fillColor: [204, 0, 0], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 240, 240] },
        styles: { fontSize: 9, cellPadding: 6 },
        margin: { left: 40, right: 40 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 30;
    }

    // ===== ASIGNACIONES RECIENTES =====
    checkPageBreak(100);
    
    const recentList = normalizedAssignments
      .sort((a, b) => (b.assignedDateObj?.getTime() || 0) - (a.assignedDateObj?.getTime() || 0))
      .slice(0, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('6. ASIGNACIONES RECIENTES', 40, currentY);
    currentY += 20;

    // @ts-ignore
    doc.autoTable({
      startY: currentY,
      head: [['Responsable', 'Facultad', 'Oficina', 'Estado', 'Fecha']],
      body: recentList.map(a => {
        const student = users.find(u => u.id === a.userId);
        const faculty = faculties.find(f => f.id === student?.facultyId);
        const office = offices.find(o => o.id === student?.officeId);
        
        return [
          student?.name || 'Desconocido',
          faculty?.shortName || 'N/A',
          office?.name.substring(0, 30) || 'N/A',
          statusTranslations[a.derivedStatus || 'Pending'],
          a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
        ];
      }),
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: 40, right: 40 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 80 },
        2: { cellWidth: 150 },
        3: { halign: 'center', cellWidth: 80 },
        4: { halign: 'center', cellWidth: 85 }
      }
    });

    // ===== PIE DE PÁGINA EN TODAS LAS PÁGINAS =====
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${totalPages} - Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 20,
        { align: 'center' }
      );
    }

    doc.save(`Reporte_UNMSM_Administrador_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  };

  const generateExcelReport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // ===== HOJA 1: RESUMEN EJECUTIVO =====
    const resumenData = [
      ['UNIVERSIDAD NACIONAL MAYOR DE SAN MARCOS'],
      ['REPORTE DE ADMINISTRADOR - BALANCED SCORECARD'],
      [''],
      ['Fecha de generación:', format(new Date(), "dd 'de' MMMM 'de' yyyy HH:mm", { locale: es })],
      ['Vista:', viewMode === 'compact' ? 'Compacta' : 'Detallada'],
      [''],
      ['RESUMEN EJECUTIVO'],
      [''],
      ['Métrica', 'Valor', 'Porcentaje'],
      ['Total de Asignaciones', totalAssignments, '100%'],
      ['Asignaciones Completadas', completedAssignments, `${completionRate.toFixed(1)}%`],
      ...(viewMode === 'detailed' ? [['Asignaciones Activas', activeAssignments, `${((activeAssignments / totalAssignments) * 100).toFixed(1)}%`]] : []),
      ['Asignaciones Pendientes', pendingAssignments, `${((pendingAssignments / totalAssignments) * 100).toFixed(1)}%`],
      ['Asignaciones Vencidas', overdueAssignments, `${((overdueAssignments / totalAssignments) * 100).toFixed(1)}%`],
      [''],
      ['DISTRIBUCIÓN DE USUARIOS'],
      [''],
      ['Rol', 'Cantidad', 'Porcentaje'],
      ['Administradores', usersByRole.admin, `${((usersByRole.admin / users.length) * 100).toFixed(1)}%`],
      ['Asignadores', usersByRole.asignador, `${((usersByRole.asignador / users.length) * 100).toFixed(1)}%`],
      ['Calificadores', usersByRole.calificador, `${((usersByRole.calificador / users.length) * 100).toFixed(1)}%`],
      ['Responsables', usersByRole.responsable, `${((usersByRole.responsable / users.length) * 100).toFixed(1)}%`],
      ['TOTAL', users.length, '100%'],
    ];
    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    
    // Aplicar estilos al resumen
    if (!resumenSheet['!cols']) resumenSheet['!cols'] = [];
    resumenSheet['!cols'][0] = { wch: 35 };
    resumenSheet['!cols'][1] = { wch: 20 };
    resumenSheet['!cols'][2] = { wch: 15 };
    
    XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen Ejecutivo');

    // ===== HOJA 2: ESTADÍSTICAS POR FACULTAD =====
    const facultadData = [
      ['ESTADÍSTICAS POR FACULTAD'],
      [''],
      ['Facultad', 'Total', 'Completadas', 'Activas', 'Pendientes', 'Vencidas', '% Completado', '% Vencido'],
      ...statsByFaculty
        .filter(stat => stat.total > 0)
        .sort((a, b) => b.total - a.total)
        .map(stat => [
          stat.faculty.name,
          stat.total,
          stat.completed,
          stat.active,
          stat.pending,
          stat.overdue,
          stat.total > 0 ? `${((stat.completed / stat.total) * 100).toFixed(1)}%` : '0%',
          stat.total > 0 ? `${((stat.overdue / stat.total) * 100).toFixed(1)}%` : '0%'
        ]),
      [''],
      ['TOTAL', 
        statsByFaculty.reduce((sum, stat) => sum + stat.total, 0),
        statsByFaculty.reduce((sum, stat) => sum + stat.completed, 0),
        statsByFaculty.reduce((sum, stat) => sum + stat.active, 0),
        statsByFaculty.reduce((sum, stat) => sum + stat.pending, 0),
        statsByFaculty.reduce((sum, stat) => sum + stat.overdue, 0),
        '',
        ''
      ]
    ];
    const facultadSheet = XLSX.utils.aoa_to_sheet(facultadData);
    
    // Configurar anchos de columna
    if (!facultadSheet['!cols']) facultadSheet['!cols'] = [];
    facultadSheet['!cols'][0] = { wch: 50 };
    facultadSheet['!cols'][1] = { wch: 12 };
    facultadSheet['!cols'][2] = { wch: 15 };
    facultadSheet['!cols'][3] = { wch: 12 };
    facultadSheet['!cols'][4] = { wch: 15 };
    facultadSheet['!cols'][5] = { wch: 12 };
    facultadSheet['!cols'][6] = { wch: 15 };
    facultadSheet['!cols'][7] = { wch: 13 };
    
    // Agregar filtros
    facultadSheet['!autofilter'] = { ref: `A3:H${facultadData.length - 2}` };
    
    XLSX.utils.book_append_sheet(wb, facultadSheet, 'Por Facultad');

    // ===== HOJA 3: ESTADÍSTICAS POR OFICINA =====
    const officeStatsFiltered = statsByOffice.filter(stat => stat.total > 0).sort((a, b) => b.total - a.total);
    const oficinaData = [
      ['ESTADÍSTICAS POR OFICINA'],
      [''],
      ['Oficina', 'Total', 'Completadas', 'Activas', 'Pendientes', 'Vencidas', '% Completado', '% Vencido'],
      ...officeStatsFiltered.map(stat => [
        stat.office.name,
        stat.total,
        stat.completed,
        stat.active,
        stat.pending,
        stat.overdue,
        stat.total > 0 ? `${((stat.completed / stat.total) * 100).toFixed(1)}%` : '0%',
        stat.total > 0 ? `${((stat.overdue / stat.total) * 100).toFixed(1)}%` : '0%'
      ]),
      [''],
      ['TOTAL',
        officeStatsFiltered.reduce((sum, stat) => sum + stat.total, 0),
        officeStatsFiltered.reduce((sum, stat) => sum + stat.completed, 0),
        officeStatsFiltered.reduce((sum, stat) => sum + stat.active, 0),
        officeStatsFiltered.reduce((sum, stat) => sum + stat.pending, 0),
        officeStatsFiltered.reduce((sum, stat) => sum + stat.overdue, 0),
        '',
        ''
      ]
    ];
    const oficinaSheet = XLSX.utils.aoa_to_sheet(oficinaData);
    
    if (!oficinaSheet['!cols']) oficinaSheet['!cols'] = [];
    oficinaSheet['!cols'][0] = { wch: 60 };
    oficinaSheet['!cols'][1] = { wch: 12 };
    oficinaSheet['!cols'][2] = { wch: 15 };
    oficinaSheet['!cols'][3] = { wch: 12 };
    oficinaSheet['!cols'][4] = { wch: 15 };
    oficinaSheet['!cols'][5] = { wch: 12 };
    oficinaSheet['!cols'][6] = { wch: 15 };
    oficinaSheet['!cols'][7] = { wch: 13 };
    
    oficinaSheet['!autofilter'] = { ref: `A3:H${oficinaData.length - 2}` };
    
    XLSX.utils.book_append_sheet(wb, oficinaSheet, 'Por Oficina');

    // ===== HOJA 4: ASIGNACIONES VENCIDAS (CRÍTICAS) =====
    const overdueList = normalizedAssignments
      .filter(a => a.derivedStatus === 'Overdue')
      .sort((a, b) => (a.dueDateObj?.getTime() || 0) - (b.dueDateObj?.getTime() || 0));

    const vencidasData = [
      ['⚠️ ASIGNACIONES VENCIDAS - ATENCIÓN URGENTE'],
      [''],
      ['Responsable', 'Email', 'Facultad', 'Oficina', 'Fecha Vencimiento', 'Días Vencidos', 'Estado'],
      ...overdueList.map(a => {
        const student = users.find(u => u.id === a.userId);
        const faculty = faculties.find(f => f.id === student?.facultyId);
        const office = offices.find(o => o.id === student?.officeId);
        const daysOverdue = a.dueDateObj 
          ? Math.floor((new Date().getTime() - a.dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        return [
          student?.name || 'Desconocido',
          student?.email || 'N/A',
          faculty?.shortName || 'N/A',
          office?.name || 'N/A',
          a.dueDateObj ? format(a.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
          daysOverdue > 0 ? daysOverdue : 0,
          statusTranslations[a.derivedStatus || 'Pending']
        ];
      })
    ];
    
    const vencidasSheet = XLSX.utils.aoa_to_sheet(vencidasData);
    
    if (!vencidasSheet['!cols']) vencidasSheet['!cols'] = [];
    vencidasSheet['!cols'][0] = { wch: 30 };
    vencidasSheet['!cols'][1] = { wch: 25 };
    vencidasSheet['!cols'][2] = { wch: 20 };
    vencidasSheet['!cols'][3] = { wch: 40 };
    vencidasSheet['!cols'][4] = { wch: 18 };
    vencidasSheet['!cols'][5] = { wch: 15 };
    vencidasSheet['!cols'][6] = { wch: 15 };
    
    if (overdueList.length > 0) {
      vencidasSheet['!autofilter'] = { ref: `A3:G${vencidasData.length}` };
    }
    
    XLSX.utils.book_append_sheet(wb, vencidasSheet, 'Vencidas');

    // ===== HOJA 5: ASIGNACIONES RECIENTES =====
    const recentList = normalizedAssignments
      .sort((a, b) => (b.assignedDateObj?.getTime() || 0) - (a.assignedDateObj?.getTime() || 0))
      .slice(0, 100);

    const recientesData = [
      ['ASIGNACIONES RECIENTES (últimas 100)'],
      [''],
      ['Responsable', 'Email', 'Facultad', 'Escuela Profesional', 'Oficina', 'Estado', 'Fecha Asignación', 'Fecha Vencimiento'],
      ...recentList.map(a => {
        const student = users.find(u => u.id === a.userId);
        const faculty = faculties.find(f => f.id === student?.facultyId);
        const school = professionalSchools.find(s => s.id === student?.professionalSchoolId);
        const office = offices.find(o => o.id === student?.officeId);
        
        return [
          student?.name || 'Desconocido',
          student?.email || 'N/A',
          faculty?.shortName || 'N/A',
          school?.name || 'N/A',
          office?.name || 'N/A',
          statusTranslations[a.derivedStatus || 'Pending'],
          a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
          a.dueDateObj ? format(a.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
        ];
      })
    ];
    
    const recientesSheet = XLSX.utils.aoa_to_sheet(recientesData);
    
    if (!recientesSheet['!cols']) recientesSheet['!cols'] = [];
    recientesSheet['!cols'][0] = { wch: 30 };
    recientesSheet['!cols'][1] = { wch: 25 };
    recientesSheet['!cols'][2] = { wch: 20 };
    recientesSheet['!cols'][3] = { wch: 35 };
    recientesSheet['!cols'][4] = { wch: 40 };
    recientesSheet['!cols'][5] = { wch: 15 };
    recientesSheet['!cols'][6] = { wch: 18 };
    recientesSheet['!cols'][7] = { wch: 18 };
    
    recientesSheet['!autofilter'] = { ref: `A3:H${recientesData.length}` };
    
    XLSX.utils.book_append_sheet(wb, recientesSheet, 'Recientes');

    // ===== HOJA 6: TODAS LAS ASIGNACIONES (COMPLETO) =====
    const todasData = [
      ['BASE DE DATOS COMPLETA - TODAS LAS ASIGNACIONES'],
      [''],
      ['#', 'Responsable', 'Email', 'Facultad', 'Escuela', 'Oficina', 'Jefe Facultad', 'Jefe Oficina', 'Estado', 'Fecha Asignación', 'Fecha Vencimiento', 'Calificadores'],
      ...normalizedAssignments.map((a, index) => {
        const student = users.find(u => u.id === a.userId);
        const faculty = faculties.find(f => f.id === student?.facultyId);
        const school = professionalSchools.find(s => s.id === student?.professionalSchoolId);
        const office = offices.find(o => o.id === student?.officeId);
        const juryNames = (a.jury || []).map(jId => {
          const juryMember = users.find(u => u.id === jId);
          return juryMember?.name || 'Desconocido';
        }).join(', ');
        
        return [
          index + 1,
          student?.name || 'Desconocido',
          student?.email || 'N/A',
          faculty?.name || 'N/A',
          school?.name || 'N/A',
          office?.name || 'N/A',
          student?.facultyBossName || student?.bossName || 'N/A',
          student?.officeBossName || 'N/A',
          statusTranslations[a.derivedStatus || 'Pending'],
          a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
          a.dueDateObj ? format(a.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-',
          juryNames || 'Sin asignar'
        ];
      })
    ];
    
    const todasSheet = XLSX.utils.aoa_to_sheet(todasData);
    
    if (!todasSheet['!cols']) todasSheet['!cols'] = [];
    todasSheet['!cols'][0] = { wch: 5 };
    todasSheet['!cols'][1] = { wch: 30 };
    todasSheet['!cols'][2] = { wch: 25 };
    todasSheet['!cols'][3] = { wch: 25 };
    todasSheet['!cols'][4] = { wch: 35 };
    todasSheet['!cols'][5] = { wch: 40 };
    todasSheet['!cols'][6] = { wch: 25 };
    todasSheet['!cols'][7] = { wch: 25 };
    todasSheet['!cols'][8] = { wch: 15 };
    todasSheet['!cols'][9] = { wch: 18 };
    todasSheet['!cols'][10] = { wch: 18 };
    todasSheet['!cols'][11] = { wch: 30 };
    
    todasSheet['!autofilter'] = { ref: `A3:L${todasData.length}` };
    
    XLSX.utils.book_append_sheet(wb, todasSheet, 'Base Datos Completa');

    // ===== HOJA 7: LISTA DE USUARIOS =====
    const usuariosData = [
      ['LISTA COMPLETA DE USUARIOS DEL SISTEMA'],
      [''],
      ['#', 'Nombre', 'Email', 'Rol', 'Tipo Rol', 'Facultad', 'Escuela Profesional', 'Oficina', 'Jefe Facultad', 'Jefe Oficina'],
      ...users.map((u, index) => {
        const faculty = faculties.find(f => f.id === u.facultyId);
        const school = professionalSchools.find(s => s.id === u.professionalSchoolId);
        const office = offices.find(o => o.id === u.officeId);
        
        return [
          index + 1,
          u.name,
          u.email,
          u.role,
          u.roleType || 'N/A',
          faculty?.name || 'N/A',
          school?.name || 'N/A',
          office?.name || 'N/A',
          u.facultyBossName || u.bossName || 'N/A',
          u.officeBossName || 'N/A'
        ];
      })
    ];
    
    const usuariosSheet = XLSX.utils.aoa_to_sheet(usuariosData);
    
    if (!usuariosSheet['!cols']) usuariosSheet['!cols'] = [];
    usuariosSheet['!cols'][0] = { wch: 5 };
    usuariosSheet['!cols'][1] = { wch: 30 };
    usuariosSheet['!cols'][2] = { wch: 30 };
    usuariosSheet['!cols'][3] = { wch: 15 };
    usuariosSheet['!cols'][4] = { wch: 12 };
    usuariosSheet['!cols'][5] = { wch: 30 };
    usuariosSheet['!cols'][6] = { wch: 35 };
    usuariosSheet['!cols'][7] = { wch: 40 };
    usuariosSheet['!cols'][8] = { wch: 25 };
    usuariosSheet['!cols'][9] = { wch: 25 };
    
    usuariosSheet['!autofilter'] = { ref: `A3:J${usuariosData.length}` };
    
    XLSX.utils.book_append_sheet(wb, usuariosSheet, 'Usuarios');

    // Guardar archivo con nombre descriptivo
    XLSX.writeFile(wb, `Reporte_UNMSM_Administrador_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
  };

  return (
    <RouteProtector allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administrador</h1>
            <p className="text-muted-foreground">
              Panel de control general del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <SendNotificationDialog users={users} />
          <Button onClick={generatePDFReport} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Reporte PDF
          </Button>
          <Button onClick={generateExcelReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Reporte Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle de Vista */}
          <div>
            <label className="text-sm font-medium mb-2 block">Vista</label>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="flex-1"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Compacto
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('detailed')}
                className="flex-1"
              >
                <Layout className="h-4 w-4 mr-2" />
                Detallado
              </Button>
            </div>
          </div>

          {/* Filtros según vista */}
          {viewMode === 'compact' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Facultad</label>
                <Select value={compactFacultyFilter} onValueChange={(value) => {
                  setCompactFacultyFilter(value);
                  setCompactSchoolFilter('all');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.shortName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Escuela Profesional</label>
                <Select value={compactSchoolFilter} onValueChange={setCompactSchoolFilter} disabled={compactFacultyFilter === 'all'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {professionalSchools
                      .filter(school => compactFacultyFilter === 'all' || school.facultyId === compactFacultyFilter)
                      .map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Oficina</label>
                <Select value={compactOfficeFilter} onValueChange={setCompactOfficeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Período</label>
                <Select value={compactDateFilter} onValueChange={(value: any) => setCompactDateFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                    <SelectItem value="year">Último año</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Facultad</label>
                  <Select value={detailedFacultyFilter} onValueChange={(value) => {
                    setDetailedFacultyFilter(value);
                    setDetailedSchoolFilter('all');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {faculties.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Escuela Profesional</label>
                  <Select value={detailedSchoolFilter} onValueChange={setDetailedSchoolFilter} disabled={detailedFacultyFilter === 'all'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {professionalSchools
                        .filter(school => detailedFacultyFilter === 'all' || school.facultyId === detailedFacultyFilter)
                        .map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Oficina</label>
                  <Select value={detailedOfficeFilter} onValueChange={setDetailedOfficeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {offices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name.substring(0, 50)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-sm font-medium">Filtrado</label>
                  <Select value={detailedDateMode} onValueChange={(value: any) => setDetailedDateMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="byDate">Por fecha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha desde</label>
                  {detailedDateMode === 'byDate' ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {detailedDateFrom ? format(detailedDateFrom, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={detailedDateFrom}
                          onSelect={setDetailedDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">Todas las fechas</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha hasta</label>
                  {detailedDateMode === 'byDate' ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {detailedDateTo ? format(detailedDateTo, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={detailedDateTo}
                          onSelect={setDetailedDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">Todas las fechas</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      <div className={`grid gap-4 md:grid-cols-2 ${viewMode === 'compact' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignaciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              En el sistema
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

        {viewMode === 'detailed' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activas</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeAssignments}</div>
              <p className="text-xs text-muted-foreground">
                En evaluación
              </p>
            </CardContent>
          </Card>
        )}

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

      {/* Gráficos según vista */}
      {viewMode === 'compact' ? (
        <>
          {/* Vista Compacta: 4 gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico 1: Distribución de Estados (3 tipos) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribución de Estados
                </CardTitle>
                <CardDescription>
                  Completadas, Pendientes y Vencidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <Pie data={compactPieChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 2: Asignaciones por Facultad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Asignaciones por Facultad
                </CardTitle>
                <CardDescription>
                  Total y completadas por facultad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={getFacultyBarChartData()} options={barChartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 3: Histograma de Oficinas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Asignaciones por Oficina
                </CardTitle>
                <CardDescription>
                  Distribución de asignaciones por oficina
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={getOfficeHistogramData()} options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Histograma de Oficinas',
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 4: Usuarios por Rol (Diagrama de Venn) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios por Rol
                </CardTitle>
                <CardDescription>
                  Distribución de usuarios en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={usersChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Vista Detallada: 5 gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico 1: Distribución de Estados (4 tipos) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribución de Estados
                </CardTitle>
                <CardDescription>
                  Completadas, Activas, Pendientes y Vencidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <Pie data={detailedPieChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 4: Gráfico Lineal Temporal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Asignaciones en el Tiempo
                </CardTitle>
                <CardDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Select value={linearChartType} onValueChange={(value: any) => {
                      setLinearChartType(value);
                      setLinearChartEntity('all');
                    }}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faculty">Por Facultad</SelectItem>
                        <SelectItem value="office">Por Oficina</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={linearChartEntity} onValueChange={setLinearChartEntity}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {linearChartType === 'faculty' 
                          ? faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.shortName}</SelectItem>)
                          : offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name.substring(0, 30)}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={getLinearChartData()} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 3: Histograma de Oficinas (con selección múltiple) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Asignaciones por Oficina
                </CardTitle>
                <CardDescription>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs mt-2">
                        Seleccionar Oficinas ({selectedOfficesForHistogram.length || 'Todas'})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {offices.map((office) => (
                          <div key={office.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`off-${office.id}`}
                              checked={selectedOfficesForHistogram.includes(office.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedOfficesForHistogram([...selectedOfficesForHistogram, office.id]);
                                } else {
                                  setSelectedOfficesForHistogram(selectedOfficesForHistogram.filter(id => id !== office.id));
                                }
                              }}
                            />
                            <Label htmlFor={`off-${office.id}`} className="text-xs">{office.name.substring(0, 40)}</Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={getOfficeHistogramData()} options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Histograma de Oficinas',
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 2: Asignaciones por Facultad (con filtros) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Asignaciones por Facultad
                </CardTitle>
                <CardDescription className="space-y-2">
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="faculty-only"
                        checked={facultyGraphMode === 'faculty'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFacultyGraphMode('faculty');
                            setSelectedSchoolsForGraph([]);
                          }
                        }}
                      />
                      <Label htmlFor="faculty-only" className="text-xs">Solo Facultad</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="faculty-school"
                        checked={facultyGraphMode === 'school'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFacultyGraphMode('school');
                            setSelectedFacultiesForGraph([]);
                          }
                        }}
                      />
                      <Label htmlFor="faculty-school" className="text-xs">Facultad + Escuela</Label>
                    </div>
                  </div>
                  {facultyGraphMode === 'faculty' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          Seleccionar Facultades ({selectedFacultiesForGraph.length})
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {faculties.map((faculty) => (
                            <div key={faculty.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`fac-${faculty.id}`}
                                checked={selectedFacultiesForGraph.includes(faculty.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFacultiesForGraph([...selectedFacultiesForGraph, faculty.id]);
                                  } else {
                                    setSelectedFacultiesForGraph(selectedFacultiesForGraph.filter(id => id !== faculty.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`fac-${faculty.id}`} className="text-xs">{faculty.shortName}</Label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={getFacultyBarChartData()} options={barChartOptions} />
                </div>
              </CardContent>
            </Card>


            {/* Gráfico 5: Usuarios por Rol (Diagrama de Venn) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios por Rol
                </CardTitle>
                <CardDescription>
                  Distribución de usuarios en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={usersChartData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Progreso general */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Progreso General del Sistema
          </CardTitle>
          <CardDescription>
            Progreso general de todas las asignaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tasa de Completación</span>
              <span className="text-sm font-bold">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {completionRate > 50 ? '¡Excelente progreso!' : 'Necesita atención'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="faculty-stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="faculty-stats">Por Facultad</TabsTrigger>
          <TabsTrigger value="office-stats">Por Oficina</TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="faculty-stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas por Facultad</CardTitle>
              <CardDescription>
                Desglose de asignaciones por facultad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsByFaculty
                  .filter(stat => stat.total > 0)
                  .map((stat) => (
                    <div key={stat.faculty.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{stat.faculty.name}</h4>
                        <Badge variant="outline">
                          {stat.total} asignaciones
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-green-600 font-medium">{stat.completed}</p>
                          <p className="text-muted-foreground">Completadas</p>
                        </div>
                        <div>
                          <p className="text-blue-600 font-medium">{stat.active}</p>
                          <p className="text-muted-foreground">Activas</p>
                        </div>
                        <div>
                          <p className="text-yellow-600 font-medium">{stat.pending}</p>
                          <p className="text-muted-foreground">Pendientes</p>
                        </div>
                        <div>
                          <p className="text-red-600 font-medium">{stat.overdue}</p>
                          <p className="text-muted-foreground">Vencidas</p>
                        </div>
                      </div>
                      <Progress 
                        value={stat.total > 0 ? (stat.completed / stat.total) * 100 : 0} 
                        className="h-2 mt-3" 
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="office-stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas por Oficina</CardTitle>
              <CardDescription>
                Desglose de asignaciones por oficina
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsByOffice
                  .filter(stat => stat.total > 0)
                  .map((stat) => (
                    <div key={stat.office.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm">{stat.office.name}</h4>
                        <Badge variant="outline">
                          {stat.total} asignaciones
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-green-600 font-medium">{stat.completed}</p>
                          <p className="text-muted-foreground">Completadas</p>
                        </div>
                        <div>
                          <p className="text-blue-600 font-medium">{stat.active}</p>
                          <p className="text-muted-foreground">Activas</p>
                        </div>
                        <div>
                          <p className="text-yellow-600 font-medium">{stat.pending}</p>
                          <p className="text-muted-foreground">Pendientes</p>
                        </div>
                        <div>
                          <p className="text-red-600 font-medium">{stat.overdue}</p>
                          <p className="text-muted-foreground">Vencidas</p>
                        </div>
                      </div>
                      <Progress 
                        value={stat.total > 0 ? (stat.completed / stat.total) * 100 : 0} 
                        className="h-2 mt-3" 
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Recientes</CardTitle>
              <CardDescription>
                Las asignaciones más recientes del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay asignaciones recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssignments
                    .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
                    .slice(0, 10)
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {getStudentName(assignment.userId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getFacultyNameByUserId(assignment.userId)} • #{assignment.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Jurado: {getJuryNames(assignment.jury || [])}
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
                  <p>¡Excelente! No hay asignaciones vencidas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssignments
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
                              {getFacultyNameByUserId(assignment.userId)} • Vencida el {assignment.dueDateObj ? format(assignment.dueDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'}
                            </p>
                          </div>
                        </div>
                        <Button variant="destructive" size="sm">
                          Notificar calificador
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Usuarios</CardTitle>
              <CardDescription>
                Estadísticas de usuarios por rol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {users.filter(u => u.role === 'responsable').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Responsables</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.role === 'calificador').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Calificadores</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {users.filter(u => u.role === 'asignador').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Asignadores</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </RouteProtector>
  );
} 