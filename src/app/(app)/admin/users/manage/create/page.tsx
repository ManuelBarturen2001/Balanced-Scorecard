"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, UserPlus } from "lucide-react";
import { createUser, getAllFaculties, getProfessionalSchoolsByFaculty, getAllOffices } from "@/lib/data";
import type { UserRole, RoleType, Faculty, ProfessionalSchool, Office, User } from "@/lib/types";

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("responsable");
  const [roleType, setRoleType] = useState<RoleType>("variante");
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(["responsable"]);
  const [facultyId, setFacultyId] = useState("");
  const [professionalSchoolId, setProfessionalSchoolId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [belongsToFaculty, setBelongsToFaculty] = useState(false);
  const [belongsToOffice, setBelongsToOffice] = useState(false);
  const [facultyBossName, setFacultyBossName] = useState("");
  const [facultyBossEmail, setFacultyBossEmail] = useState("");
  const [officeBossName, setOfficeBossName] = useState("");
  const [officeBossEmail, setOfficeBossEmail] = useState("");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Configuración de roles según el tipo
  const roleConfig = {
    responsable: { type: 'variante' as RoleType, availableRoles: ['responsable', 'calificador'] },
    calificador: { type: 'variante' as RoleType, availableRoles: ['responsable', 'calificador'] },
    asignador: { type: 'unico' as RoleType, availableRoles: ['asignador'] },
    admin: { type: 'unico' as RoleType, availableRoles: ['admin'] }
  };

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
      setProfessionalSchoolId(''); // Reset professional school when faculty changes
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

  // Validación simple de email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validación de contraseña
  const isValidPassword = (password: string) => {
    return password.length >= 6;
  };

  const passwordsMatch = password === confirmPassword;

  const isFormValid = name.trim() !== "" && email.trim() !== "" && isValidEmail(email) && isValidPassword(password) && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Construir el objeto de usuario con campos opcionales
      const userData: Omit<User, 'id'> = {
        name, 
        email, 
        avatar, 
        role,
        roleType,
        availableRoles,
      };

      // Agregar campos de facultad solo si pertenece a una facultad
      if (belongsToFaculty && facultyId) {
        userData.facultyId = facultyId;
        if (professionalSchoolId) {
          userData.professionalSchoolId = professionalSchoolId;
        }
        if (facultyBossName) {
          userData.facultyBossName = facultyBossName;
        }
        if (facultyBossEmail) {
          userData.facultyBossEmail = facultyBossEmail;
        }
      }

      // Agregar campos de oficina solo si pertenece a una oficina
      if (belongsToOffice && officeId) {
        userData.officeId = officeId;
        if (officeBossName) {
          userData.officeBossName = officeBossName;
        }
        if (officeBossEmail) {
          userData.officeBossEmail = officeBossEmail;
        }
      }

      // Priorizar jefe de facultad sobre oficina para bossName/bossEmail
      if (facultyBossName || officeBossName) {
        userData.bossName = facultyBossName || officeBossName;
      }
      if (facultyBossEmail || officeBossEmail) {
        userData.bossEmail = facultyBossEmail || officeBossEmail;
      }

      await createUser(userData, password);
      toast({
        title: "Usuario creado",
        description: "El nuevo usuario ha sido creado exitosamente.",
      });
      router.push("/admin/users");
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el usuario.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Rol secundario mostrado como único checkbox cuando el tipo es variante
  const secondaryRole: UserRole = role === 'responsable' ? 'calificador' : 'responsable';

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Crear Nuevo Usuario
            </CardTitle>
            <CardDescription>
              Complete la información del nuevo usuario del sistema.
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

              {/* Información académica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información Académica</h3>
                
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


              {/* Contraseña */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Seguridad</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita la contraseña"
                      required
                    />
                  </div>
                </div>

                {password && !isValidPassword(password) && (
                  <p className="text-sm text-red-600">
                    La contraseña debe tener al menos 6 caracteres.
                  </p>
                )}

                {confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-600">
                    Las contraseñas no coinciden.
                  </p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Creando..." : "Crear Usuario"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}