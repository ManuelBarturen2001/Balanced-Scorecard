"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, getAllAssignedIndicators } from '@/lib/data';
import type { User, AssignedIndicator } from '@/lib/types';
import { ClipboardCheck, Users, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CalificacionesMainPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalCalificadores: 0,
    totalIndicadores: 0,
    totalEvaluaciones: 0,
    evaluacionesPendientes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/dashboard';
      return;
    }

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [users, indicators] = await Promise.all([
          getAllUsers(),
          getAllAssignedIndicators()
        ]);
        
        const calificadores = users.filter(user => user.role === 'calificador');
        const totalEvaluaciones = indicators.reduce((total, indicator) => {
          return total + (indicator.jury?.length || 0);
        }, 0);
        
        const evaluacionesPendientes = indicators.reduce((total, indicator) => {
          const pendingMethods = indicator.assignedVerificationMethods?.filter(
            method => method.status === 'Pending'
          ).length || 0;
          return total + pendingMethods;
        }, 0);
        
        setStats({
          totalCalificadores: calificadores.length,
          totalIndicadores: indicators.length,
          totalEvaluaciones,
          evaluacionesPendientes
        });
        
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las estadísticas.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, authLoading, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="h-8 bg-muted rounded w-64 mb-2" />
            <div className="h-4 bg-muted rounded w-96" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Gestión de Calificaciones
          </CardTitle>
          <CardDescription>
            Supervisa y administra el sistema de calificaciones del Balanced Scorecard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Calificadores</p>
                    <p className="text-2xl font-bold">{stats.totalCalificadores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Indicadores</p>
                    <p className="text-2xl font-bold">{stats.totalIndicadores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <ClipboardCheck className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Evaluaciones</p>
                    <p className="text-2xl font-bold">{stats.totalEvaluaciones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                    <p className="text-2xl font-bold">{stats.evaluacionesPendientes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestión de Calificadores
                </CardTitle>
                <CardDescription>
                  Administra y supervisa a los calificadores del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Visualiza todos los calificadores registrados, sus facultades, oficinas y 
                  responsables asignados.
                </p>
                <Button asChild>
                  <Link href="/admin/calificadores">
                    Ver Calificadores
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Estadísticas Generales
                </CardTitle>
                <CardDescription>
                  Resumen del estado actual del sistema de calificaciones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total de calificadores:</span>
                    <span className="font-medium">{stats.totalCalificadores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Indicadores activos:</span>
                    <span className="font-medium">{stats.totalIndicadores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evaluaciones en curso:</span>
                    <span className="font-medium">{stats.totalEvaluaciones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pendientes de revisión:</span>
                    <span className="font-medium text-orange-600">{stats.evaluacionesPendientes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

