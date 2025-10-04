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
import { calculateOverallStatus, STATUS_COLORS, STATUS_TRANSLATIONS, parseDate } from '@/lib/status-utils';

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
};

const statusVariantMap: Record<VerificationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: "secondary",
    Submitted: "default", 
    Approved: "default", 
    Rejected: "destructive",
    Overdue: "destructive",
};

const statusColorClasses: Record<VerificationStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Submitted: "bg-blue-100 text-blue-800 border-blue-300",
    Approved: "bg-green-100 text-green-800 border-green-300",
    Rejected: "bg-red-100 text-red-800 border-red-300",
    Overdue: "bg-red-100 text-red-800 border-red-300", // Cambio: antes era orange, ahora rojo
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
          getPerspectiveById(assignedIndicator.perspectiveId)
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
  // Calcular estado correcto considerando fechas de vencimiento
  let overallStatus = calculateOverallStatus(assignedIndicator);
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
                        const dateObj = parseDate(date);
                        
                        if (!dateObj) {
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
                      key={index}
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