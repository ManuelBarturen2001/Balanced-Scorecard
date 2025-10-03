"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertCircle, CheckCircle, Info, XCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  getUnreadNotifications,
  getHighPriorityNotifications
} from '@/lib/notificationService';

const notificationIcons = {
  info: Info,
  warning: AlertCircle,
  error: XCircle,
  success: CheckCircle,
};

const notificationColors = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
};

export function NotificationBell() {
  const { user, updateUserProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user?.notifications) return null;

  const unreadNotifications = getUnreadNotifications(user.notifications);
  const highPriorityNotifications = getHighPriorityNotifications(unreadNotifications);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      await markNotificationAsRead(user.id, notificationId);
      
      // Actualizar el estado local
      const updatedNotifications = user.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      
      await updateUserProfile({ notifications: updatedNotifications });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      
      // Actualizar el estado local
      const updatedNotifications = user.notifications.map(n => ({ ...n, read: true }));
      await updateUserProfile({ notifications: updatedNotifications });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      await deleteNotification(user.id, notificationId);
      
      // Actualizar el estado local
      const updatedNotifications = user.notifications.filter(n => n.id !== notificationId) ;
      await updateUserProfile({ notifications: updatedNotifications });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    return new Date(date).toLocaleDateString();
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída
    await handleMarkAsRead(notification.id);
    
    // Si tiene URL de acción, navegar
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadNotifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
            </Badge>
          )}
          {highPriorityNotifications.length > 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Notificaciones</h4>
          {unreadNotifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {user.notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {user.notifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors cursor-pointer group',
                        notificationColors[notification.type],
                        !notification.read && 'ring-2 ring-offset-2 ring-blue-500',
                        notification.priority === 'high' && 'border-l-4 border-l-red-500'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">{notification.title}</h5>
                            <div className="flex items-center gap-1">
                              <span className="text-xs opacity-70">
                                {formatDate(notification.createdAt)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm mt-1 opacity-90">{notification.message}</p>
                          {notification.actionUrl && (
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 h-auto text-xs mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = notification.actionUrl!;
                              }}
                            >
                              Ver más
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
} 