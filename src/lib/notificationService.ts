import { Notification, User } from '@/lib/types';
import { updateDocument, getCollectionById } from '@/lib/firebase-functions';

// Tipos de notificaciones del sistema
export type NotificationType = 
  | 'assignment_created'
  | 'assignment_submitted'
  | 'assignment_evaluated'
  | 'assignment_overdue'
  | 'evaluation_required'
  | 'evaluation_reminder'
  | 'system_alert'
  | 'role_changed';

// Interfaz para crear notificaciones
export interface CreateNotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  priority: 'low' | 'medium' | 'high';
  userId: string;
  actionUrl?: string;
}

// Función para crear una nueva notificación
export const createNotification = (params: CreateNotificationParams): Notification => {
  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: params.title,
    message: params.message,
    type: getNotificationType(params.type),
    priority: params.priority,
    read: false,
    createdAt: new Date(),
  };

  // Solo agregar actionUrl si existe y no está vacío
  if (params.actionUrl && params.actionUrl.trim() !== "") {
    notification.actionUrl = params.actionUrl.trim();
  }

  return notification;
};


// Función para obtener el tipo de notificación basado en el tipo del sistema
const getNotificationType = (systemType: NotificationType): 'info' | 'warning' | 'error' | 'success' => {
  switch (systemType) {
    case 'assignment_created':
    case 'assignment_submitted':
      return 'info';
    case 'assignment_evaluated':
      return 'success';
    case 'assignment_overdue':
    case 'evaluation_required':
      return 'warning';
    case 'evaluation_reminder':
      return 'warning';
    case 'system_alert':
      return 'error';
    case 'role_changed':
      return 'info';
    default:
      return 'info';
  }
};

// Función para enviar notificación a un usuario
export const sendNotificationToUser = async (
  userId: string, 
  notification: Notification
): Promise<void> => {
  try {
    // Obtener las notificaciones actuales del usuario
    const userDoc = await getCollectionById<User>('user', userId);
    if (!userDoc) {
      throw new Error('Usuario no encontrado');
    }

    const currentNotifications = userDoc.notifications || [];
    const updatedNotifications = [...currentNotifications, notification];

    // Actualizar el usuario con la nueva notificación
    await updateDocument<User>('user', userId, {
      notifications: updatedNotifications
    });
  } catch (error) {
    console.error('Error sending notification to user:', error);
    throw error;
  }
};

// Función para marcar notificación como leída
export const markNotificationAsRead = async (
  userId: string, 
  notificationId: string
): Promise<void> => {
  try {
    const userDoc = await getCollectionById<User>('user', userId);
    if (!userDoc) {
      throw new Error('Usuario no encontrado');
    }

    const currentNotifications = userDoc.notifications || [];
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );

    await updateDocument<User>('user', userId, {
      notifications: updatedNotifications
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Función para marcar todas las notificaciones como leídas
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const userDoc = await getCollectionById<User>('user', userId);
    if (!userDoc) {
      throw new Error('Usuario no encontrado');
    }

    const currentNotifications = userDoc.notifications || [];
    const updatedNotifications = currentNotifications.map(notification => ({
      ...notification,
      read: true
    }));

    await updateDocument<User>('user', userId, {
      notifications: updatedNotifications
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Función para eliminar notificación
export const deleteNotification = async (
  userId: string, 
  notificationId: string
): Promise<void> => {
  try {
    const userDoc = await getCollectionById<User>('user', userId);
    if (!userDoc) {
      throw new Error('Usuario no encontrado');
    }

    const currentNotifications = userDoc.notifications || [];
    const updatedNotifications = currentNotifications.filter(
      notification => notification.id !== notificationId
    );

    await updateDocument<User>('user', userId, {
      notifications: updatedNotifications
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Funciones específicas para diferentes tipos de notificaciones
export const notifyAssignmentCreated = async (
  userId: string, 
  assignmentId: string
): Promise<void> => {
  const notification = createNotification({
    title: 'Nueva Asignación Creada',
    message: 'Se ha creado una nueva asignación para ti. Revisa los detalles.',
    type: 'assignment_created',
    priority: 'medium',
    userId,
    actionUrl: `/my-assignments/${assignmentId}`
  });

  await sendNotificationToUser(userId, notification);
};

export const notifyAssignmentSubmitted = async (
  calificadorIds: string[], 
  assignmentId: string,
  studentName: string
): Promise<void> => {
  const notification = createNotification({
    title: 'Nueva Evaluación Requerida',
    message: `${studentName} ha presentado una asignación que requiere tu evaluación.`,
    type: 'evaluation_required',
    priority: 'high',
    userId: calificadorIds[0], // Por ahora solo al primer calificador
    actionUrl: `/admin/grading/${assignmentId}`
  });

  await sendNotificationToUser(calificadorIds[0], notification);
};

export const notifyAssignmentOverdue = async (
  userId: string, 
  assignmentId: string
): Promise<void> => {
  const notification = createNotification({
    title: 'Asignación Vencida',
    message: 'Tienes una asignación que ha vencido. Completa lo antes posible.',
    type: 'assignment_overdue',
    priority: 'high',
    userId,
    actionUrl: `/my-assignments/${assignmentId}`
  });

  await sendNotificationToUser(userId, notification);
};

export const notifyEvaluationReminder = async (
  calificadorId: string, 
  assignmentId: string
): Promise<void> => {
  const notification = createNotification({
    title: 'Recordatorio de Evaluación',
    message: 'Tienes evaluaciones pendientes que requieren tu atención.',
    type: 'evaluation_reminder',
    priority: 'medium',
    userId: calificadorId,
    actionUrl: `/admin/grading/${assignmentId}`
  });

  await sendNotificationToUser(calificadorId, notification);
};

// Función para obtener notificaciones no leídas de un usuario
export const getUnreadNotifications = (notifications: Notification[]): Notification[] => {
  return notifications.filter(notification => !notification.read);
};

// Función para obtener notificaciones de alta prioridad
export const getHighPriorityNotifications = (notifications: Notification[]): Notification[] => {
  return notifications.filter(notification => notification.priority === 'high');
};

// ============= NOTIFICACIONES AVANZADAS DEL SISTEMA =============

// Notificar al responsable cuando se crea una asignación
export const notifyResponsableNewAssignment = async (
  userId: string,
  assignmentId: string,
  indicatorName: string
): Promise<void> => {
  // Acortar el nombre del indicador si es muy largo
  const shortName = indicatorName.length > 60 
    ? indicatorName.substring(0, 60) + '...' 
    : indicatorName;
  
  const notification = createNotification({
    title: '📋 Nueva Asignación Recibida',
    message: `Indicador: "${shortName}". Revisa los detalles en tus asignaciones.`,
    type: 'assignment_created',
    priority: 'high',
    userId,
    actionUrl: `/my-assignments`
  });

  await sendNotificationToUser(userId, notification);
};

// Notificar al calificador cuando hay una nueva evaluación pendiente
export const notifyCalificadorNewEvaluation = async (
  calificadorIds: string[],
  assignmentId: string,
  responsableName: string
): Promise<void> => {
  for (const calificadorId of calificadorIds) {
    const notification = createNotification({
      title: '✅ Nueva Evaluación Pendiente',
      message: `${responsableName} ha presentado evidencias. Requiere tu evaluación urgente.`,
      type: 'evaluation_required',
      priority: 'high',
      userId: calificadorId,
      actionUrl: `/admin/grading`
    });

    await sendNotificationToUser(calificadorId, notification);
  }
};

// Notificar al responsable cuando su indicador ha sido evaluado
export const notifyResponsableEvaluationComplete = async (
  userId: string,
  assignmentId: string,
  approved: boolean,
  calificadorName: string
): Promise<void> => {
  const notification = createNotification({
    title: approved ? '✅ Indicador Aprobado' : '❌ Indicador Rechazado',
    message: approved 
      ? `¡Felicitaciones! Tu indicador ha sido aprobado por ${calificadorName}.`
      : `Tu indicador ha sido rechazado por ${calificadorName}. Revisa los comentarios y vuelve a enviar.`,
    type: 'assignment_evaluated',
    priority: 'high',
    userId,
    actionUrl: `/my-assignments`
  });

  await sendNotificationToUser(userId, notification);
};

// Notificar recordatorio 2 días antes del vencimiento
export const notifyResponsableUpcomingDueDate = async (
  userId: string,
  assignmentId: string,
  daysRemaining: number,
  indicatorName: string
): Promise<void> => {
  // Acortar el nombre del indicador si es muy largo
  const shortName = indicatorName.length > 50 
    ? indicatorName.substring(0, 50) + '...' 
    : indicatorName;
  
  const notification = createNotification({
    title: '⏰ Indicador por Vencer',
    message: `"${shortName}" vence en ${daysRemaining} día(s). Envía tus evidencias pronto.`,
    type: 'evaluation_reminder',
    priority: 'high',
    userId,
    actionUrl: `/my-assignments`
  });

  await sendNotificationToUser(userId, notification);
};

// Notificar al responsable cuando su indicador ha vencido
export const notifyResponsableOverdueAssignment = async (
  userId: string,
  assignmentId: string,
  indicatorName: string
): Promise<void> => {
  // Acortar el nombre del indicador si es muy largo
  const shortName = indicatorName.length > 50 
    ? indicatorName.substring(0, 50) + '...' 
    : indicatorName;
  
  const notification = createNotification({
    title: '🚨 Indicador Vencido',
    message: `"${shortName}" ha vencido. Complétalo lo antes posible.`,
    type: 'assignment_overdue',
    priority: 'high',
    userId,
    actionUrl: `/my-assignments`
  });

  await sendNotificationToUser(userId, notification);
};

// Notificar al administrador sobre asignaciones vencidas
export const notifyAdminOverdueAssignments = async (
  adminId: string,
  overdueCount: number,
  responsableNames: string[]
): Promise<void> => {
  const notification = createNotification({
    title: '⚠️ Asignaciones Vencidas Detectadas',
    message: `Hay ${overdueCount} asignación(es) vencida(s). Responsables: ${responsableNames.slice(0, 3).join(', ')}${responsableNames.length > 3 ? '...' : ''}`,
    type: 'system_alert',
    priority: 'high',
    userId: adminId,
    actionUrl: `/dashboard/admin`
  });

  await sendNotificationToUser(adminId, notification);
};

// Notificar al administrador cuando hay evaluaciones completadas
export const notifyAdminEvaluationCompleted = async (
  adminId: string,
  responsableName: string,
  approved: boolean
): Promise<void> => {
  const notification = createNotification({
    title: approved ? '✅ Evaluación Aprobada' : '❌ Evaluación Rechazada',
    message: `La evaluación de ${responsableName} ha sido ${approved ? 'aprobada' : 'rechazada'}.`,
    type: 'assignment_evaluated',
    priority: 'medium',
    userId: adminId,
    actionUrl: `/dashboard/admin`
  });

  await sendNotificationToUser(adminId, notification);
};

// Notificar al calificador recordatorio de evaluaciones pendientes
export const notifyCalificadorPendingEvaluations = async (
  calificadorId: string,
  pendingCount: number
): Promise<void> => {
  const notification = createNotification({
    title: '📝 Evaluaciones Pendientes',
    message: `Tienes ${pendingCount} evaluación(es) pendiente(s) que requieren tu atención.`,
    type: 'evaluation_reminder',
    priority: 'medium',
    userId: calificadorId,
    actionUrl: `/admin/grading`
  });

  await sendNotificationToUser(calificadorId, notification);
};

// Notificación manual personalizada (para administradores)
export const sendCustomNotification = async (
  userIds: string[],
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high',
  actionUrl?: string,
  senderName?: string
): Promise<void> => {
  for (const userId of userIds) {
    const notification = createNotification({
      title,
      message,
      type: 'system_alert',
      priority,
      userId,
      actionUrl
    });

    // Agregar el nombre del remitente si existe
    if (senderName) {
      (notification as any).senderName = senderName;
    }

    await sendNotificationToUser(userId, notification);
  }
}; 