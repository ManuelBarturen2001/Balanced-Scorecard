import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AssignedIndicator, User, Faculty } from '@/lib/types';
import { STATUS_TRANSLATIONS, calculateOverallStatus } from './status-utils';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportData {
  title: string;
  user?: User;
  date: string;
  stats: {
    total: number;
    completed: number;
    active: number;
    pending: number;
    overdue: number;
    completionRate: string;
  };
  assignments: AssignedIndicator[];
  users?: User[];
  faculties?: Faculty[];
}

/**
 * Genera un reporte PDF profesional usando jsPDF
 */
export function generateProfessionalPDF(data: ReportData) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  let currentY = 20;

  // Colores del tema
  const primaryColor = [59, 130, 246]; // Blue
  const secondaryColor = [107, 114, 128]; // Gray
  const accentColor = [34, 197, 94]; // Green

  // Header del documento
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.title, 20, 25);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generado el: ${data.date}`, 20, 35);
  
  if (data.user) {
    pdf.text(`Por: ${data.user.name}`, pageWidth - 20, 35, { align: 'right' });
  }

  currentY = 60;

  // Resumen estadístico
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumen General', 20, currentY);
  currentY += 10;

  // Crear tabla de estadísticas
  const statsData = [
    ['Total de Asignaciones', data.stats.total.toString()],
    ['Completadas', `${data.stats.completed} (${((data.stats.completed / data.stats.total) * 100).toFixed(1)}%)`],
    ['Activas (En revisión)', data.stats.active.toString()],
    ['Pendientes', data.stats.pending.toString()],
    ['Vencidas', data.stats.overdue.toString()],
    ['Tasa de Completación', data.stats.completionRate]
  ];

  pdf.autoTable({
    startY: currentY,
    head: [['Métrica', 'Valor']],
    body: statsData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 12,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 11,
      textColor: [0, 0, 0]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 20, right: 20 }
  });

  currentY = (pdf as any).lastAutoTable.finalY + 20;

  // Gráfico de progreso visual (barra de progreso simple)
  if (currentY < pageHeight - 50) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Progreso General', 20, currentY);
    currentY += 15;

    const barWidth = pageWidth - 40;
    const barHeight = 20;
    const completionPercentage = parseFloat(data.stats.completionRate);

    // Fondo de la barra
    pdf.setFillColor(229, 231, 235);
    pdf.rect(20, currentY, barWidth, barHeight, 'F');

    // Barra de progreso
    const progressWidth = (barWidth * completionPercentage) / 100;
    const color = completionPercentage > 75 ? accentColor : completionPercentage > 50 ? [251, 191, 36] : [239, 68, 68];
    pdf.setFillColor(...color);
    pdf.rect(20, currentY, progressWidth, barHeight, 'F');

    // Bordes de la barra
    pdf.setDrawColor(156, 163, 175);
    pdf.rect(20, currentY, barWidth, barHeight);

    // Texto del porcentaje
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`${completionPercentage}%`, 20 + barWidth / 2, currentY + 13, { align: 'center' });

    currentY += 40;
  }

  // Nueva página si es necesario
  if (currentY > pageHeight - 100) {
    pdf.addPage();
    currentY = 20;
  }

  // Detalles de asignaciones
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalle de Asignaciones Recientes', 20, currentY);
  currentY += 10;

  // Preparar datos para la tabla de asignaciones
  const assignmentData = data.assignments
    .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
    .slice(0, 20) // Mostrar solo las 20 más recientes para evitar documentos muy largos
    .map(assignment => {
      const user = data.users?.find(u => u.id === assignment.userId);
      const faculty = data.faculties?.find(f => f.id === user?.facultyId);
      const status = calculateOverallStatus(assignment);
      const assignedDate = new Date(assignment.assignedDate);
      
      return [
        assignment.id?.substring(0, 8) + '...' || 'N/A',
        user?.name || 'Usuario desconocido',
        faculty?.name || 'Sin facultad',
        STATUS_TRANSLATIONS[status],
        assignedDate.toLocaleDateString('es-ES'),
        assignment.jury?.length?.toString() || '0'
      ];
    });

  pdf.autoTable({
    startY: currentY,
    head: [['ID', 'Responsable', 'Facultad', 'Estado', 'Fecha Asignación', 'Jurados']],
    body: assignmentData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 25 }, // ID
      1: { cellWidth: 40 }, // Responsable
      2: { cellWidth: 45 }, // Facultad
      3: { cellWidth: 25 }, // Estado
      4: { cellWidth: 30 }, // Fecha
      5: { cellWidth: 20 }  // Jurados
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 20, right: 20 }
  });

  // Footer
  const addFooter = () => {
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        `Sistema de Gestión de Indicadores - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  };

  addFooter();

  // Generar el nombre del archivo
  const fileName = `${data.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Guardar el PDF
  pdf.save(fileName);
}

/**
 * Genera un reporte Excel mejorado (CSV con formato mejorado)
 */
export function generateProfessionalExcel(data: ReportData) {
  const BOM = '\uFEFF'; // Byte Order Mark para UTF-8
  
  const csvContent = [
    // Header del reporte
    [data.title],
    [`Generado el: ${data.date}`],
    data.user ? [`Por: ${data.user.name}`] : [],
    [''],
    
    // Estadísticas generales
    ['RESUMEN GENERAL'],
    ['Métrica', 'Valor', 'Porcentaje'],
    ['Total de Asignaciones', data.stats.total, '100%'],
    ['Completadas', data.stats.completed, `${((data.stats.completed / data.stats.total) * 100).toFixed(1)}%`],
    ['Activas (En revisión)', data.stats.active, `${((data.stats.active / data.stats.total) * 100).toFixed(1)}%`],
    ['Pendientes', data.stats.pending, `${((data.stats.pending / data.stats.total) * 100).toFixed(1)}%`],
    ['Vencidas', data.stats.overdue, `${((data.stats.overdue / data.stats.total) * 100).toFixed(1)}%`],
    ['Tasa de Completación', data.stats.completionRate, ''],
    [''],
    
    // Detalle de asignaciones
    ['DETALLE DE ASIGNACIONES'],
    [
      'ID Asignación',
      'Responsable',
      'Email Responsable',
      'Facultad',
      'Estado Actual',
      'Fecha Asignación',
      'Fecha Vencimiento',
      'Número de Jurados',
      'Métodos de Verificación',
      'Progreso (%)'
    ],
    
    ...data.assignments
      .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())
      .map(assignment => {
        const user = data.users?.find(u => u.id === assignment.userId);
        const faculty = data.faculties?.find(f => f.id === user?.facultyId);
        const status = calculateOverallStatus(assignment);
        const assignedDate = new Date(assignment.assignedDate);
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        
        // Calcular progreso
        const totalMethods = assignment.assignedVerificationMethods?.length || 0;
        const completedMethods = assignment.assignedVerificationMethods?.filter(
          method => method.status === 'Approved'
        ).length || 0;
        const progress = totalMethods > 0 ? Math.round((completedMethods / totalMethods) * 100) : 0;
        
        return [
          assignment.id || 'N/A',
          user?.name || 'Usuario desconocido',
          user?.email || 'Email no disponible',
          faculty?.name || 'Sin facultad',
          STATUS_TRANSLATIONS[status],
          assignedDate.toLocaleDateString('es-ES'),
          dueDate ? dueDate.toLocaleDateString('es-ES') : 'Sin fecha límite',
          assignment.jury?.length?.toString() || '0',
          totalMethods.toString(),
          `${progress}%`
        ];
      })
  ];

  // Convertir a CSV
  const csv = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Crear y descargar
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}