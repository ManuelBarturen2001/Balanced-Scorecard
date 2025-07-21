"use client";

import React, { useState, useEffect } from 'react';
import type { AssignedIndicator, AssignedVerificationMethod, VerificationStatus, VerificationMethod } from '@/lib/types';
import { updateAssignedIndicator } from '@/lib/data';
import { statusTranslations } from '@/lib/types';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Clock, FileText, Paperclip, Save, Info, Users, FileCheck, ChevronDown, Eye } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface GradingAssignmentAccordionItemProps {
  assignment: AssignedIndicator;
  indicator: import('@/lib/types').Indicator;
  indicatorName: string;
  userName: string;
  onUpdate: (assignmentId: string, updatedMethods: AssignedVerificationMethod[], newOverallStatus: VerificationStatus) => void;
  currentUser: import('@/lib/types').User | null;
}

const statusIcons: Record<VerificationStatus, React.ElementType> = {
  Pending: Clock,
  Submitted: FileCheck, 
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

export function GradingAssignmentAccordionItem({ assignment, indicator, indicatorName, userName, onUpdate, currentUser }: GradingAssignmentAccordionItemProps) {
  const [editableMethods, setEditableMethods] = useState<AssignedVerificationMethod[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const verificationMethods = indicator.verificationMethods || [];

  useEffect(() => {
    setEditableMethods(
      assignment.assignedVerificationMethods.map(vm => ({ ...vm, notes: '' }))
    );
  }, [assignment.assignedVerificationMethods]);

  const getMethodInfo = (name: string) => {
    return verificationMethods.find(vm => vm === name);
  };

  const handleStatusChange = (name: string, newStatus: VerificationStatus) => {
    setEditableMethods(prev => prev.map(m => m.name === name ? { ...m, status: newStatus } : m));
  };

  const handleNotesChange = (name: string, newNotes: string) => {
    setEditableMethods(prev => prev.map(m => m.name === name ? { ...m, notes: newNotes } : m));
  };

  const calculateOverallStatus = (methods: AssignedVerificationMethod[]): VerificationStatus => {
    if (methods.length === 0) return 'Pending';
    const statuses = methods.map(m => m.status);
    if (statuses.some(s => s === 'Rejected')) return 'Rejected';
    if (statuses.every(s => s === 'Approved')) return 'Approved';
    if (statuses.some(s => s === 'Submitted')) return 'Submitted';
    const hasPendingOrOverdue = statuses.some(s => s === 'Pending' || s === 'Overdue');
    if (hasPendingOrOverdue && !statuses.some(s => s === 'Submitted')) return 'Pending';
    return 'Pending';
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const updatedMethods: AssignedVerificationMethod[] = editableMethods.map(em => {
        const prevMethod = assignment.assignedVerificationMethods.find(m => m.name === em.name);
        let finalNotes = prevMethod?.notes || '';
        const newObservation = em.notes?.trim() || '';

        if (newObservation) {
            const approverNote = `[${currentUser?.name || 'Aprobador'}]: ${newObservation}`;
            if (finalNotes) {
                finalNotes += ' | ' + approverNote;
            } else {
                finalNotes = approverNote;
            }
        }
        
        return {
          ...prevMethod!,
          status: em.status,
          notes: finalNotes,
        };
      });

      const newOverallStatus = calculateOverallStatus(updatedMethods);
      
      await updateAssignedIndicator(assignment.id!, {
        assignedVerificationMethods: updatedMethods,
        overallStatus: newOverallStatus
      });
      
      onUpdate(assignment.id!, updatedMethods, newOverallStatus);
    } finally {
      setTimeout(() => setIsSaving(false), 700);
    }
  };
  
  const approvedMethodsCount = assignment.assignedVerificationMethods.filter(vm => vm.status === 'Approved').length;
  const totalMethodsCount = assignment.assignedVerificationMethods.length;
  const progressPercentage = totalMethodsCount > 0 ? (approvedMethodsCount / totalMethodsCount) * 100 : 0;
  
  let overallStatus = assignment.overallStatus || 'Pending';
  //@ts-ignore
  if (overallStatus === 'Pending' && assignment.assignedVerificationMethods.some(vm => vm.dueDate && isPast(new Date(vm.dueDate?.seconds * 1000)) && vm.status === 'Pending')) {
      overallStatus = 'Overdue';
  }
  const OverallStatusIcon = statusIcons[overallStatus] || Info;
  
  return (
    <AccordionItem value={assignment.id!} className="border-b border-border last:border-b-0">
      <AccordionTrigger className="hover:bg-muted/30 px-4 py-3 rounded-t-md transition-colors data-[state=open]:bg-muted/50 data-[state=open]:shadow-inner">
        <div className="flex flex-1 items-center justify-between w-full gap-4">
            <div className="flex-1 text-left min-w-0">
                <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors " title={indicatorName}>{indicatorName}</h3>
                <div className="text-xs text-muted-foreground flex items-center mt-1 flex-wrap gap-x-2 gap-y-0.5">
                    <Users className="h-3.5 w-3.5" /> <span className="truncate" title={userName}>{userName}</span>
                    <span className="hidden sm:inline-block">|</span>
                    <span className="whitespace-nowrap">Progreso: {approvedMethodsCount}/{totalMethodsCount}</span>
                </div>
                <Progress value={progressPercentage} className="h-1.5 mt-1.5 w-full sm:w-3/4 md:w-1/2" />
            </div>
            <div className="flex items-center gap-2 pl-2">
                 <Badge variant={statusVariantMap[overallStatus]} className={cn("text-xs whitespace-nowrap py-1 px-2", statusColorClasses[overallStatus])}>
                    <OverallStatusIcon className="h-3 w-3 mr-1" />
                    {statusTranslations[overallStatus] || overallStatus}
                </Badge>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 bg-background border-t border-border">
        <h4 className="text-sm font-semibold mb-3 text-foreground/90">Calificar Métodos de Verificación:</h4>
        {editableMethods.length > 0 ? (
          <div className="space-y-4">
            {editableMethods.map((method) => {
              const methodInfo = getMethodInfo(method.name);
              let currentVmStatus = method.status; 
              //@ts-ignore
              if (method.status === 'Pending' && method.dueDate && isPast(new Date(method.dueDate?.seconds * 1000))) {
                  currentVmStatus = 'Overdue';
              }
              const VmStatusIcon = statusIcons[currentVmStatus] || Info;

              return (
                <Card key={method.name} className="bg-card/70 shadow-sm">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-medium">{methodInfo}</CardTitle>
                        <Badge variant={statusVariantMap[currentVmStatus]} className={cn("text-xs", statusColorClasses[currentVmStatus])}>
                            <VmStatusIcon className="h-3 w-3 mr-1" />
                            {statusTranslations[currentVmStatus] || currentVmStatus}
                        </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {method.submittedFile ? (
                      <>
                        <div className="text-xs flex items-center gap-2 border-t border-border pt-3">
                            <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
                            <div>
                                <span className="font-medium text-foreground block" title={method.submittedFile.name}>
                                Archivo: {method.submittedFile.name}
                                </span>
                                {method.submittedFile.uploadedAt && (
                                    <span className="text-muted-foreground text-xs block">
                     
                                        Subido: {
                                        //@ts-ignore
                                        format(new Date( method.submittedFile?.uploadedAt?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })}
                                    </span>
                                )}
                            </div>
                            <Button variant="outline" size="sm" className="ml-auto py-0.5 px-1.5 h-auto text-xs" onClick={() => alert(`Visualizando ${method.submittedFile?.name} (simulado)`)}>
                                <Eye className="h-3 w-3 mr-1"/> Ver
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label htmlFor={`status-${assignment.id}-${method.name}`} className="text-xs">Estado de Calificación</Label>
                                <Select
                                value={method.status}
                                onValueChange={(value: VerificationStatus) => handleStatusChange(method.name, value)}
                                disabled={isSaving}
                                >
                                <SelectTrigger id={`status-${assignment.id}-${method.name}`} className="h-9 text-xs">
                                    <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Submitted" className="text-xs">{statusTranslations.Submitted} (En Revisión)</SelectItem>
                                    <SelectItem value="Approved" className="text-xs">{statusTranslations.Approved}</SelectItem>
                                    <SelectItem value="Rejected" className="text-xs">{statusTranslations.Rejected}</SelectItem>
                                    <SelectItem value="Pending" className="text-xs">{statusTranslations.Pending} (Reabrir)</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor={`notes-${assignment.id}-${method.name}`} className="text-xs">Observaciones del Administrador</Label>
                                <Textarea
                                id={`notes-${assignment.id}-${method.name}`}
                                placeholder="Escribe tus observaciones aquí..."
                                value={method.notes}
                                onChange={(e) => handleNotesChange(method.name, e.target.value)}
                                className="min-h-[60px] text-xs"
                                disabled={isSaving}
                                />
                            </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">No hay archivo subido para este método.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
            No hay métodos de verificación asignados para este indicador.
          </p>
        )}
        <CardFooter className="px-0 pt-5 flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving || editableMethods.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Calificación'}
            </Button>
        </CardFooter>
      </AccordionContent>
    </AccordionItem>
  );
}
