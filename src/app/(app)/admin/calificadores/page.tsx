"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, getFacultyById, getOfficeById } from '@/lib/data';
import type { User, Faculty, Office } from '@/lib/types';
import { UserCheck, Eye, Building2, Landmark, Search, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getAllFaculties, getAllProfessionalSchools, getAllOffices } from '@/lib/data';
import type { ProfessionalSchool } from '@/lib/types';

export default function CalificadoresPage() {
  const { isAdmin, isSupervisor, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [calificadores, setCalificadores] = useState<User[]>([]);
  const [filteredCalificadores, setFilteredCalificadores] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [selectedOffice, setSelectedOffice] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin && !isSupervisor) {
      window.location.href = '/dashboard';
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [users, facultiesData, professionalSchoolsData, officesData] = await Promise.all([
          getAllUsers(),
          getAllFaculties(),
          getAllProfessionalSchools(),
          getAllOffices()
        ]);
        
        // Filtrar solo usuarios con rol calificador
        const calificadoresData = users.filter(user => user.role === 'calificador');
        setCalificadores(calificadoresData);
        setFilteredCalificadores(calificadoresData);
        setFaculties(facultiesData);
        setProfessionalSchools(professionalSchoolsData);
        setOffices(officesData);
        
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

    if (isAdmin || isSupervisor) {
      fetchData();
    }
  }, [isAdmin, isSupervisor, authLoading, toast]);

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

  const getSchoolName = (schoolId: string) => {
    const school = professionalSchools.find(s => s.id === schoolId);
    return school?.name || 'Sin escuela';
  };

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = calificadores;

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(calificador =>
        calificador.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        calificador.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por facultad
    if (selectedFaculty !== 'all') {
      filtered = filtered.filter(calificador => calificador.facultyId === selectedFaculty);
    }

    // Filtro por escuela profesional
    if (selectedSchool !== 'all') {
      filtered = filtered.filter(calificador => calificador.professionalSchoolId === selectedSchool);
    }

    // Filtro por oficina
    if (selectedOffice !== 'all') {
      filtered = filtered.filter(calificador => calificador.officeId === selectedOffice);
    }

    setFilteredCalificadores(filtered);
  };

  // Aplicar filtros cuando cambien los valores
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedFaculty, selectedSchool, selectedOffice, calificadores]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFaculty('all');
    setSelectedSchool('all');
    setSelectedOffice('all');
  };

  // Filtrar escuelas por facultad seleccionada
  const filteredSchools = selectedFaculty === 'all' 
    ? professionalSchools 
    : professionalSchools.filter(school => school.facultyId === selectedFaculty);

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

  if (!isAdmin && !isSupervisor) {
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
          {/* Filtros */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filtros de Búsqueda</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
              </Button>
            </div>

            {showFilters && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                {/* Búsqueda por nombre */}
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Filtros por facultad, escuela y oficina */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Facultad</Label>
                    <Select value={selectedFaculty} onValueChange={(value) => {
                      setSelectedFaculty(value);
                      setSelectedSchool('all'); // Reset school when faculty changes
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las facultades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las facultades</SelectItem>
                        {faculties.map((faculty) => (
                          <SelectItem key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Escuela Profesional</Label>
                    <Select 
                      value={selectedSchool} 
                      onValueChange={setSelectedSchool}
                      disabled={selectedFaculty === 'all'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedFaculty === 'all' ? "Selecciona una facultad primero" : "Todas las escuelas"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las escuelas</SelectItem>
                        {filteredSchools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Oficina</Label>
                    <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las oficinas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las oficinas</SelectItem>
                        {offices.map((office) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {filteredCalificadores.length} calificador{filteredCalificadores.length !== 1 ? 'es' : ''} encontrado{filteredCalificadores.length !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            )}
          </div>

          {calificadores.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay calificadores registrados en el sistema.</p>
            </div>
          ) : filteredCalificadores.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron calificadores con los filtros aplicados.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-2">
                Limpiar Filtros
              </Button>
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
                  {filteredCalificadores.map((calificador) => (
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

