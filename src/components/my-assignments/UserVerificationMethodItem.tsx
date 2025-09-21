"use client";

import type { AssignedVerificationMethod, VerificationStatus } from '@/lib/types';
import { updateAssignedIndicator } from '@/lib/data';
import { statusTranslations } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UploadCloud, Eye, CheckCircle, AlertCircle, Clock, FileText, Paperclip, Info, Check, X, FileUp, Edit } from 'lucide-react';
import { formatDate, isDatePast, safeParseDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import React, { useRef, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FilePreview } from '@/components/ui/file-preview';

interface UserVerificationMethodItemProps {
  assignedIndicatorId: string;
  verificationMethod: AssignedVerificationMethod;
  onFileUpload: (assignedIndicatorId: string, verificationMethodName: string, file: File) => void;
}

interface FileHistoryItem {
  name: string;
  url: string;
  uploadedAt: Date | number | string; // Permitir Date, timestamp numérico o string
  size: number;
  type: string;
}

interface VerificationMethodWithHistory extends AssignedVerificationMethod {
  fileHistory?: FileHistoryItem[];
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

export function UserVerificationMethodItem({ assignedIndicatorId, verificationMethod, onFileUpload }: UserVerificationMethodItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const [localMethod, setLocalMethod] = useState(verificationMethod);
  const [fileHistory, setFileHistory] = useState<FileHistoryItem[]>([]);

  useEffect(() => {
    console.log(verificationMethod)
    setLocalMethod(verificationMethod);
    
    // Cargar el historial desde Firebase si existe
    if (verificationMethod.fileHistory && Array.isArray(verificationMethod.fileHistory)) {
      // Convertir las fechas del historial de manera segura
             const validHistory = verificationMethod.fileHistory.map(file => ({
         name: file.name || 'Archivo',
         url: file.url || '',
         uploadedAt: file.uploadedAt ? (typeof file.uploadedAt === 'string' ? file.uploadedAt : new Date(file.uploadedAt).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0], // Usar solo fechas
         size: file.size || 0,
         type: file.type || 'file'
       }));
      setFileHistory(validHistory);
      console.log('Historial cargado:', validHistory);
    }
  }, [verificationMethod]);

  // Using the centralized date utility function

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
  if (localMethod.status === 'Pending' && localMethod.dueDate && isDatePast(localMethod.dueDate)) {
    currentStatus = 'Overdue';
  }
  const StatusIcon = statusIcons[currentStatus] || Info;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        // Remover la lógica de historial del frontend - el backend se encarga de esto
        await onFileUpload(assignedIndicatorId, verificationMethod.name, file);
        toast({
          title: "Archivo subido",
          description: "El archivo ha sido subido exitosamente.",
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Error",
          description: "No se pudo subir el archivo. Inténtalo de nuevo.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
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
          uploadedAt: new Date().toLocaleDateString('en-CA'), // Usar fecha local en formato YYYY-MM-DD
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

      // Si hay un archivo actual, agregarlo al historial
      if (localMethod.submittedFile) {
                                   const currentFile: FileHistoryItem = {
            name: localMethod.submittedFile.name,
            url: localMethod.submittedFile.url,
            uploadedAt: new Date().toISOString().split('T')[0], // Usar solo fecha (YYYY-MM-DD)
            size: localMethod.submittedFile.size || 0,
            type: localMethod.submittedFile.type || 'file'
          };
        const newHistory = [currentFile, ...fileHistory.slice(0, 4)]; // Mantener solo los últimos 5
        setFileHistory(newHistory);
        
        // Guardar el historial en Firebase
        const updatedMethods = currentAssignment.assignedVerificationMethods.map((method: AssignedVerificationMethod) => {
          if (method.name === verificationMethod.name) {
            return {
              ...method,
              fileHistory: newHistory
            };
          }
          return method;
        });

        await updateAssignedIndicator(assignedIndicatorId, {
          assignedVerificationMethods: updatedMethods
        });
      }

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
  const canEdit = ['Pending'].includes(currentStatus) && localMethod.submittedFile;

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
           Vence: <span className={cn("font-medium", currentStatus === 'Overdue' ? 'text-destructive' : 'text-foreground')}>
             {formatDate(localMethod.dueDate)}
           </span>
         </p>
       )}

      {localMethod.submittedFile && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Archivo subido:</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(localMethod.submittedFile?.uploadedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border">
            <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm block truncate" title={localMethod.submittedFile.name}>
                {localMethod.submittedFile.name}
              </span>
              {localMethod.submittedFile.size && (
                <span className="text-xs text-muted-foreground">
                  Tamaño: {(localMethod.submittedFile.size / 1024).toFixed(2)} KB
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
                     <div class="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-7xl flex flex-col">
                       <div class="flex items-center justify-between p-4 border-b bg-gray-50">
                         <div class="flex items-center gap-3">
                           <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                             <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                             </svg>
                           </div>
                           <div>
                                                           <h3 class="font-semibold text-gray-900">${localMethod.submittedFile?.name || 'Archivo'}</h3>
                              <p class="text-sm text-gray-500">${((localMethod.submittedFile?.size || 0) / 1024).toFixed(2)} KB</p>
                           </div>
                         </div>
                         <div class="flex items-center gap-2">
                           <button class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Descargar">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                             </svg>
                           </button>
                           <button onclick="this.closest('.fixed').remove()" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Cerrar">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                             </svg>
                           </button>
                         </div>
                       </div>
                       <div class="flex-1 bg-gray-100 p-1">
                         <div class="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
                                                       <iframe src="${localMethod.submittedFile?.url || ''}" class="w-full h-full border-0" frameborder="0"></iframe>
                         </div>
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
              {canEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Edit className="h-3 w-3 mr-1" /> Editar Archivo
                    </>
                  )}
                </Button>
              )}
            </div>
                     </div>
         </div>
       )}

       {/* Historial de archivos */}
       {fileHistory.length > 0 && (
         <div className="mt-3 pt-2 border-t border-border">
           <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-medium text-muted-foreground">Historial de archivos:</span>
             <span className="text-xs text-muted-foreground">{fileHistory.length} archivos</span>
           </div>
           <div className="space-y-1 max-h-32 overflow-y-auto">
             {fileHistory.map((file, index) => (
               <div key={index} className="flex items-center gap-2 p-1.5 bg-muted/20 rounded border text-xs">
                 <Paperclip className="h-3 w-3 text-primary flex-shrink-0" />
                 <div className="flex-1 min-w-0">
                   <span className="font-medium block truncate" title={file.name}>
                     {file.name}
                   </span>
                                                            <span className="text-muted-foreground">
                       {formatDate(file.uploadedAt)} • {(file.size / 1024).toFixed(2)} KB
                     </span>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-auto py-0.5 px-1.5 text-xs"
                                       onClick={() => {
                      const filePreview = document.createElement('div');
                      filePreview.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center';
                      filePreview.innerHTML = `
                        <div class="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-7xl flex flex-col">
                          <div class="flex items-center justify-between p-4 border-b bg-gray-50">
                            <div class="flex items-center gap-3">
                              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                              </div>
                              <div>
                                <h3 class="font-semibold text-gray-900">${file.name}</h3>
                                <p class="text-sm text-gray-500">${(file.size / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            <div class="flex items-center gap-2">
                              <button class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Descargar">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                              </button>
                              <button onclick="this.closest('.fixed').remove()" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Cerrar">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div class="flex-1 bg-gray-100 p-1">
                            <div class="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
                              <iframe src="${file.url}" class="w-full h-full border-0" frameborder="0"></iframe>
                            </div>
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
                   <Eye className="h-2.5 w-2.5" />
                 </Button>
               </div>
             ))}
           </div>
         </div>
       )}

      {canUpload && (
        <div className="mt-2 pt-2 border-t border-border">
          {!showUrlInput ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1 text-xs" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-3.5 w-3.5 mr-1.5" />
                      Subir Archivo
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs" 
                  onClick={() => setShowUrlInput(true)}
                  disabled={isUploading}
                >
                  <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                  URL
                </Button>
              </div>
            </div>
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

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      {localMethod.notes && (
        <p className="text-xs mt-1.5 p-1.5 bg-muted/30 rounded-md border border-border/50 italic text-muted-foreground">
          Notas: {localMethod.notes}
        </p>
      )}
    </div>
  );
} 