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
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: params.title,
    message: params.message,
    type: getNotificationType(params.type),
    priority: params.priority,
    read: false,
    createdAt: new Date(),
    actionUrl: params.actionUrl,
  };
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