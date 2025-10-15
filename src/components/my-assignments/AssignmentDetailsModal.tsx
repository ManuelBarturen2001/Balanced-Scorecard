"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getIndicatorById, getPerspectiveById } from '@/lib/data';
import type { AssignedIndicator, Indicator, Perspective, VerificationStatus } from '@/lib/types';
import { statusTranslations } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Briefcase, CheckCircle, Clock, FileText, Info, Paperclip, X, Eye, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AssignmentDetailsModalProps {
  indicator: AssignedIndicator | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusIconsModal: Record<VerificationStatus, React.ElementType> = {
  Pending: Clock,
  Submitted: FileText,
  Approved: CheckCircle,
  Rejected: AlertCircle,
  Overdue: AlertCircle,
  Observed: AlertCircle,
};

const statusVariantMapModal: Record<VerificationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: "secondary",
    Submitted: "default", 
    Approved: "default", 
    Rejected: "destructive",
    Overdue: "destructive",
    Observed: "secondary",
};

const statusColorClassesModal: Record<VerificationStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Submitted: "bg-blue-100 text-blue-800 border-blue-300",
    Approved: "bg-green-100 text-green-800 border-green-300",
    Rejected: "bg-red-100 text-red-800 border-red-300",
    Overdue: "bg-orange-100 text-orange-800 border-orange-300",
    Observed: "bg-amber-100 text-amber-800 border-amber-300",
};

export function AssignmentDetailsModal({ indicator, isOpen, onClose }: AssignmentDetailsModalProps) {
  const [indicatorInfo, setIndicatorInfo] = useState<Indicator | undefined>();
  const [perspectiveInfo, setPerspectiveInfo] = useState<Perspective | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Utilidad robusta para parsear fechas provenientes de diferentes fuentes (Firestore Timestamp, Date, string, number)
  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    try {
      // Firestore Timestamp-like { seconds: number }
      if (typeof date === 'object' && date !== null && 'seconds' in date) {
        const seconds = (date as any).seconds as number;
        return new Date(seconds * 1000);
      }
      // Firestore Timestamp con método toDate()
      if (typeof date === 'object' && date !== null && typeof (date as any).toDate === 'function') {
        return (date as any).toDate();
      }
      // Date
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : date;
      }
      // number (ms)
      if (typeof date === 'number') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      }
      // string ISO/parseable
      if (typeof date === 'string') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      }
      // Fallback
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    } catch (err) {
      console.error('Error parsing date in AssignmentDetailsModal:', err, date);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (indicator) {
        try {
          const [indicatorData, perspectiveData] = await Promise.all([
            getIndicatorById(indicator.indicatorId),
            getPerspectiveById(indicator.perspectiveId)
          ]);
          setIndicatorInfo(indicatorData);
          setPerspectiveInfo(perspectiveData);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, [indicator]);

  if (!indicator) return null;

  let overallStatus = indicator.overallStatus || 'Pending';
  if (
    (overallStatus === 'Pending' || overallStatus === 'Observed') &&
    indicator.assignedVerificationMethods.some(vm => {
      const due = parseDate(vm.dueDate);
      return (vm.status === 'Pending' || vm.status === 'Observed') && due && isPast(due);
    })
  ) {
    overallStatus = 'Overdue';
  }
  const OverallStatusIcon = statusIconsModal[overallStatus] || Info;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        {!isLoading ? <>
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="grid text-left gap-2">
            <DialogTitle className="text-xl font-headline text-primary">{indicatorInfo?.name || 'Detalles del Indicador'}</DialogTitle>
            <div>
              <Badge variant={statusVariantMapModal[overallStatus]} className={cn("text-sm whitespace-nowrap py-1 px-2.5", statusColorClassesModal[overallStatus])}>
                <OverallStatusIcon className="h-4 w-4 mr-1.5" />
                {statusTranslations[overallStatus] || overallStatus}
              </Badge>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mt-2">
  {/* Línea de Perspectiva con ícono */}
  <div className="flex items-center">
    <Briefcase className="h-4 w-4 mr-2" />
    <span>
      Perspectiva: 
      <span className="font-semibold text-foreground ml-1">
        {perspectiveInfo?.name || 'Sin Perspectiva'}
      </span>
    </span>
  </div>

  {/* Línea de fecha asignada */}
  <p className="text-left">
    Asignado: 
    <span className="font-semibold text-foreground ml-1">
      {(() => {
        const assigned = parseDate((indicator as any).assignedDate);
        return assigned ? format(assigned, 'dd-MMM-yyyy HH:mm:ss', { locale: es }) : 'Fecha no disponible';
      })()}
    </span>
  </p>
</div>  
        </DialogHeader>
        
        <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
          <h3 className="text-md font-semibold mb-3 text-foreground">Medios de Verificación</h3>
          <div className="space-y-4">
            {indicator.assignedVerificationMethods.map((vm,index) => {
              let currentVmStatus = vm.status;
              //@ts-ignore
              if (vm.status === 'Pending' || vm.status === 'Observed') {
                const due = parseDate(vm.dueDate);
                if (due && isPast(due)) {
                currentVmStatus = 'Overdue';
                }
              }
              const VmStatusIcon = statusIconsModal[currentVmStatus] || Info;
              return (
                <div key={index} className="p-4 border border-border rounded-lg bg-card/70 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-foreground">{vm?.name}</h4>
                    <Badge variant={statusVariantMapModal[currentVmStatus]} className={cn("text-xs", statusColorClassesModal[currentVmStatus])}>
                        <VmStatusIcon className="h-3 w-3 mr-1" />
                        {statusTranslations[currentVmStatus] || currentVmStatus}
                    </Badge>
                  </div>
                  {vm.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Vence: {(() => {
                      try {
                        const dateObj = parseDate(vm.dueDate as any);
                        if (!dateObj) {
                          return 'Fecha no disponible';
                        }
                        
                        return format(dateObj, 'dd-MMM-yyyy', { locale: es });
                      } catch (error) {
                        console.error('Error formatting date:', error);
                        return 'Fecha no disponible';
                      }
                    })()}
                  </p>
                )}
                  {vm.submittedFile && (
                    <div className="mt-2 text-xs flex items-center gap-2 border-t border-border pt-2">
                      <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground block" title={vm.submittedFile.name}>
                          {vm.submittedFile.name}
                        </span>
                        {vm.submittedFile.uploadedAt && (
                             <span className="text-muted-foreground text-xs block">
                                Subido: {(() => {
                                  const uploaded = parseDate(vm.submittedFile?.uploadedAt as any);
                                  return uploaded ? format(uploaded, 'dd-MMM-yyyy HH:mm:ss', { locale: es }) : 'Fecha no disponible';
                                })()}
                            </span>
                        )}
                         {vm.submittedFile.size && (
                            <span className="text-muted-foreground text-xs block">
                                Tamaño: {(vm.submittedFile.size / 1024).toFixed(2)} KB
                            </span>
                        )}
                      </div>
                                             <div className="flex gap-1">
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="h-auto py-1 px-2 text-xs"
                           onClick={() => {
                             const filePreview = document.createElement('div');
                             filePreview.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center';
                             filePreview.innerHTML = `
                               <div class="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
                                 <div class="flex items-center justify-between p-4 border-b">
                                   <div>
                                                                   <h3 class="font-semibold">${vm.submittedFile?.name || 'Archivo'}</h3>
                              <p class="text-sm text-gray-500">${((vm.submittedFile?.size || 0) / 1024).toFixed(2)} KB</p>
                                   </div>
                                   <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                     </svg>
                                   </button>
                                 </div>
                                 <div class="flex-1 p-4">
                                                                       <iframe src="${vm.submittedFile?.url || ''}" class="w-full h-full border-0" frameborder="0"></iframe>
                                 </div>
                               </div>
                             `;
                             document.body.appendChild(filePreview);
                             filePreview.addEventListener('click', (e) => {
                               if (e.target === filePreview) {
                                 filePreview.remove();
                               }
                             });
                           }}
                         >
                           <Eye className="h-3 w-3 mr-1" /> Ver
                         </Button>
                         {currentVmStatus === 'Pending' && vm.submittedFile && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="h-auto py-1 px-2 text-xs"
                             onClick={() => {
                               // Aquí podrías implementar la lógica para editar el archivo
                               // Por ahora solo mostrará un mensaje
                               alert('Funcionalidad de edición para asignadores próximamente');
                             }}
                           >
                             <Edit className="h-3 w-3 mr-1" /> Editar
                           </Button>
                         )}
                       </div>
                    </div>
                  )}
                  {vm.notes && (
                    <p className="text-xs mt-2 p-2 bg-muted/50 rounded-md border border-border/50 italic text-muted-foreground">
                        Notas: {vm.notes}
                    </p>
                  )}
                  

                </div>
              );
            })}
            {indicator.assignedVerificationMethods.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay métodos de verificación para este indicador.</p>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-6 pt-4 border-t border-border flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">
              <X className="mr-2 h-4 w-4" /> Cerrar
            </Button>
          </DialogClose>
        </div></> : (
          <div className="p-6">
            <div className="space-y-4">
              <DialogTitle className="grid gap-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-24" />
              </DialogTitle>
              <div className="space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        )}
        

      </DialogContent>
    </Dialog>
  );
}
