"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getIndicatorById, getPerspectiveById } from '@/lib/data';
import type { AssignedIndicator, AssignedVerificationMethod, Indicator, Perspective, VerificationStatus } from '@/lib/types';
import { statusTranslations } from '@/lib/types'; // Import translations
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale for date-fns
import { AlertCircle, CheckCircle, Clock, Eye, FileText, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IndicatorTableProps {
  assignedIndicators: AssignedIndicator[];
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
    Overdue: "bg-orange-100 text-orange-800 border-orange-300",
};


const VerificationMethodDetails: React.FC<{ vm: AssignedVerificationMethod }> = ({ vm }) => {
  console.log(vm)
  let currentStatus = vm.status;
  //@ts-ignore
  if (vm.status === 'Pending' && vm.dueDate && isPast(new Date(vm.dueDate?.seconds * 1000))) {
    currentStatus = 'Overdue';
  }
  const Icon = statusIcons[currentStatus] || AlertCircle;

  return (
    <div className="p-3 border border-border rounded-md bg-card mb-2 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
            <h4 className="font-semibold text-sm text-card-foreground">{vm?.name}</h4>
        </div>
        <Badge variant={statusVariantMap[currentStatus]} className={cn("text-xs whitespace-nowrap", statusColorClasses[currentStatus])}>
          <Icon className="h-3.5 w-3.5 mr-1.5" />
          {statusTranslations[currentStatus] || currentStatus}
        </Badge>
      </div>
      
      {
      //@ts-ignore
      vm.dueDate && <p className="text-xs mt-1.5 text-muted-foreground">Vence: <span className="font-medium text-foreground">{format(new Date(vm.dueDate?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })}</span></p>
      }
      
      {vm.submittedFile && (
        <div className="mt-2 text-xs flex items-center gap-2 border-t border-border pt-2">
          <FileText className="h-4 w-4 text-primary" />
          <div>
            <span className="font-medium text-foreground">{vm.submittedFile.name}</span>
            {
              //@ts-ignore
             vm.submittedFile.uploadedAt && <span className="text-muted-foreground text-xs block">Subido: {format(new Date(vm.dueDate?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })}</span>
            }
          </div>
          <Button variant="outline" size="sm" className="h-auto py-1 px-2 ml-auto text-xs" onClick={() => alert(`Visualizando ${vm.submittedFile?.name}`)}>
            <Eye className="h-3 w-3 mr-1" /> Ver
          </Button>
        </div>
      )}
      {vm.notes && <p className="text-xs mt-1.5 p-2 bg-muted/50 rounded-md border border-border italic text-muted-foreground">Notas: {vm.notes}</p>}
    </div>
  );
};


export function IndicatorTable({ assignedIndicators }: IndicatorTableProps) {
  const [indicators, setIndicators] = useState<Record<string, Indicator>>({});
  const [perspectives, setPerspectives] = useState<Record<string, Perspective>>({});

  useEffect(() => {
    const fetchData = async () => {
      const indicatorMap: Record<string, Indicator> = {};
      const perspectiveMap: Record<string, Perspective> = {};

      for (const assignedInd of assignedIndicators) {
        if (!indicators[assignedInd.indicatorId]) {
          const indicator = await getIndicatorById(assignedInd.indicatorId);
          if (indicator) {
            indicatorMap[assignedInd.indicatorId] = indicator;
          }
        }

        if (!perspectives[assignedInd.perspectiveId]) {
          const perspective = await getPerspectiveById(assignedInd.perspectiveId);
          if (perspective) {
            perspectiveMap[assignedInd.perspectiveId] = perspective;
          }
        }
      }

      setIndicators(prev => ({ ...prev, ...indicatorMap }));
      setPerspectives(prev => ({ ...prev, ...perspectiveMap }));
    };

    fetchData();
  }, [assignedIndicators]);

  if (!assignedIndicators || assignedIndicators.length === 0) {
    return (
      <Card className="shadow-lg border-border">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Mis Indicadores Asignados</CardTitle>
          <CardDescription>Actualmente no tienes indicadores asignados.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Vuelve más tarde o contacta a tu administrador.</p>
          <Button variant="link" className="mt-2" onClick={() => window.location.href = '/assign-indicators'}>Asignar Nuevo Indicador</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-border">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Mis Indicadores Asignados</CardTitle>
        <CardDescription>Realiza un seguimiento del estado de tus indicadores institucionales asignados y sus métodos de verificación. </CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-2">
        <Accordion type="single" collapsible className="w-full">
          {assignedIndicators.map((assignedInd,i) => {
            const indicator = indicators[assignedInd.indicatorId];
            const perspective = perspectives[assignedInd.perspectiveId];
            
            if (!indicator) {
              return (
                <AccordionItem value={`loading-${i}`} key={`loading-${i}`} className="border-b border-border last:border-b-0">
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            }

            let overallStatus = assignedInd.overallStatus || 'Pending';
            //@ts-ignore
            if (overallStatus === 'Pending' && assignedInd.assignedVerificationMethods.some(vm => vm.dueDate && isPast(new Date(vm.dueDate?.seconds * 1000)) && vm.status === 'Pending')) {
                overallStatus = 'Overdue';
            }
            const OverallStatusIcon = statusIcons[overallStatus] || AlertCircle;

            return (
              <AccordionItem value={i.toString()} key={i} className="border-b border-border last:border-b-0">
                <AccordionTrigger className="hover:bg-muted/30 px-4 py-4 rounded-t-md transition-colors data-[state=open]:bg-muted/50 data-[state=open]:shadow-inner">
                  <div className="flex flex-1 items-center justify-between w-full gap-4">
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors" title={indicator?.name}>{indicator?.name}</h3>
                      <div className="text-xs text-muted-foreground flex items-center mt-1 flex-wrap gap-x-1.5 gap-y-0.5">
                        {perspective?.icon && <perspective.icon className="h-3.5 w-3.5" />}
                        <span>{perspective?.name}</span>
                        <span className="hidden sm:inline-block">|</span>
                        <span className="whitespace-nowrap">Asignado: {
                        //@ts-ignore
                        format(new Date(assignedInd.assignedDate?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={statusVariantMap[overallStatus]} className={cn("text-sm whitespace-nowrap py-1 px-2.5", statusColorClasses[overallStatus])}>
                           <OverallStatusIcon className="h-4 w-4 mr-1.5" />
                           {statusTranslations[overallStatus] || overallStatus}
                        </Badge>
                        &nbsp;
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-background border-t border-border">
                  <h4 className="text-sm font-semibold mb-3 text-foreground/90">Métodos de Verificación:</h4>
                  {assignedInd.assignedVerificationMethods.length > 0 ? (
                    <div className="space-y-3">
                    {assignedInd.assignedVerificationMethods.map((vm,i) => (
                      <VerificationMethodDetails vm={vm} key={i} />
                    ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">No hay métodos de verificación asignados para este indicador.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
