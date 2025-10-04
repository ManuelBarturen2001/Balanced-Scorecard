"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, getAllAssignedIndicators, getFacultyById, getOfficeById } from '@/lib/data';
import type { User, AssignedIndicator, Faculty, Office } from '@/lib/types';
import { ArrowLeft, Eye, Building2, Landmark, UserCheck } from 'lucide-react';
import { HistorialModal } from '@/components/admin/HistorialModal';

export default function CalificacionesPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const calificadorId = typeof params.calificadorId === 'string' ? params.calificadorId : '';
  
  const [calificador, setCalificador] = useState<User | null>(null);
  const [responsables, setResponsables] = useState<User[]>([]);
  const [assignedIndicators, setAssignedIndicators] = useState<AssignedIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResponsable, setSelectedResponsable] = useState<User | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [users, indicators] = await Promise.all([
          getAllUsers(),
          getAllAssignedIndicators()
        ]);
        
        // Encontrar el calificador
        const calificadorData = users.find(user => user.id === calificadorId && user.role === 'calificador');
        if (!calificadorData) {
          toast({
            title: "Error",
            description: "Calificador no encontrado.",
            variant: "destructive",
          });
          router.push('/admin/calificadores');
          return;
        }
        setCalificador(calificadorData);
        
        // Filtrar indicadores donde este calificador es parte del jurado
        const calificadorIndicators = indicators.filter(indicator => 
          indicator.jury && indicator.jury.includes(calificadorId)
        );
        setAssignedIndicators(calificadorIndicators);
        
        // Obtener responsables únicos de estos indicadores
        const responsableIds = [...new Set(calificadorIndicators.map(indicator => indicator.userId))];
        const responsablesData = users.filter(user => responsableIds.includes(user.id));
        setResponsables(responsablesData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin && calificadorId) {
      fetchData();
    }
  }, [isAdmin, authLoading, calificadorId, router, toast]);

  const getInitials = (name: string = "") => {
    const names = name.split(' ');
    let initials = names[0] ? names[0][0] : '';
    if (names.length > 1 && names[names.length - 1]) {
      initials += names[names.length - 1][0];
    } else if (names[0] && names[0].length > 1) {
      initials += names[0].substring(0,2);
    }
    return initials.toUpperCase() || 'U';
  };

  const getFacultyName = (facultyId: string) => {
    const faculty = getFacultyById(facultyId);
    return faculty?.name || 'Sin facultad';
  };

  const getOfficeName = (officeId: string) => {
    const office = getOfficeById(officeId);
    return office?.name || 'Sin oficina';
  };

  const getResponsableIndicators = (responsableId: string) => {
    return assignedIndicators.filter(indicator => indicator.userId === responsableId);
  };

  const handleVerHistorial = (responsable: User) => {
    setSelectedResponsable(responsable);
    setShowHistorial(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin || !calificador) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/calificadores')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-6 w-6" />
                  Gestión de Calificaciones
                </CardTitle>
                <CardDescription>
                  Responsables asignados al calificador: <strong>{calificador.name}</strong>
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {responsables.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Este calificador no tiene responsables asignados.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border shadow-sm bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] px-4">Avatar</TableHead>
                    <TableHead className="px-4">Nombre</TableHead>
                    <TableHead className="px-4">Correo</TableHead>
                    <TableHead className="px-4">Facultad</TableHead>
                    <TableHead className="px-4">Oficina</TableHead>
                    <TableHead className="px-4">Indicadores</TableHead>
                    <TableHead className="text-right px-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responsables.map((responsable) => {
                    const responsableIndicators = getResponsableIndicators(responsable.id);
                    return (
                      <TableRow key={responsable.id} className="hover:bg-muted/50">
                        <TableCell className="px-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={responsable.avatar} alt={responsable.name} />
                            <AvatarFallback>{getInitials(responsable.name)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium px-4">{responsable.name}</TableCell>
                        <TableCell className="px-4 text-muted-foreground">{responsable.email}</TableCell>
                        <TableCell className="px-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">
                              {getFacultyName(responsable.facultyId || '')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <Landmark className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">
                              {getOfficeName(responsable.officeId || '')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4">
                          <Badge variant="outline">
                            {responsableIndicators.length} indicador{responsableIndicators.length !== 1 ? 'es' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleVerHistorial(responsable)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Historial
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Historial */}
      {showHistorial && selectedResponsable && (
        <HistorialModal
          calificador={calificador}
          responsable={selectedResponsable}
          assignedIndicators={assignedIndicators.filter(indicator => 
            indicator.userId === selectedResponsable.id
          )}
          onClose={() => {
            setShowHistorial(false);
            setSelectedResponsable(null);
          }}
        />
      )}
    </div>
  );
}
