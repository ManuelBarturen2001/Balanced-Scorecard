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
import { AssignedIndicator, User, Faculty, Office, ProfessionalSchool } from '@/lib/types';
import { getAllAssignedIndicators, getAllUsers, getAllFaculties, getAllOffices, getAllProfessionalSchools } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { format, isPast, isToday, isWithinInterval, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VerificationStatus } from '@/lib/types';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

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
  const [compactDateFilter, setCompactDateFilter] = useState<'today' | 'week' | 'month'>('week');
  
  // Filtros para Vista Detallada
  const [detailedFacultyFilter, setDetailedFacultyFilter] = useState<string>('all');
  const [detailedSchoolFilter, setDetailedSchoolFilter] = useState<string>('all');
  const [detailedOfficeFilter, setDetailedOfficeFilter] = useState<string>('all');
  const [detailedDateFrom, setDetailedDateFrom] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [detailedDateTo, setDetailedDateTo] = useState<Date | undefined>(new Date());
  
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
      return vm.status === 'Pending' && due && isPast(due);
    });
    return overdue ? 'Overdue' : 'Pending';
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
  const filterByCompactDate = (assignment: any, dateFilter: 'today' | 'week' | 'month') => {
    const assignmentDate = assignment.assignedDateObj;
    if (!assignmentDate) return false;
    
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return isToday(assignmentDate);
      case 'week':
        return isWithinInterval(assignmentDate, { start: subWeeks(now, 1), end: now });
      case 'month':
        return isWithinInterval(assignmentDate, { start: subMonths(now, 1), end: now });
      default:
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
    if (viewMode === 'compact') {
      return normalizedAssignments.filter(assignment => 
        filterByEntity(assignment, compactFacultyFilter, compactSchoolFilter, compactOfficeFilter) &&
        filterByCompactDate(assignment, compactDateFilter)
      );
    } else {
      return normalizedAssignments.filter(assignment => 
        filterByEntity(assignment, detailedFacultyFilter, detailedSchoolFilter, detailedOfficeFilter) &&
        filterByDateRange(assignment, detailedDateFrom, detailedDateTo)
      );
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
    const reportData = {
      title: 'Reporte de Administrador',
      date: format(new Date(), 'dd-MMM-yyyy', { locale: es }),
      stats: {
        total: totalAssignments,
        completed: completedAssignments,
        active: activeAssignments,
        pending: pendingAssignments,
        overdue: overdueAssignments,
        completionRate: completionRate.toFixed(1)
      },
      facultyStats: statsByFaculty.filter(stat => stat.total > 0),
      recentAssignments: filteredAssignments
        .sort((a, b) => (b.assignedDateObj?.getTime() || 0) - (a.assignedDateObj?.getTime() || 0))
        .slice(0, 10)
    };
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Reporte de Administrador', 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${reportData.date}`, 40, 60);

    // Resumen
    doc.setFontSize(12);
    doc.text('Resumen General', 40, 90);
    // @ts-ignore - autoTable está agregado por el import dinámico
    doc.autoTable({
      startY: 100,
      styles: { fontSize: 10 },
      head: [['Total', 'Completadas', 'Activas', 'Pendientes', 'Vencidas', 'Tasa de Completación']],
      body: [[
        reportData.stats.total,
        reportData.stats.completed,
        reportData.stats.active,
        reportData.stats.pending,
        reportData.stats.overdue,
        `${reportData.stats.completionRate}%`
      ]]
    });

    // Estadísticas por Facultad
    doc.text('Estadísticas por Facultad', 40, (doc as any).lastAutoTable.finalY + 30);
    // @ts-ignore
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 40,
      styles: { fontSize: 10 },
      head: [['Facultad', 'Total', 'Completadas', 'Activas', 'Pendientes', 'Vencidas']],
      body: reportData.facultyStats.map(stat => [
        stat.faculty.name,
        stat.total,
        stat.completed,
        stat.active,
        stat.pending,
        stat.overdue
      ])
    });

    // Asignaciones recientes
    doc.text('Asignaciones Recientes', 40, (doc as any).lastAutoTable.finalY + 30);
    // @ts-ignore
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 40,
      styles: { fontSize: 9 },
      head: [['ID', 'Estudiante', 'Facultad', 'Estado', 'Fecha Asignación']],
      body: reportData.recentAssignments.map(a => [
        a.id || '-',
        getStudentName(a.userId),
        getFacultyNameByUserId(a.userId),
        statusTranslations[a.derivedStatus || 'Pending'],
        a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
      ])
    });

    doc.save(`reporte-admin-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateExcelReport = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumenData = [
      ['Reporte de Administrador'],
      ['Fecha', format(new Date(), 'dd-MMM-yyyy', { locale: es })],
      [],
      ['Estadísticas Generales'],
      ['Total Asignaciones', totalAssignments],
      ['Completadas', completedAssignments],
      ['Activas', activeAssignments],
      ['Pendientes', pendingAssignments],
      ['Vencidas', overdueAssignments],
      ['Tasa de Completación', `${completionRate.toFixed(1)}%`],
    ];
    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

    // Hoja 2: Por Facultad
    const facultadHeader = ['Facultad', 'Total', 'Completadas', 'Activas', 'Pendientes', 'Vencidas'];
    const facultadRows = statsByFaculty
      .filter(stat => stat.total > 0)
      .map(stat => [stat.faculty.name, stat.total, stat.completed, stat.active, stat.pending, stat.overdue]);
    const facultadSheet = XLSX.utils.aoa_to_sheet([facultadHeader, ...facultadRows]);
    XLSX.utils.book_append_sheet(wb, facultadSheet, 'Por Facultad');

    // Hoja 3: Recientes
    const recientesHeader = ['ID', 'Estudiante', 'Facultad', 'Estado', 'Fecha Asignación'];
    const recientesRows = filteredAssignments
      .sort((a, b) => (b.assignedDateObj?.getTime() || 0) - (a.assignedDateObj?.getTime() || 0))
      .slice(0, 50)
      .map(a => [
        a.id || '-',
        getStudentName(a.userId),
        getFacultyNameByUserId(a.userId),
        statusTranslations[a.derivedStatus || 'Pending'],
        a.assignedDateObj ? format(a.assignedDateObj, 'dd-MMM-yyyy', { locale: es }) : '-'
      ]);
    const recientesSheet = XLSX.utils.aoa_to_sheet([recientesHeader, ...recientesRows]);
    XLSX.utils.book_append_sheet(wb, recientesSheet, 'Recientes');

    XLSX.writeFile(wb, `reporte-admin-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administrador</h1>
          <p className="text-muted-foreground">
            Panel de control general del sistema
          </p>
        </div>
        <div className="flex gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha desde</label>
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
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha hasta</label>
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
  );
} 