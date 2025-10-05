"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getAllAssignedIndicators, getAllUsers, getIndicatorById } from '@/lib/data';
import { 
  notifyResponsableUpcomingDueDate,
  notifyResponsableOverdueAssignment,
  notifyAdminOverdueAssignments,
  notifyCalificadorPendingEvaluations
} from '@/lib/notificationService';
import { AssignedIndicator, User } from '@/lib/types';
import { isPast, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

// Hook para verificar y enviar notificaciones automáticas
export const useNotificationChecker = () => {
  const { user } = useAuth();
  const lastCheckRef = useRef<Record<string, number>>({});
  const COOLDOWN_HOURS = 12; // No enviar la misma notificación más de una vez cada 12 horas

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    try {
      if (typeof date === 'object' && date !== null && 'seconds' in date) {
        return new Date((date as any).seconds * 1000);
      }
      if (typeof date === 'object' && date !== null && typeof (date as any).toDate === 'function') {
        return (date as any).toDate();
      }
      if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
      if (typeof date === 'number') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof date === 'string') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const canSendNotification = (key: string): boolean => {
    const now = Date.now();
    const lastCheck = lastCheckRef.current[key] || 0;
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    
    if (now - lastCheck > cooldownMs) {
      lastCheckRef.current[key] = now;
      return true;
    }
    return false;
  };

  const checkAssignments = async () => {
    if (!user) return;

    try {
      const [assignments, users] = await Promise.all([
        getAllAssignedIndicators(),
        getAllUsers()
      ]);

      const now = new Date();

      // ===== VERIFICAR ASIGNACIONES PARA RESPONSABLES =====
      for (const assignment of assignments) {
        // Solo asignaciones no completadas
        if (assignment.overallStatus === 'Approved' || assignment.overallStatus === 'Rejected') {
          continue;
        }

        const assignedUser = users.find(u => u.id === assignment.userId);
        if (!assignedUser) continue;

        // Obtener la fecha de vencimiento más temprana de los métodos
        const dueDates = (assignment.assignedVerificationMethods || [])
          .map(vm => parseDate((vm as any).dueDate))
          .filter(Boolean) as Date[];
        
        if (dueDates.length === 0) continue;
        
        const earliestDueDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
        
        // 1. Verificar si está vencida
        if (isPast(earliestDueDate) && assignment.overallStatus === 'Pending') {
          const notificationKey = `overdue_${assignment.id}`;
          if (canSendNotification(notificationKey)) {
            try {
              const indicator = await getIndicatorById(assignment.indicatorId);
              await notifyResponsableOverdueAssignment(
                assignment.userId,
                assignment.id || '',
                indicator?.name || 'Indicador'
              );
              console.log(`✅ Notificación de vencimiento enviada a ${assignedUser.name}`);
            } catch (error) {
              console.error('Error enviando notificación de vencimiento:', error);
            }
          }
        }
        
        // 2. Verificar si está por vencer (2 días antes)
        else {
          const daysUntilDue = differenceInDays(earliestDueDate, now);
          
          if (daysUntilDue === 2 || daysUntilDue === 1) {
            const notificationKey = `reminder_${assignment.id}_${daysUntilDue}d`;
            if (canSendNotification(notificationKey)) {
              try {
                const indicator = await getIndicatorById(assignment.indicatorId);
                await notifyResponsableUpcomingDueDate(
                  assignment.userId,
                  assignment.id || '',
                  daysUntilDue,
                  indicator?.name || 'Indicador'
                );
                console.log(`✅ Recordatorio de ${daysUntilDue} día(s) enviado a ${assignedUser.name}`);
              } catch (error) {
                console.error('Error enviando recordatorio:', error);
              }
            }
          }
        }
      }

      // ===== VERIFICAR EVALUACIONES PENDIENTES PARA CALIFICADORES =====
      if (user.role === 'calificador' || user.role === 'admin') {
        const calificadorAssignments = assignments.filter(
          a => a.jury?.includes(user.id) && a.overallStatus === 'Submitted'
        );

        if (calificadorAssignments.length > 0) {
          const notificationKey = `calificador_pending_${user.id}`;
          if (canSendNotification(notificationKey)) {
            try {
              await notifyCalificadorPendingEvaluations(user.id, calificadorAssignments.length);
              console.log(`✅ Recordatorio de evaluaciones pendientes enviado al calificador`);
            } catch (error) {
              console.error('Error enviando recordatorio a calificador:', error);
            }
          }
        }
      }

      // ===== VERIFICAR ASIGNACIONES VENCIDAS PARA ADMINISTRADOR =====
      if (user.role === 'admin') {
        const overdueAssignments = assignments.filter(a => {
          if (a.overallStatus === 'Approved' || a.overallStatus === 'Rejected') return false;
          
          const dueDates = (a.assignedVerificationMethods || [])
            .map(vm => parseDate((vm as any).dueDate))
            .filter(Boolean) as Date[];
          
          if (dueDates.length === 0) return false;
          
          const earliestDueDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
          return isPast(earliestDueDate);
        });

        if (overdueAssignments.length > 0) {
          const notificationKey = `admin_overdue_summary`;
          if (canSendNotification(notificationKey)) {
            try {
              const responsableNames = overdueAssignments.map(a => {
                const responsable = users.find(u => u.id === a.userId);
                return responsable?.name || 'Desconocido';
              });

              await notifyAdminOverdueAssignments(
                user.id,
                overdueAssignments.length,
                responsableNames
              );
              console.log(`✅ Alerta de ${overdueAssignments.length} asignaciones vencidas enviada al admin`);
            } catch (error) {
              console.error('Error enviando alerta al admin:', error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error verificando asignaciones para notificaciones:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Ejecutar verificación inmediata
    checkAssignments();

    // Ejecutar verificación cada 30 minutos
    const interval = setInterval(() => {
      checkAssignments();
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, [user]);

  return {
    checkNow: checkAssignments
  };
};

