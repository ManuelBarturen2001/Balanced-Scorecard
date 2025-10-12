"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserById, updateUser, getAllFaculties, getProfessionalSchoolsByFaculty, getAllOffices } from '@/lib/data';
import type { User, UserRole, RoleType, Faculty, ProfessionalSchool, Office } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, UserCircle2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminEditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin, loading: authLoading, user: currentUser, updateUserProfile } = useAuth();
  const { toast } = useToast();

  const userId = typeof params.userId === 'string' ? params.userId : '';

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuración de roles según el tipo
  const roleConfig = {
    responsable: { type: 'variante' as RoleType, availableRoles: ['responsable', 'calificador'] },
    calificador: { type: 'variante' as RoleType, availableRoles: ['responsable', 'calificador'] },
    asignador: { type: 'unico' as RoleType, availableRoles: ['asignador'] },
    admin: { type: 'unico' as RoleType, availableRoles: ['admin'] }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const foundUser = await getUserById(userId);
        
        if (foundUser) {
          setUserToEdit(foundUser);
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
        } else {
          setError('Usuario no encontrado');
          toast({
            title: "Usuario no encontrado",
            description: "No se pudo encontrar el usuario especificado.",
            variant: "destructive",
          });
          router.replace('/admin/users');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Error al cargar el usuario');
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId, router, toast]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [facultiesData, officesData] = await Promise.all([
          getAllFaculties(),
          getAllOffices()
        ]);
        setFaculties(facultiesData);
        setOffices(officesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  useEffect(() => {
    if (facultyId) {
      const schools = getProfessionalSchoolsByFaculty(facultyId);
      setProfessionalSchools(schools);
    } else {
      setProfessionalSchools([]);
      setProfessionalSchoolId('');
    }
  }, [facultyId]);

  // Actualizar configuración de roles cuando cambia el rol principal
  useEffect(() => {
    const config = roleConfig[role];
    setRoleType(config.type);
    // Para roles variante (responsable/calificador) solo incluimos el rol principal por defecto
    // El rol secundario se podrá activar desde un único checkbox
    setAvailableRoles([role]);
  }, [role]);

  const getInitials = (nameStr: string = "") => {
    const names = nameStr.split(" ");
    let initials = names[0] ? names[0][0] : "";
    if (names.length > 1 && names[names.length - 1]) {
      initials += names[names.length - 1][0];
    } else if (names[0] && names[0].length > 1) {
      initials = names[0].substring(0, 2);
    }
    return initials.toUpperCase() || "U";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (!userToEdit) {
        throw new Error('Usuario no encontrado');
      }

      // Construir objeto de datos sin campos undefined
      const updatedUserData: any = {
        name,
        email,
        avatar,
        role,
        roleType,
        availableRoles,
      };

      // Solo agregar campos si tienen valores válidos
      if (belongsToFaculty && facultyId) {
        updatedUserData.facultyId = facultyId;
        if (professionalSchoolId) {
          updatedUserData.professionalSchoolId = professionalSchoolId;
        }
        if (facultyBossName) {
          updatedUserData.facultyBossName = facultyBossName;
        }
        if (facultyBossEmail) {
          updatedUserData.facultyBossEmail = facultyBossEmail;
        }
      }

      if (belongsToOffice && officeId) {
        updatedUserData.officeId = officeId;
        if (officeBossName) {
          updatedUserData.officeBossName = officeBossName;
        }
        if (officeBossEmail) {
          updatedUserData.officeBossEmail = officeBossEmail;
        }
      }

      // Priorizar jefe de facultad sobre oficina para bossName/bossEmail
      if (facultyBossName || officeBossName) {
        updatedUserData.bossName = facultyBossName || officeBossName;
      }
      if (facultyBossEmail || officeBossEmail) {
        updatedUserData.bossEmail = facultyBossEmail || officeBossEmail;
      }

      await updateUser(userId, updatedUserData);
      
      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada exitosamente.",
      });
      
      router.push('/admin/users');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el usuario.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Rol secundario mostrado como único checkbox cuando el tipo es variante
  const secondaryRole: UserRole = role === 'responsable' ? 'calificador' : 'responsable';

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
            <CardFooter>
              <Button onClick={() => router.push('/admin/users')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Usuarios
              </Button>
            </CardFooter>
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
              Editar Usuario
            </CardTitle>
            <CardDescription>
              Modifica la información del usuario del sistema.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
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
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ingrese el nombre completo"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar">URL del avatar (opcional)</Label>
                    <Input
                      id="avatar"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://ejemplo.com/avatar.jpg"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración de roles */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuración de Roles</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol Principal *</Label>
                    <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsable">Responsable (Rol Variante)</SelectItem>
                        <SelectItem value="calificador">Calificador (Rol Variante)</SelectItem>
                        <SelectItem value="asignador">Asignador (Rol Único)</SelectItem>
                        <SelectItem value="admin">Administrador (Rol Único)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Rol</Label>
                    <div className="p-3 border rounded-md bg-muted">
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
                    <Label>Rol Secundario</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="secondaryRole"
                        checked={availableRoles.includes(secondaryRole)}
                        onCheckedChange={(checked) => {
                          setAvailableRoles(checked ? [role, secondaryRole] : [role]);
                        }}
                      />
                      <Label htmlFor="secondaryRole" className="text-sm">
                        {secondaryRole === 'responsable' ? 'Responsable' : 'Calificador'}
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              {/* Información institucional */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información Institucional</h3>
                
                {/* Pregunta principal */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">El usuario pertenece a una facultad u oficina?</Label>
                  <div className="flex space-x-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="belongsToFaculty" 
                        checked={belongsToFaculty}
                        onCheckedChange={(checked) => {
                          setBelongsToFaculty(checked as boolean);
                          if (!checked) {
                            setFacultyId("");
                            setProfessionalSchoolId("");
                            setFacultyBossName("");
                            setFacultyBossEmail("");
                          }
                        }}
                      />
                      <Label htmlFor="belongsToFaculty">Facultad</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="belongsToOffice" 
                        checked={belongsToOffice}
                        onCheckedChange={(checked) => {
                          setBelongsToOffice(checked as boolean);
                          if (!checked) {
                            setOfficeId("");
                            setOfficeBossName("");
                            setOfficeBossEmail("");
                          }
                        }}
                      />
                      <Label htmlFor="belongsToOffice">Oficina</Label>
                    </div>
                  </div>
                </div>

                {/* Campos de Facultad */}
                {belongsToFaculty && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm">Información de Facultad</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="faculty">Facultad *</Label>
                        <Select value={facultyId} onValueChange={setFacultyId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una facultad" />
                          </SelectTrigger>
                          <SelectContent>
                            {faculties.map((faculty) => (
                              <SelectItem key={faculty.id} value={faculty.id}>
                                {faculty.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="professionalSchool">Escuela Profesional</Label>
                        <Select 
                          value={professionalSchoolId} 
                          onValueChange={setProfessionalSchoolId}
                          disabled={!facultyId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={facultyId ? "Seleccione una escuela" : "Primero seleccione una facultad"} />
                          </SelectTrigger>
                          <SelectContent>
                            {professionalSchools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="facultyBossName">Nombre del Jefe de Facultad</Label>
                        <Input
                          id="facultyBossName"
                          value={facultyBossName}
                          onChange={(e) => setFacultyBossName(e.target.value)}
                          placeholder="Ingrese el nombre del jefe de facultad"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="facultyBossEmail">Correo del Jefe de Facultad</Label>
                        <Input
                          id="facultyBossEmail"
                          type="email"
                          value={facultyBossEmail}
                          onChange={(e) => setFacultyBossEmail(e.target.value)}
                          placeholder="jefe.facultad@unmsm.edu.pe"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos de Oficina */}
                {belongsToOffice && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm">Información de Oficina</h4>
                    <div className="space-y-2">
                      <Label htmlFor="office">Oficina *</Label>
                      <Select value={officeId} onValueChange={setOfficeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una oficina" />
                        </SelectTrigger>
                        <SelectContent>
                          {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id}>
                              {office.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="officeBossName">Nombre del Jefe de Oficina</Label>
                        <Input
                          id="officeBossName"
                          value={officeBossName}
                          onChange={(e) => setOfficeBossName(e.target.value)}
                          placeholder="Ingrese el nombre del jefe de oficina"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="officeBossEmail">Correo del Jefe de Oficina</Label>
                        <Input
                          id="officeBossEmail"
                          type="email"
                          value={officeBossEmail}
                          onChange={(e) => setOfficeBossEmail(e.target.value)}
                          placeholder="jefe.oficina@unmsm.edu.pe"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/users')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}