"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  Download, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AssignedIndicator, AssignedVerificationMethod, MockFile, VerificationStatus } from '@/lib/types';

interface UserAssignmentDetailsProps {
  assignment: AssignedIndicator;
  onBack: () => void;
  onFileUpload: (assignedIndicatorId: string, verificationMethodName: string, file: File) => Promise<void>;
}

const statusIcons: Record<VerificationStatus, React.ElementType> = {
  Pending: Clock,
  Submitted: FileText,
  Approved: CheckCircle,
  Rejected: AlertCircle,
  Overdue: AlertCircle,
  Observed: AlertCircle
};

const statusColors: Record<VerificationStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
  Overdue: 'bg-orange-100 text-orange-800 border-orange-300',
  Observed: 'bg-purple-100 text-purple-800 border-purple-300'
};

const statusTranslations: Record<VerificationStatus, string> = {
  Pending: 'Pendiente',
  Submitted: 'Presentado',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
  Overdue: 'Vencido',
  Observed: 'Observado'
};

export function UserAssignmentDetails({ assignment, onBack, onFileUpload }: UserAssignmentDetailsProps) {
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (verificationMethodId: string, file: File) => {
    setUploadingFile(verificationMethodId);
    try {
      // Obtener el nombre del método de verificación
      const method = assignment.assignedVerificationMethods?.find(m => m.name === verificationMethodId);
      if (!method) {
        throw new Error('Método de verificación no encontrado');
      }
      await onFileUpload(assignment.id!, method.name, file);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploadingFile(null);
    }
  };

  const handleFileSelect = (verificationMethodId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          handleFileUpload(verificationMethodId, target.files[0]);
        }
      };
      fileInputRef.current.click();
    }
  };

  const handleEditFile = (verificationMethodId: string) => {
    setEditingFile(verificationMethodId);
    handleFileSelect(verificationMethodId);
  };

  const downloadFile = (file: MockFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVerificationMethod = (methodName: string) => {
    return assignment.assignedVerificationMethods.find(method => method.name === methodName);
  };

  const formatDate = (date: Date | string | number | { seconds: number; toDate?: () => Date } | null | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
    if (!date) return 'Fecha no disponible';
    
    try {
      let dateObj: Date;
      
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'object' && 'toDate' in date && date.toDate) {
        dateObj = date.toDate();
      } else if (typeof date === 'object' && 'seconds' in date) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return 'Fecha no disponible';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Fecha no disponible';
      }
      
      return format(dateObj, formatStr, { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Fecha no disponible';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{assignment.indicatorId || 'Detalles de la Asignación'}</h1>
          <p className="text-muted-foreground">
            Asignado el {formatDate(assignment.assignedDate)}
          </p>
        </div>
      </div>

      {/* Estado general */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Estado de la Asignación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={cn("text-sm", statusColors[assignment.overallStatus || 'Pending'])}>
              {statusTranslations[assignment.overallStatus || 'Pending']}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {assignment.assignedVerificationMethods?.length || 0} tareas asignadas
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tareas */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tareas de Verificación</h2>
        
        {assignment.assignedVerificationMethods?.map((method, index) => {
          const StatusIcon = statusIcons[method.status] || Clock;
          const isPending = method.status === 'Pending' || method.status === 'Overdue' || method.status === 'Observed' || method.status === 'Rejected';
          const hasFiles = method.submittedFile || (method.fileHistory && method.fileHistory.length > 0);

          return (
            <Card key={method.name || index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{method.name}</h3>
                      {method.dueDate && (
                        <p className="text-sm text-muted-foreground">
                          Vence: {formatDate(method.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={cn("text-xs", statusColors[method.status])}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusTranslations[method.status]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Área de subida de archivos */}
                {isPending && (
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                             <p className="text-sm text-muted-foreground mb-2">
                         Sube tu archivo PDF o DOC para esta tarea
                       </p>
                      <Button
                        onClick={() => handleFileSelect(method.name!)}
                        disabled={uploadingFile === method.name}
                        className="flex items-center gap-2"
                      >
                        {uploadingFile === method.name ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Seleccionar Archivo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Archivos subidos */}
                {hasFiles && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Archivos subidos:</h4>
                    
                    {/* Archivo actual */}
                    {method.submittedFile && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{method.submittedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Subido: {formatDate(method.submittedFile.uploadedAt, 'dd/MM/yyyy HH:mm')}
                            </p>
                            {method.submittedFile.size && (
                              <p className="text-xs text-muted-foreground">
                                Tamaño: {(method.submittedFile.size / 1024).toFixed(2)} KB
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(method.submittedFile!)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {isPending && (
                            <Button
                              variant="outline"
                              size="sm"
                                                             onClick={() => handleEditFile(method.name!)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Historial de archivos */}
                    {method.fileHistory && method.fileHistory.length > 0 && (
                      console.log('Historial en UserAssignmentDetails:', method.fileHistory),
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-muted-foreground">Historial:</h5>
                        {method.fileHistory.map((file, fileIndex) => (
                          <div key={fileIndex} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{file.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Comentarios del calificador */}
                {method.notes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Comentario del calificador:</span>
                    </div>
                    <p className="text-sm text-blue-700">{method.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!assignment.assignedVerificationMethods || assignment.assignedVerificationMethods.length === 0) && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay tareas asignadas para esta asignación.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Input oculto para seleccionar archivos */}
             <input
         ref={fileInputRef}
         type="file"
         className="hidden"
         accept=".pdf,.doc,.docx"
       />
    </div>
  );
} 