"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getIndicatorById, getPerspectiveById } from '@/lib/data';
import type { User, AssignedIndicator, Indicator, Perspective, AssignedVerificationMethod } from '@/lib/types';
import { statusTranslations } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  XCircle,
  Calendar,
  User,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistorialModalProps {
  calificador: User;
  responsable: User;
  assignedIndicators: AssignedIndicator[];
  onClose: () => void;
}

const statusIcons: Record<string, React.ElementType> = {
  Pending: Clock,
  Submitted: FileText,
  Approved: CheckCircle,
  Rejected: XCircle,
  Overdue: AlertCircle,
};

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Submitted: "bg-blue-100 text-blue-800 border-blue-300",
  Approved: "bg-green-100 text-green-800 border-green-300",
  Rejected: "bg-red-100 text-red-800 border-red-300",
  Overdue: "bg-orange-100 text-orange-800 border-orange-300",
};

export function HistorialModal({ 
  calificador, 
  responsable, 
  assignedIndicators, 
  onClose 
}: HistorialModalProps) {
  const [indicators, setIndicators] = useState<Record<string, Indicator>>({});
  const [perspectives, setPerspectives] = useState<Record<string, Perspective>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
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
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [assignedIndicators]);

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    
    try {
      if (date.seconds) {
        return new Date(date.seconds * 1000);
      }
      if (typeof date === 'string') {
        return new Date(date);
      }
      if (date instanceof Date) {
        return date;
      }
      if (typeof date === 'object' && date.toDate) {
        return date.toDate();
      }
      if (typeof date === 'number') {
        return new Date(date);
      }
      return new Date(date);
    } catch (error) {
      console.error('Error parsing date:', error, date);
      return null;
    }
  };

  const formatDate = (date: any): string => {
    const parsedDate = parseDate(date);
    if (!parsedDate) return 'Fecha no disponible';
    
    try {
      return format(parsedDate, 'dd-MMM-yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const getHistorialEntries = (verificationMethod: AssignedVerificationMethod) => {
    const entries = [];
    
    // Estado actual
    entries.push({
      type: 'status',
      status: verificationMethod.status,
      date: verificationMethod.dueDate,
      description: `Estado actual: ${statusTranslations[verificationMethod.status] || verificationMethod.status}`
    });

    // Archivo subido
    if (verificationMethod.submittedFile) {
      entries.push({
        type: 'file',
        status: 'Submitted',
        date: verificationMethod.submittedFile.uploadedAt,
        description: `Archivo subido: ${verificationMethod.submittedFile.name}`
      });
    }

    // Historial de archivos
    if (verificationMethod.fileHistory && verificationMethod.fileHistory.length > 0) {
      verificationMethod.fileHistory.forEach((file, index) => {
        entries.push({
          type: 'file_history',
          status: 'Submitted',
          date: file.uploadedAt,
          description: `Archivo ${index + 1}: ${file.name}`
        });
      });
    }

    // Notas del calificador
    if (verificationMethod.notes) {
      entries.push({
        type: 'notes',
        status: verificationMethod.status,
        date: verificationMethod.dueDate,
        description: `Notas: ${verificationMethod.notes}`
      });
    }

    return entries.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime(); // Más reciente primero
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Historial de Calificaciones
          </DialogTitle>
          <DialogDescription>
            Historial de evaluaciones del calificador <strong>{calificador.name}</strong> 
            {' '}para el responsable <strong>{responsable.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : assignedIndicators.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No hay indicadores asignados para este responsable.
                  </p>
                </CardContent>
              </Card>
            ) : (
              assignedIndicators.map((assignedIndicator, index) => {
                const indicator = indicators[assignedIndicator.indicatorId];
                const perspective = perspectives[assignedIndicator.perspectiveId];
                
                if (!indicator) return null;

                return (
                  <Card key={assignedIndicator.id || index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {indicator.name}
                      </CardTitle>
                      <CardDescription>
                        {perspective?.name} • Asignado: {formatDate(assignedIndicator.assignedDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {assignedIndicator.assignedVerificationMethods.map((vm, vmIndex) => {
                          const historial = getHistorialEntries(vm);
                          
                          return (
                            <div key={vmIndex} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">{vm.name}</h4>
                                <Badge 
                                  className={cn("text-xs", statusColors[vm.status])}
                                >
                                  {statusTranslations[vm.status] || vm.status}
                                </Badge>
                              </div>
                              
                              <div className="space-y-3">
                                {historial.map((entry, entryIndex) => {
                                  const Icon = statusIcons[entry.status] || Clock;
                                  
                                  return (
                                    <div key={entryIndex} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">{entry.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Calendar className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">
                                            {formatDate(entry.date)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
