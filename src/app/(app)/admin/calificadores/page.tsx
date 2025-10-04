"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, getFacultyById, getOfficeById } from '@/lib/data';
import type { User, Faculty, Office } from '@/lib/types';
import { UserCheck, Eye, Building2, Landmark } from 'lucide-react';
import Link from 'next/link';

export default function CalificadoresPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [calificadores, setCalificadores] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/dashboard';
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [users, facultiesData, officesData] = await Promise.all([
          getAllUsers(),
          getFacultyById(''),
          getOfficeById('')
        ]);
        
        // Filtrar solo usuarios con rol calificador
        const calificadoresData = users.filter(user => user.role === 'calificador');
        setCalificadores(calificadoresData);
        
        // Cargar facultades y oficinas para mostrar nombres
        const facultiesMap = new Map();
        const officesMap = new Map();
        
        // Simular carga de facultades y oficinas (en un caso real, cargarías todas)
        calificadoresData.forEach(calificador => {
          if (calificador.facultyId) {
            const faculty = getFacultyById(calificador.facultyId);
            if (faculty) facultiesMap.set(calificador.facultyId, faculty);
          }
          if (calificador.officeId) {
            const office = getOfficeById(calificador.officeId);
            if (office) officesMap.set(calificador.officeId, office);
          }
        });
        
        setFaculties(Array.from(facultiesMap.values()));
        setOffices(Array.from(officesMap.values()));
        
      } catch (error) {
        console.error('Error fetching calificadores:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los calificadores.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, authLoading, toast]);

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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Gestión de Calificadores
          </CardTitle>
          <CardDescription>
            Administra y supervisa a los calificadores del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calificadores.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay calificadores registrados en el sistema.</p>
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
                    <TableHead className="text-right px-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calificadores.map((calificador) => (
                    <TableRow key={calificador.id} className="hover:bg-muted/50">
                      <TableCell className="px-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={calificador.avatar} alt={calificador.name} />
                          <AvatarFallback>{getInitials(calificador.name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium px-4">{calificador.name}</TableCell>
                      <TableCell className="px-4 text-muted-foreground">{calificador.email}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">
                            {getFacultyName(calificador.facultyId || '')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <Landmark className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">
                            {getOfficeName(calificador.officeId || '')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/calificaciones/${calificador.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Gestión
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
