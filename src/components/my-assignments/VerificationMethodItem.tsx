"use client";

import type { AssignedVerificationMethod, VerificationStatus } from '@/lib/types';
import { updateAssignedIndicator } from '@/lib/data';
import { statusTranslations } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UploadCloud, Eye, CheckCircle, AlertCircle, Clock, FileText, Paperclip, Info, Check, X } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import React, { useRef, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VerificationMethodItemProps {
  assignedIndicatorId: string;
  verificationMethod: AssignedVerificationMethod;
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
    Overdue: "bg-orange-100 text-orange-800 border-orange-300",
};

export function VerificationMethodItem({ assignedIndicatorId, verificationMethod, onFileUpload }: VerificationMethodItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [localMethod, setLocalMethod] = useState(verificationMethod);

  useEffect(() => {
    console.log(verificationMethod)
    setLocalMethod(verificationMethod);
  }, [verificationMethod]);

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

  let currentStatus = localMethod.status;
  //@ts-ignore
  if (localMethod.status === 'Pending' && localMethod.dueDate && isPast(new Date(localMethod.dueDate?.seconds * 1000))) {
    currentStatus = 'Overdue';
  }
  const StatusIcon = statusIcons[currentStatus] || Info;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(assignedIndicatorId, verificationMethod.name, file);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una URL válida.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const methodName = verificationMethod?.name || 'Método de Verificación';
      const currentDate = new Date();
      const fileName = `${methodName.substring(0, 4)}_${format(currentDate, 'dd-MMM-yyyy HH:mm:ss')}`;
      
      const submittedFile = {
        name: fileName,
        url: urlInput.trim(),
        uploadedAt: currentDate,
        size: Math.floor(Math.random() * 1000000) + 10000, // Tamaño inventado entre 10KB y 1MB
        type: 'url'
      };

      // Obtener el assigned indicator actual y actualizar el método específico
      const response = await fetch(`/api/assigned-indicators/${assignedIndicatorId}`);
      const currentAssignment = await response.json();
      
      const updatedMethods = currentAssignment.assignedVerificationMethods.map((method: AssignedVerificationMethod) => {
        if (method.name === verificationMethod.name) {
          return {
            ...method,
            submittedFile,
            status: 'Submitted' as VerificationStatus
          };
        }
        return method;
      });

      const newOverallStatus = calculateOverallStatus(updatedMethods);

      await updateAssignedIndicator(assignedIndicatorId, {
        assignedVerificationMethods: updatedMethods,
        overallStatus: newOverallStatus
      });

      setLocalMethod(prev => ({
        ...prev,
        submittedFile,
        status: 'Submitted' as VerificationStatus
      }));
 

      toast({
        title: "Documento subido",
        description: "El documento ha sido subido exitosamente. Actualice para ver correctamente la información",
      });

      setShowUrlInput(false);
      setUrlInput('');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canUpload = ['Pending', 'Overdue', 'Rejected'].includes(currentStatus) && !localMethod.submittedFile;

  return (
    <div className="p-3 border border-border rounded-md bg-card/50 shadow-sm hover:bg-muted/20 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1.5">
        <h5 className="font-semibold text-sm text-card-foreground flex-grow">{localMethod?.name || 'Método de Verificación'}</h5>
        <Badge variant={statusVariantMap[currentStatus]} className={cn("text-xs whitespace-nowrap py-1 px-1.5", statusColorClasses[currentStatus])}>
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          {statusTranslations[currentStatus] || currentStatus}
        </Badge>
      </div>
      
      {localMethod.dueDate && (
        <p className="text-xs text-muted-foreground mb-1.5">
          Vence: <span className={cn("font-medium", currentStatus === 'Overdue' ? 'text-destructive' : 'text-foreground')}>{
            //! new Date( method.submittedFile?.uploadedAt?.seconds * 1000)
            //@ts-ignore
          format(new Date(localMethod.dueDate?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })
          }</span>
        </p>
      )}
      {
      //@ts-ignore
      localMethod.submittedFile && localMethod.submittedFile?.uploadedAt?.seconds && (
        <div className="mt-2 text-xs flex items-center gap-2 border-t border-border pt-2">
          <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <span className="font-medium text-foreground block truncate" title={localMethod.submittedFile.name}>
              {localMethod.submittedFile.name}
            </span>
            {localMethod.submittedFile.uploadedAt && (
              <span className="text-muted-foreground text-xs block">
                Subido: {
                  //@ts-ignore
          format(new Date(localMethod.submittedFile?.uploadedAt?.seconds * 1000), 'dd-MMM-yyyy HH:mm:ss', { locale: es })
        }
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-auto py-1 px-2 text-xs" onClick={() => window.open(localMethod.submittedFile?.url, '_blank')}>
            <Eye className="h-3 w-3 mr-1" /> Ver
          </Button>
        </div>
      )}

      {canUpload && (
        <div className="mt-2 pt-2 border-t border-border">
          {!showUrlInput ? (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full sm:w-auto text-xs" 
              onClick={() => setShowUrlInput(true)}
          >
            <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
            Subir Documento
          </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/documento.pdf"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="text-xs"
                  disabled={isSubmitting}
                />
                <Button 
                  size="sm" 
                  className="text-xs px-3" 
                  onClick={handleUrlSubmit}
                  disabled={isSubmitting || !urlInput.trim()}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs px-3" 
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ingresa la URL del documento que deseas subir como evidencia.
              </p>
            </div>
          )}
        </div>
      )}
      {localMethod.notes && <p className="text-xs mt-1.5 p-1.5 bg-muted/30 rounded-md border border-border/50 italic text-muted-foreground">Notas: {localMethod.notes}</p>}
    </div>
  );
}
