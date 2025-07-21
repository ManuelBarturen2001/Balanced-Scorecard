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
import { AlertCircle, Briefcase, CheckCircle, Clock, FileText, Info, Paperclip, X } from 'lucide-react';
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
};

const statusVariantMapModal: Record<VerificationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: "secondary",
    Submitted: "default", 
    Approved: "default", 
    Rejected: "destructive",
    Overdue: "destructive",
};

const statusColorClassesModal: Record<VerificationStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Submitted: "bg-blue-100 text-blue-800 border-blue-300",
    Approved: "bg-green-100 text-green-800 border-green-300",
    Rejected: "bg-red-100 text-red-800 border-red-300",
    Overdue: "bg-orange-100 text-orange-800 border-orange-300",
};

export function AssignmentDetailsModal({ indicator, isOpen, onClose }: AssignmentDetailsModalProps) {
  const [indicatorInfo, setIndicatorInfo] = useState<Indicator | undefined>();
  const [perspectiveInfo, setPerspectiveInfo] = useState<Perspective | undefined>();
  const [isLoading, setIsLoading] = useState(true);

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
  //@ts-ignore
  if (overallStatus === 'Pending' && indicator.assignedVerificationMethods.some(vm => vm.dueDate && isPast(new Date(vm.dueDate?.seconds * 1000)) && vm.status === 'Pending')) {
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
            <p className="flex items-center">
            <Briefcase className="h-4 w-4 mr-2" />             
             Perspectiva: <span className="font-semibold text-foreground ml-1">{perspectiveInfo?.name || 'Sin Perspectiva'}</span>
            </p>
            <p className='text-left'>Asignado: <span className="font-semibold text-foreground">{
              //@ts-ignore
              format(new Date(indicator.assignedDate?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })
            }</span></p>
          </div>  
        </DialogHeader>
        
        <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
          <h3 className="text-md font-semibold mb-3 text-foreground">Medios de Verificación</h3>
          <div className="space-y-4">
            {indicator.assignedVerificationMethods.map((vm,index) => {
              let currentVmStatus = vm.status;
              //@ts-ignore
              if (vm.status === 'Pending' && vm.dueDate && isPast(new Date(vm.dueDate?.seconds * 1000))) {
                currentVmStatus = 'Overdue';
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
                     <p className={cn("text-xs mb-2", currentVmStatus === 'Overdue' ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                        Fecha Límite: {
                        //@ts-ignore
                        format(new Date(vm.dueDate?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })}
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
                                Subido: {
                                 //@ts-ignore
                                format(new Date(vm.submittedFile?.uploadedAt?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })}
                            </span>
                        )}
                         {vm.submittedFile.size && (
                            <span className="text-muted-foreground text-xs block">
                                Tamaño: {(vm.submittedFile.size / 1024).toFixed(2)} KB
                            </span>
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
