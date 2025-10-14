
"use client";

import type { User, UserRole, RoleType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit3, Trash2, UserCheck, Eye, Search, Filter, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { getAllFaculties, getAllProfessionalSchools, getAllOffices, getFacultyById, getOfficeById } from '@/lib/data';
import type { Faculty, ProfessionalSchool, Office } from '@/lib/types';

interface UserManagementTableProps {
  users: User[];
  onUserUpdate: (userId: string, updates: Partial<User>) => void; 
  onUserDelete: (userId: string) => void;
  isSupervisor?: boolean;
}

const roleTranslations: Record<UserRole, string> = {
  responsable: "Responsable",
  calificador: "Calificador",
  asignador: "Asignador",
  admin: "Administrador",
  supervisor: "Supervisor",
};

const roleTypeTranslations: Record<RoleType, string> = {
  variante: "Variante",
  unico: "Único",
};

const roleColors: Record<UserRole, string> = {
  responsable: "bg-blue-100 text-blue-800",
  calificador: "bg-green-100 text-green-800",
  asignador: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800",
  supervisor: "bg-orange-100 text-orange-800",
};

export function UserManagementTable({ users, onUserUpdate, onUserDelete, isSupervisor = false }: UserManagementTableProps) {
  const { toast } = useToast();
  
  // Estados para filtros
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [selectedOffice, setSelectedOffice] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  // Cargar datos de facultades, escuelas y oficinas
  useEffect(() => {
    const loadData = async () => {
      try {
        const [facultiesData, schoolsData, officesData] = await Promise.all([
          getAllFaculties(),
          getAllProfessionalSchools(),
          getAllOffices()
        ]);
        setFaculties(facultiesData);
        setProfessionalSchools(schoolsData);
        setOffices(officesData);
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    loadData();
  }, []);

  // Actualizar usuarios filtrados cuando cambien los usuarios o filtros
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = users;

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por facultad
    if (selectedFaculty !== 'all') {
      filtered = filtered.filter(user => user.facultyId === selectedFaculty);
    }

    // Filtro por escuela profesional
    if (selectedSchool !== 'all') {
      filtered = filtered.filter(user => user.professionalSchoolId === selectedSchool);
    }

    // Filtro por oficina
    if (selectedOffice !== 'all') {
      filtered = filtered.filter(user => user.officeId === selectedOffice);
    }

    setFilteredUsers(filtered);
  };

  // Aplicar filtros cuando cambien los valores
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedFaculty, selectedSchool, selectedOffice, users]);

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

  const handleDeactivateUser = (userId: string, userName: string) => {
    onUserDelete(userId);
    toast({
      title: "Usuario Desactivado (Simulado)",
      description: `${userName} ha sido desactivado. Esta es una acción simulada y los cambios no persisten.`,
      variant: "destructive"
    });
  };
  
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

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="space-y-4">
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
                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
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

      {/* Tabla */}
      <div className="rounded-lg border border-border shadow-sm bg-card overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] px-4">Avatar</TableHead>
            <TableHead className="px-4">Nombre</TableHead>
            <TableHead className="px-4">Correo Electrónico</TableHead>
            <TableHead className="px-4">Rol</TableHead>
            <TableHead className="px-4">Tipo</TableHead>
            <TableHead className="px-4">Facultad</TableHead>
            <TableHead className="px-4">Oficina</TableHead>
            <TableHead className="text-right px-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/50">
              <TableCell className="px-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium px-4">{user.name}</TableCell>
              <TableCell className="px-4 text-muted-foreground">{user.email}</TableCell>
              <TableCell className="px-4">
                <div className="flex flex-col gap-1">
                  <Badge 
                    className={cn("text-xs", roleColors[user.role])}
                  >
                    {roleTranslations[user.role]}
                  </Badge>
                  {user.roleType === 'variante' && user.availableRoles && user.availableRoles.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {user.availableRoles.map((role) => (
                        <Badge 
                          key={role} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {roleTranslations[role]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-4">
                <Badge variant="outline" className="text-xs">
                  {roleTypeTranslations[user.roleType || 'variante']}
                </Badge>
              </TableCell>
              <TableCell className="px-4 text-muted-foreground">
                {user.facultyId ? getFacultyName(user.facultyId) : 'Sin facultad'}
              </TableCell>
              <TableCell className="px-4 text-muted-foreground">
                {user.officeId ? getOfficeName(user.officeId) : 'Sin oficina'}
              </TableCell>
              <TableCell className="px-4 text-right">
                {isSupervisor ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/users/view/${user.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </Link>
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/users/manage/${user.id}`} className="flex items-center">
                          <Edit3 className="mr-2 h-4 w-4" />
                          Editar Usuario
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/users/manage/${user.id}`} className="flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="flex items-center text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Desactivar Usuario
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción desactivará al usuario "{user.name}". 
                              Esta es una acción simulada y los cambios no persisten.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeactivateUser(user.id, user.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Desactivar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {filteredUsers.length === 0 && users.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No se encontraron usuarios con los filtros aplicados</p>
          <Button variant="outline" onClick={clearFilters} className="mt-2">
            Limpiar Filtros
          </Button>
        </div>
      )}
      
      {users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay usuarios para mostrar</p>
        </div>
      )}
      </div>
    </div>
  );
}
