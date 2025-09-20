"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllUsers, getAllIndicators } from '@/lib/data';
import { getCollection } from '@/lib/firebase-functions';
import type { AssignedIndicator, Indicator, User, VerificationStatus } from '@/lib/types';
import { statusTranslations } from '@/lib/types';
import { Eye, Users } from 'lucide-react';

const statusToColor: Record<VerificationStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
  Overdue: 'bg-orange-100 text-orange-800 border-orange-300',
};

interface GraderStats {
  total: number;
  submitted: number;
  approved: number;
  pending: number;
  rejected: number;
}

export default function GradersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [allUsers, allIndicators, allAssignments] = await Promise.all([
          getAllUsers(),
          getAllIndicators(),
          getCollection<AssignedIndicator>('assigned_indicator'),
        ]);
        setUsers(allUsers);
        setIndicators(allIndicators);
        setAssignments(allAssignments);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const graders = useMemo(() => users.filter(user => user.role === 'calificador'), [users]);

  const getGraderStats = (graderId: string): GraderStats => {
    const graderAssignments = assignments.filter(a => a.jury?.includes(graderId));
    
    return {
      total: graderAssignments.length,
      submitted: graderAssignments.filter(a => a.overallStatus === 'Submitted').length,
      approved: graderAssignments.filter(a => a.overallStatus === 'Approved').length,
      pending: graderAssignments.filter(a => a.overallStatus === 'Pending').length,
      rejected: graderAssignments.filter(a => a.overallStatus === 'Rejected').length,
    };
  };

  const handleViewDetails = (graderId: string) => {
    router.push(`/admin/graders/${graderId}`);
  };

  return (
    <div className="container mx-auto py-2 space-y-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Calificadores</h1>
        </div>
        <p className="text-muted-foreground">
          Listado de jurados y asignaciones asociadas
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando calificadores...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {graders.map((grader) => {
            const stats = getGraderStats(grader.id);
            return (
              <Card key={grader.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-primary">
                    {grader.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {grader.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Estadísticas en grid compacto */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="font-semibold text-lg">{stats.total}</div>
                      <div className="text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-semibold text-lg text-blue-600">{stats.submitted}</div>
                      <div className="text-muted-foreground">Presentado</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-semibold text-lg text-green-600">{stats.approved}</div>
                      <div className="text-muted-foreground">Completado</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="font-semibold text-lg text-yellow-600">{stats.pending}</div>
                      <div className="text-muted-foreground">Pendiente</div>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleViewDetails(grader.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && graders.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No hay calificadores registrados</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}