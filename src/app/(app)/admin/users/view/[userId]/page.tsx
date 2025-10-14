"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { getUserById, getAllFaculties, getProfessionalSchoolsByFaculty, getAllOffices } from '@/lib/data';
import type { User, UserRole, RoleType, Faculty, ProfessionalSchool, Office } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, UserCircle2, AlertCircle } from 'lucide-react';

export default function ViewUserPage() {
  const { isAdmin, isSupervisor, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState<UserRole>('responsable');
  const [roleType, setRoleType] = useState<RoleType>('variante');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(['responsable']);
  const [facultyId, setFacultyId] = useState('');
  const [professionalSchoolId, setProfessionalSchoolId] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [belongsToFaculty, setBelongsToFaculty] = useState(false);
  const [belongsToOffice, setBelongsToOffice] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossEmail, setBossEmail] = useState('');
  const [facultyBossName, setFacultyBossName] = useState('');
  const [facultyBossEmail, setFacultyBossEmail] = useState('');
  const [officeBossName, setOfficeBossName] = useState('');
  const [officeBossEmail, setOfficeBossEmail] = useState('');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuración de roles según el tipo
  const roleConfig = {
    responsable: { type: 'variante' as RoleType, availableRoles: ['responsable', 'calificador'] },
    calificador: { type: 'variante' as RoleType, availableRoles: ['responsable', 'calificador'] },
    asignador: { type: 'unico' as RoleType, availableRoles: ['asignador'] },
    admin: { type: 'unico' as RoleType, availableRoles: ['admin'] },
    supervisor: { type: 'unico' as RoleType, availableRoles: ['supervisor'] }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin && !isSupervisor) {
      router.replace('/dashboard');
      return;
    }
  }, [isAdmin, isSupervisor, authLoading, router]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Cargar datos de catálogos
        const [facultiesData, officesData] = await Promise.all([
          getAllFaculties(),
          getAllOffices()
        ]);
        
        setFaculties(facultiesData);
        setOffices(officesData);
        
        const foundUser = await getUserById(userId);
        
        if (foundUser) {
          setUser(foundUser);
          setName(foundUser.name);
          setEmail(foundUser.email);
          setAvatar(foundUser.avatar || '');
          setRole(foundUser.role);
          setRoleType(foundUser.roleType || 'variante');
          setAvailableRoles(foundUser.availableRoles || [foundUser.role]);
          setFacultyId(foundUser.facultyId || '');
          setProfessionalSchoolId(foundUser.professionalSchoolId || '');
          setOfficeId(foundUser.officeId || '');
          setBelongsToFaculty(!!foundUser.facultyId);
          setBelongsToOffice(!!foundUser.officeId);
          setBossName(foundUser.bossName || '');
          setBossEmail(foundUser.bossEmail || '');
          setFacultyBossName(foundUser.facultyBossName || '');
          setFacultyBossEmail(foundUser.facultyBossEmail || '');
          setOfficeBossName(foundUser.officeBossName || '');
          setOfficeBossEmail(foundUser.officeBossEmail || '');
          
          // Cargar escuelas profesionales si tiene facultad
          if (foundUser.facultyId) {
            const schoolsData = getProfessionalSchoolsByFaculty(foundUser.facultyId);
            setProfessionalSchools(schoolsData);
          }
        } else {
          setError('Usuario no encontrado');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Error al cargar los datos del usuario');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && (isAdmin || isSupervisor)) {
      fetchUser();
    }
  }, [userId, isAdmin, isSupervisor]);

  const getInitials = (name: string = "") => {
    const names = name.split(' ');
    let initials = names[0] ? names[0][0] : '';
    if (names.length > 1 && names[names.length - 1]) {
      initials += names[names.length - 1][0];
    } else if (names[0] && names[0].length > 1) {
      initials += names[0].substring(1, 2);
    }
    return initials.toUpperCase() || 'U';
  };

  // Rol secundario mostrado como único checkbox cuando el tipo es variante
  const secondaryRole: UserRole = role === 'responsable' ? 'calificador' : 'responsable';

  const getFacultyName = (id: string) => {
    const faculty = faculties.find(f => f.id === id);
    return faculty?.name || 'Sin facultad';
  };

  const getOfficeName = (id: string) => {
    const office = offices.find(o => o.id === id);
    return office?.name || 'Sin oficina';
  };

  const getSchoolName = (id: string) => {
    const school = professionalSchools.find(s => s.id === id);
    return school?.name || 'Sin escuela';
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" />
              Detalles del Usuario
            </CardTitle>
            <CardDescription>
              Información completa del usuario del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Personal</h3>
              
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium">Nombre completo</div>
                  <div className="p-3 border rounded-md bg-muted/30">{name}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Correo electrónico</div>
                  <div className="p-3 border rounded-md bg-muted/30">{email}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">URL del avatar</div>
                  <div className="p-3 border rounded-md bg-muted/30 truncate">{avatar || 'No especificado'}</div>
                </div>
              </div>
            </div>

            {/* Configuración de roles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración de Roles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Rol Principal</div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    {role === 'responsable' && 'Responsable (Rol Variante)'}
                    {role === 'calificador' && 'Calificador (Rol Variante)'}
                    {role === 'asignador' && 'Asignador (Rol Único)'}
                    {role === 'admin' && 'Administrador del Sistema (Rol Único)'}
                    {role === 'supervisor' && 'Supervisor (Rol Único)'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Tipo de Rol</div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    <span className="text-sm font-medium">
                      {roleType === 'variante' ? 'Rol Variante' : 'Rol Único'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {roleType === 'variante' 
                        ? 'Puede cambiar entre roles disponibles' 
                        : 'Rol fijo, no puede cambiar'}
                    </p>
                  </div>
                </div>
              </div>

              {roleType === 'variante' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Rol Secundario</div>
                  <div className="p-3 border rounded-md bg-muted/30">
                    {availableRoles.includes(secondaryRole) ? (
                      <span className="text-sm">
                        {secondaryRole === 'responsable' ? 'Responsable' : 'Calificador'}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No asignado</span>
                    )}
                  </div>
                </div>
              )}

              {/* Información adicional para roles específicos */}
              {role === 'admin' && (
                <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Administrador del Sistema:</strong> Tendrá acceso completo a todas las funcionalidades del sistema, incluyendo gestión de usuarios, asignaciones, calificaciones y configuración.
                  </p>
                </div>
              )}

              {role === 'supervisor' && (
                <div className="p-3 border rounded-md bg-orange-50 border-orange-200">
                  <p className="text-sm text-orange-800">
                    <strong>Supervisor:</strong> Podrá ver la gestión general del sistema y enviar notificaciones, pero no podrá crear o editar usuarios.
                  </p>
                </div>
              )}
            </div>

            {/* Información institucional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Institucional</h3>
              
              {/* Pregunta principal */}
              <div className="space-y-3">
                <div className="text-base font-medium">El usuario pertenece a una facultad u oficina?</div>
                <div className="flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border-2 ${belongsToFaculty ? 'bg-primary border-primary' : 'border-muted-foreground'}`}></div>
                    <span className="text-sm">Facultad</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border-2 ${belongsToOffice ? 'bg-primary border-primary' : 'border-muted-foreground'}`}></div>
                    <span className="text-sm">Oficina</span>
                  </div>
                </div>
              </div>

              {/* Campos de Facultad */}
              {belongsToFaculty && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm">Información de Facultad</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Facultad</div>
                      <div className="p-3 border rounded-md bg-background">{getFacultyName(facultyId)}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Escuela Profesional</div>
                      <div className="p-3 border rounded-md bg-background">{getSchoolName(professionalSchoolId)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Nombre del Jefe de Facultad</div>
                      <div className="p-3 border rounded-md bg-background">{facultyBossName || 'No especificado'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Email del Jefe de Facultad</div>
                      <div className="p-3 border rounded-md bg-background">{facultyBossEmail || 'No especificado'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campos de Oficina */}
              {belongsToOffice && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm">Información de Oficina</h4>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Oficina</div>
                    <div className="p-3 border rounded-md bg-background">{getOfficeName(officeId)}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Nombre del Jefe de Oficina</div>
                      <div className="p-3 border rounded-md bg-background">{officeBossName || 'No especificado'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Email del Jefe de Oficina</div>
                      <div className="p-3 border rounded-md bg-background">{officeBossEmail || 'No especificado'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Información del jefe */}
              {(bossName || bossEmail) && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm">Información del Jefe</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Nombre del Jefe</div>
                      <div className="p-3 border rounded-md bg-background">{bossName}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Email del Jefe</div>
                      <div className="p-3 border rounded-md bg-background">{bossEmail}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardContent>
            <Button onClick={() => router.back()} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
