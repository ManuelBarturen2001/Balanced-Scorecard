"use client";

import type { AssignedVerificationMethod, VerificationStatus } from '@/lib/types';
import { updateAssignedIndicator } from '@/lib/data';
import { statusTranslations } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Eye, CheckCircle, AlertCircle, Clock, FileText, Paperclip, Info, Upload, RefreshCw, History, Download, Edit } from 'lucide-react';
import { formatDate, isDatePast, safeParseDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import React, { useRef, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/data';
import { FilePreview } from '@/components/ui/file-preview';

interface VerificationMethodItemProps {
  assignedIndicatorId: string;
  verificationMethod: AssignedVerificationMethod;
  onFileUpload: (assignedIndicatorId: string, verificationMethodName: string, file: File) => void;
  userId: string;
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

export function VerificationMethodItem({ 
  assignedIndicatorId, 
  verificationMethod, 
  onFileUpload,
  userId 
}: VerificationMethodItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileHistory, setShowFileHistory] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const [localMethod, setLocalMethod] = useState(verificationMethod);

  useEffect(() => {
    setLocalMethod(verificationMethod);
  }, [verificationMethod]);

  // Verificar si la fecha está vencida
  let currentStatus = localMethod.status;
  const isDueDatePassed = localMethod.dueDate && isDatePast(localMethod.dueDate);
  
  if (localMethod.status === 'Pending' && isDueDatePassed) {
    currentStatus = 'Overdue';
  }

  const StatusIcon = statusIcons[currentStatus] || Info;

  // Determinar si se puede subir/editar archivos
  const canUpload = ['Pending', 'Overdue'].includes(currentStatus) && 
                    !isDueDatePassed && 
                    localMethod.status !== 'Approved';

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones del lado del cliente
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "El archivo excede el tamaño máximo permitido de 50MB.",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos PDF y DOC.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadFile(file, assignedIndicatorId, verificationMethod.name, userId);
      
      if (result.success && result.file) {
        // Crear una nueva URL para el archivo con timestamp para evitar caché
        const fileWithFreshUrl = {
          ...result.file,
          url: `${result.file.url}?t=${Date.now()}`
        };

        // Actualizar el estado local del método
        setLocalMethod(prev => ({
          ...prev,
          submittedFile: fileWithFreshUrl,
          status: 'Submitted' as VerificationStatus
        }));

        toast({
          title: "Archivo subido exitosamente",
          description: localMethod.submittedFile ? 
            "El archivo ha sido reemplazado correctamente." : 
            "El archivo ha sido procesado y guardado correctamente.",
        });

        // Llamar al callback del padre si es necesario
        onFileUpload(assignedIndicatorId, verificationMethod.name, file);
        
        // Actualizar el archivo de vista previa inmediatamente
        setPreviewFile(fileWithFreshUrl);
      } else {
        toast({
          title: "Error al subir archivo",
          description: result.error || "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewFile = (file = localMethod.submittedFile) => {
    if (file?.url) {
      // Añadir timestamp para evitar caché
      const fileWithFreshUrl = {
        ...file,
        url: `${file.url}?t=${Date.now()}`
      };
      setPreviewFile(fileWithFreshUrl);
      setShowPreview(true);
    }
  };

  const handleDownloadFile = (file = localMethod.submittedFile) => {
    if (file?.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Descarga iniciada",
        description: `Descargando ${file.name}...`,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Using the centralized date utility function

  return (
    <>
      <div className="p-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
        {/* Header con nombre y estado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h5 className="font-semibold text-base text-card-foreground flex-grow">
            {localMethod?.name || 'Método de Verificación'}
          </h5>
          <Badge 
            variant={statusVariantMap[currentStatus]} 
            className={cn("text-sm whitespace-nowrap py-1.5 px-3", statusColorClasses[currentStatus])}
          >
            <StatusIcon className="h-4 w-4 mr-1.5" />
            {statusTranslations[currentStatus] || currentStatus}
          </Badge>
        </div>
        
        {/* Fecha de vencimiento */}
        {localMethod.dueDate && (
          <div className="mb-3 p-2 bg-muted/30 rounded-md border border-border/50">
            <p className="text-sm text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              Fecha límite: 
              <span className={cn(
                "font-medium ml-1", 
                isDueDatePassed ? 'text-destructive' : 'text-foreground'
              )}>
                {formatDate(localMethod.dueDate, 'dd-MMM-yyyy HH:mm:ss')}
              </span>
              {isDueDatePassed && (
                <span className="text-destructive font-medium ml-2">(Vencido)</span>
              )}
            </p>
          </div>
        )}

        {/* Archivo actual */}
        {localMethod.submittedFile && (
          <div className="mb-4 p-3 bg-muted/20 rounded-md border border-border/30">
            <div className="flex items-start gap-3">
              <Paperclip className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-grow min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <span className="font-medium text-foreground truncate" title={localMethod.submittedFile.name}>
                    {localMethod.submittedFile.name}
                  </span>
                  {localMethod.submittedFile.size && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {formatFileSize(localMethod.submittedFile.size)}
                    </span>
                  )}
                </div>
                {localMethod.submittedFile.uploadedAt && (
                  <p className="text-xs text-muted-foreground">
                    Subido: {formatDate(localMethod.submittedFile.uploadedAt, 'dd-MMM-yyyy HH:mm:ss')}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-2"
                  onClick={() => handleViewFile()}
                  disabled={!localMethod.submittedFile.url}
                  title="Vista previa"
                >
                  <Eye className="h-4 w-4" /> 
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-2"
                  onClick={() => handleDownloadFile()}
                  disabled={!localMethod.submittedFile.url}
                  title="Descargar"
                >
                  <Download className="h-4 w-4" /> 
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Historial de archivos */}
        {localMethod.fileHistory && localMethod.fileHistory.length > 1 && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileHistory(!showFileHistory)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <History className="h-3 w-3 mr-1" />
              {showFileHistory ? 'Ocultar historial' : `Ver historial (${localMethod.fileHistory.length - 1} archivo(s) anterior(es))`}
            </Button>
            
            {showFileHistory && (
              <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                {localMethod.fileHistory
                  .filter(file => file.name !== localMethod.submittedFile?.name)
                  .reverse() // Mostrar los más recientes primero
                  .map((file, index) => (
                  <div key={index} className="text-xs p-2 bg-muted/10 rounded border border-border/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate flex-1" title={file.name}>{file.name}</span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1"
                          onClick={() => handleViewFile(file)}
                          title="Vista previa"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1"
                          onClick={() => handleDownloadFile(file)}
                          title="Descargar"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {formatDate(file.uploadedAt, 'dd-MMM-yyyy HH:mm:ss')}
                      {file.size && ` • ${formatFileSize(file.size)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Controles de subida/edición */}
        <div className="space-y-3">
          {canUpload && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button 
                  variant={localMethod.submittedFile ? "outline" : "default"}
                  size="sm" 
                  className="flex-1"
                  onClick={handleFileSelect}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      {localMethod.submittedFile ? (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar archivo
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4 mr-2" />
                          Subir archivo
                        </>
                      )}
                    </>
                  )}
                </Button>
                
                {localMethod.submittedFile && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewFile()}
                    disabled={!localMethod.submittedFile.url}
                    className="px-3"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
                                             <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              
                                             <p className="text-xs text-muted-foreground">
                  Formatos permitidos: PDF, DOC • Máximo 50MB
                  {localMethod.submittedFile && (
                    <span className="block mt-1 text-blue-600">
                      💡 Puedes editar tu archivo hasta la fecha límite
                    </span>
                  )}
                </p>
            </div>
          )}

          {isDueDatePassed && localMethod.status !== 'Approved' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">
                ⚠️ La fecha límite ha pasado. No se pueden subir más archivos.
              </p>
            </div>
          )}

          {localMethod.status === 'Approved' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">
                ✅ Este método ha sido aprobado.
              </p>
            </div>
          )}
        </div>

        {/* Notas */}
        {localMethod.notes && (
          <div className="mt-4 p-3 bg-muted/30 rounded-md border border-border/50">
            <p className="text-sm text-muted-foreground">
              <Info className="h-4 w-4 inline mr-1" />
              <strong>Notas:</strong> {localMethod.notes}
            </p>
          </div>
        )}
      </div>

      {/* Modal de vista previa */}
      <FilePreview
        file={previewFile}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewFile(null);
        }}
        onDownload={() => handleDownloadFile(previewFile)}
      />
    </>
  );
}