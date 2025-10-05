import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFile, sanitizeUserName } from '@/lib/fileUtils';
import { getCollectionById, updateDocument } from '@/lib/firebase-functions';
import { getUserById } from '@/lib/data';
import type { AssignedIndicator, AssignedVerificationMethod, MockFile, VerificationStatus } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assignedIndicatorId = formData.get('assignedIndicatorId') as string;
    const verificationMethodName = formData.get('verificationMethodName') as string;
    const userId = formData.get('userId') as string;

    if (!file || !assignedIndicatorId || !verificationMethodName || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Obtener información del usuario
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el assigned indicator actual
    const assignedIndicator = await getCollectionById<AssignedIndicator>('assigned_indicator', assignedIndicatorId);
    if (!assignedIndicator) {
      return NextResponse.json(
        { error: 'Indicador asignado no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario puede subir archivos (fecha no vencida y estado pendiente)
    const verificationMethod = assignedIndicator.assignedVerificationMethods.find(
      method => method.name === verificationMethodName
    );

    if (!verificationMethod) {
      return NextResponse.json(
        { error: 'Método de verificación no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si la fecha ha vencido
    const now = new Date();
    const dueDate = verificationMethod.dueDate ? new Date(verificationMethod.dueDate) : null;
    
    if (dueDate && now > dueDate && verificationMethod.status !== 'Approved' && verificationMethod.status !== 'Rejected') {
      return NextResponse.json(
        { error: 'No se pueden subir archivos después de la fecha límite' },
        { status: 403 }
      );
    }

    // Verificar que el estado permite subir archivos
    if (!['Pending', 'Overdue'].includes(verificationMethod.status)) {
      return NextResponse.json(
        { error: 'No se pueden subir archivos en el estado actual' },
        { status: 403 }
      );
    }

    // Guardar el archivo
    const uploadResult = await saveUploadedFile(
      file,
      user.name,
      assignedIndicatorId,
      verificationMethodName
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // ✅ CORREGIR: Usar la ruta relativa que devuelve saveUploadedFile
    const fileUrl = `/api/files/${uploadResult.filePath}`;

    // Crear objeto del archivo
    const newFile: MockFile = {
      name: file.name,
      originalName: file.name,
      fileName: uploadResult.fileName!,
      url: fileUrl, // ✅ URL corregida usando filePath
      uploadedAt: new Date().toLocaleDateString('en-CA'), // Usar fecha local en formato YYYY-MM-DD
      size: uploadResult.size!,
      type: file.type
    };

    console.log('Generated file URL:', fileUrl);
    console.log('File saved with relative path:', uploadResult.filePath);

    // Actualizar el método de verificación
    const updatedMethods = assignedIndicator.assignedVerificationMethods.map(method => {
      if (method.name === verificationMethodName) {
        // Inicializar historial si no existe
        if (!method.fileHistory) {
          method.fileHistory = [];
        }
        
        // Si hay un archivo actual, moverlo al historial antes de asignar el nuevo
        if (method.submittedFile) {
          method.fileHistory.push(method.submittedFile);
        }
        
        const updatedMethod = {
          ...method,
          submittedFile: newFile,
          status: 'Submitted' as VerificationStatus
        };

        return updatedMethod;
      }
      return method;
    });

    // Calcular el estado general
    const calculateOverallStatus = (methods: AssignedVerificationMethod[]): VerificationStatus => {
      if (methods.length === 0) return 'Pending';
      const statuses = methods.map(m => m.status);
      if (statuses.some(s => s === 'Rejected')) return 'Rejected';
      if (statuses.every(s => s === 'Approved')) return 'Approved';
      if (statuses.some(s => s === 'Submitted')) return 'Submitted';
      return 'Pending';
    };

    const newOverallStatus = calculateOverallStatus(updatedMethods);

    // Actualizar en la base de datos
    await updateDocument<AssignedIndicator>('assigned_indicator', assignedIndicatorId, {
      assignedVerificationMethods: updatedMethods,
      overallStatus: newOverallStatus
    });

    // Enviar notificaciones a los calificadores si el estado cambió a Submitted
    if (newOverallStatus === 'Submitted' && assignedIndicator.overallStatus !== 'Submitted') {
      try {
        const { notifyCalificadorNewEvaluation } = await import('@/lib/notificationService');
        const { getUserById } = await import('@/lib/data');
        
        if (assignedIndicator.jury && assignedIndicator.jury.length > 0) {
          const responsable = await getUserById(assignedIndicator.userId);
          await notifyCalificadorNewEvaluation(
            assignedIndicator.jury,
            assignedIndicatorId,
            responsable?.name || 'Un responsable'
          );
        }
      } catch (error) {
        console.error('Error enviando notificación a calificadores:', error);
      }
    }

    return NextResponse.json({
      success: true,
      file: newFile,
      message: 'Archivo subido exitosamente'
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}