"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  Eye, 
  X, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MockFile } from '@/lib/types';

interface FilePreviewProps {
  file: MockFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export function FilePreview({ file, isOpen, onClose, onDownload }: FilePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setIsLoading(true);
      setPreviewError(null);
      
      // Para PDFs, podemos mostrar una vista previa directa
      if (file.type?.includes('pdf') || file.name.endsWith('.pdf')) {
        setPreviewUrl(file.url);
        setIsLoading(false);
      } else {
        // Para archivos Word, no podemos mostrar vista previa directa
        setPreviewUrl(null);
        setIsLoading(false);
      }
    }
  }, [isOpen, file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: any): string => {
    if (!date) return '';
    
    let dateObj: Date;
    if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return format(dateObj, 'dd-MMM-yyyy HH:mm:ss', { locale: es });
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-16 w-16 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileCheck className="h-16 w-16 text-blue-500" />;
      default:
        return <FileText className="h-16 w-16 text-gray-500" />;
    }
  };

  const handleDownload = () => {
    if (file?.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (onDownload) {
        onDownload();
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (file?.url) {
      window.open(file.url, '_blank');
    }
  };

  if (!file) return null;

  const isPdf = file.type?.includes('pdf') || file.name.endsWith('.pdf');
  const isWordDoc = file.name.endsWith('.doc') || file.name.endsWith('.docx');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold truncate" title={file.name}>
                    {file.name}
                </DialogTitle>

                <DialogDescription asChild>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {file.size && <span>{formatFileSize(file.size)}</span>}
                    {file.uploadedAt && <span>Subido: {formatDate(file.uploadedAt)}</span>}
                    {file.type && (
                        <Badge variant="outline" className="text-xs">{file.type}</Badge>
                    )}
                    </div>
                </DialogDescription>

                </div>
            </div>
        </DialogHeader>

        {/* Contenido de vista previa */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Cargando vista previa...</p>
              </div>
            </div>
          ) : previewError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{previewError}</p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar archivo
                </Button>
              </div>
            </div>
          ) : isPdf && previewUrl ? (
            <div className="h-full border rounded-lg overflow-hidden bg-muted/10">
              <iframe
                src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full"
                title={`Vista previa de ${file.name}`}
                onError={() => setPreviewError('No se pudo cargar la vista previa del PDF')}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                {getFileIcon(file.name)}
                <h3 className="text-lg font-semibold mt-4 mb-2">
                  {file.originalName || file.name}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isWordDoc 
                    ? 'Los documentos de Word no se pueden previsualizar directamente. Puedes descargar el archivo o abrirlo en una nueva pestaña.'
                    : 'Vista previa no disponible para este tipo de archivo.'
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleDownload} variant="default">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                  <Button onClick={handleOpenInNewTab} variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir en nueva pestaña
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex-shrink-0 border-t pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isPdf ? 'Vista previa disponible' : 'Descarga el archivo para verlo completo'}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            {isPdf && (
              <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Nueva pestaña
              </Button>
            )}
            <Button onClick={onClose} variant="default" size="sm">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}