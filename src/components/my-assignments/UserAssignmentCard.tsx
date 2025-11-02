"use client";

import type { AssignedIndicator, AssignedVerificationMethod, VerificationStatus, Indicator, Perspective } from '@/lib/types';
import { getIndicatorById, getPerspectiveById } from '@/lib/data';
import { statusTranslations } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, UploadCloud, CheckCircle, AlertCircle, Clock, FileText, Info, Briefcase } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UserVerificationMethodItem } from './UserVerificationMethodItem';
import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';

interface UserAssignmentCardProps {
  assignedIndicator: AssignedIndicator;
  onViewDetails: (indicator: AssignedIndicator) => void;
  onFileUpload: (assignedIndicatorId: string, verificationMethodName: string, file: File) => void;
}

const statusIcons: Record<VerificationStatus, React.ElementType> = {
  Pending: Clock,
  Submitted: FileText,
  Approved: CheckCircle,
  Rejected: AlertCircle,
  Overdue: AlertCircle,
  Observed: AlertCircle,
};

const statusVariantMap: Record<VerificationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: "secondary",
    Submitted: "default", 
    Approved: "default", 
    Rejected: "destructive",
    Overdue: "destructive",
    Observed: "secondary",
};

const statusColorClasses: Record<VerificationStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Submitted: "bg-blue-100 text-blue-800 border-blue-300",
    Approved: "bg-green-100 text-green-800 border-green-300",
    Rejected: "bg-red-100 text-red-800 border-red-300",
    Overdue: "bg-orange-100 text-orange-800 border-orange-300",
    Observed: "bg-amber-100 text-amber-800 border-amber-300",
};

export function UserAssignmentCard({ assignedIndicator, onViewDetails, onFileUpload }: UserAssignmentCardProps) {
  const [indicatorInfo, setIndicatorInfo] = useState<Indicator | undefined>();
  const [perspectiveInfo, setPerspectiveInfo] = useState<Perspective | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [indicator, perspective] = await Promise.all([
          getIndicatorById(assignedIndicator.indicatorId),
          getPerspectiveById(assignedIndicator.perspectiveId || '')
        ]);
        setIndicatorInfo(indicator);
        setPerspectiveInfo(perspective);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [assignedIndicator.indicatorId, assignedIndicator.perspectiveId]);

  if (isLoading) {
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="loading" className="border-none">
            <AccordionTrigger className="hover:bg-muted/30 px-4 py-4 rounded-t-md transition-colors data-[state=open]:bg-muted/50 data-[state=open]:shadow-inner">
              <div className="flex flex-1 items-center justify-between w-full gap-4">
                <div className="flex-1 text-left min-w-0">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-background border-t border-border">
              <div className="space-y-4">
                <Skeleton className="h-5 w-1/3 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    );
  }
  console.log(assignedIndicator.overallStatus)
  let overallStatus = assignedIndicator.overallStatus || 'Pending';
  //@ts-ignore
  if (overallStatus === 'Pending' && assignedIndicator.assignedVerificationMethods.some(vm => {
    try {
      if (!vm.dueDate) return false;
      let dateObj: Date;
      const dueDate = vm.dueDate as any;
      if (dueDate.seconds) {
        dateObj = new Date(dueDate.seconds * 1000);
      } else if (dueDate instanceof Date) {
        dateObj = dueDate;
      } else if (typeof dueDate === 'object' && dueDate.toDate) {
        dateObj = dueDate.toDate();
      } else if (typeof dueDate === 'number') {
        dateObj = new Date(dueDate);
      } else if (typeof dueDate === 'string') {
        dateObj = new Date(dueDate);
      } else {
        dateObj = new Date(dueDate);
      }
      return !isNaN(dateObj.getTime()) && dateObj.getTime() !== 0 && isPast(dateObj) && vm.status === 'Pending';
    } catch (error) {
      console.error('Error checking due date:', error);
      return false;
    }
  })) {
      overallStatus = 'Overdue';
  }
  const OverallStatusIcon = statusIcons[overallStatus] || Info;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="border-none">
          <AccordionTrigger className="hover:bg-muted/30 px-4 py-4 rounded-t-md transition-colors data-[state=open]:bg-muted/50 data-[state=open]:shadow-inner">
            <div className="flex flex-1 items-center justify-between w-full gap-4">
              <div className="flex-1 text-left min-w-0">
                <CardTitle className="font-headline text-lg leading-tight">{indicatorInfo?.name || 'Detalles del Indicador'}</CardTitle>
                <CardDescription className="text-xs flex items-center mt-1">
                  <Briefcase className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  {perspectiveInfo?.name || 'Sin Perspectiva'}
                  <span className="mx-1.5 text-muted-foreground">|</span>
                  Asignado: {
                    (() => {
                      try {
                        const date = assignedIndicator.assignedDate;
                        if (!date) return 'Fecha no disponible';
                        
                        let dateObj: Date;
                        const dateAny = date as any;
                        if (dateAny.seconds) {
                          dateObj = new Date(dateAny.seconds * 1000);
                        } else if (dateAny instanceof Date) {
                          dateObj = dateAny;
                        } else if (typeof dateAny === 'object' && dateAny.toDate) {
                          dateObj = dateAny.toDate();
                        } else if (typeof dateAny === 'number') {
                          dateObj = new Date(dateAny);
                        } else if (typeof dateAny === 'string') {
                          dateObj = new Date(dateAny);
                        } else {
                          dateObj = new Date(dateAny);
                        }
                        
                        if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
                          return 'Fecha no disponible';
                        }
                        
                        return format(dateObj, 'dd-MMM-yyyy HH:mm:ss', { locale: es });
                      } catch (error) {
                        console.error('Error formatting date:', error);
                        return 'Fecha no disponible';
                      }
                    })()
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariantMap[overallStatus]} className={cn("text-xs whitespace-nowrap py-1 px-2", statusColorClasses[overallStatus])}>
                  <OverallStatusIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                  {statusTranslations[overallStatus] || overallStatus}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-background border-t border-border">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground/90">Métodos de Verificación:</h4>
              {assignedIndicator.assignedVerificationMethods.length > 0 ? (
                <div className="space-y-3">
                  {assignedIndicator.assignedVerificationMethods.map((vm,index) => (
                    <UserVerificationMethodItem
                      key={`${assignedIndicator.id}-${index}-${vm.status}-${JSON.stringify(vm.submittedFile)}`}
                      assignedIndicatorId={assignedIndicator.id!}
                      verificationMethod={vm}
                      onFileUpload={onFileUpload}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 border border-dashed rounded-md text-center">
                  No hay métodos de verificación para este indicador.
                </p>
              )}
              <Button onClick={() => onViewDetails(assignedIndicator)} variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalles Completos
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
} 