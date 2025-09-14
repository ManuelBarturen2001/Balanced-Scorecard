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
import type { UserRole, RoleType, Faculty, ProfessionalSchool, Office } from "@/lib/types";

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("usuario");
  const [roleType, setRoleType] = useState<RoleType>("variante");
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(["usuario"]);
  const [facultyId, setFacultyId] = useState("");
  const [professionalSchoolId, setProfessionalSchoolId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [belongsTo, setBelongsTo] = useState<'facultad' | 'oficina' | 'ninguno'>('ninguno');
  const [facultyHeadName, setFacultyHeadName] = useState("");
  const [facultyHeadEmail, setFacultyHeadEmail] = useState("");
  const [officeHeadName, setOfficeHeadName] = useState("");
  const [officeHeadEmail, setOfficeHeadEmail] = useState("");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Configuración de roles según el tipo
  const roleConfig = {
    usuario: { type: 'variante' as RoleType, availableRoles: ['usuario', 'calificador'] },
    calificador: { type: 'variante' as RoleType, availableRoles: ['usuario', 'calificador'] },
    asignador: { type: 'unico' as RoleType, availableRoles: ['asignador'] },
    responsable: { type: 'unico' as RoleType, availableRoles: ['responsable'] },
    admin: { type: 'unico' as RoleType, availableRoles: ['admin'] }
  };

  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const facultiesData = getAllFaculties();
        const officesData = getAllOffices();
        setFaculties(facultiesData);
        setOffices(officesData);
      } catch (error) {
        console.error('Error loading faculties:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las facultades.",
          variant: "destructive",
        });
      }
    };

    loadFaculties();
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
    setAvailableRoles(config.availableRoles);
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
      await createUser({ 
        name, 
        email, 
        avatar, 
        role,
        roleType,
        availableRoles,
        facultyId: belongsTo === 'facultad' ? (facultyId || undefined) : undefined,
        professionalSchoolId: belongsTo === 'facultad' ? (professionalSchoolId || undefined) : undefined,
        facultyHeadName: belongsTo === 'facultad' ? (facultyHeadName || undefined) : undefined,
        facultyHeadEmail: belongsTo === 'facultad' ? (facultyHeadEmail || undefined) : undefined,
        officeId: belongsTo === 'oficina' ? (officeId || undefined) : undefined,
        officeHeadName: belongsTo === 'oficina' ? (officeHeadName || undefined) : undefined,
        officeHeadEmail: belongsTo === 'oficina' ? (officeHeadEmail || undefined) : undefined,
      }, password);
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
                        <SelectItem value="usuario">Usuario (Rol Variante)</SelectItem>
                        <SelectItem value="calificador">Calificador (Rol Variante)</SelectItem>
                        <SelectItem value="asignador">Asignador (Rol Único)</SelectItem>
                        <SelectItem value="responsable">Responsable (Rol Único)</SelectItem>
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
                    <Label>Roles Disponibles</Label>
                    <div className="space-y-2">
                      {availableRoles.map((availableRole) => (
                        <div key={availableRole} className="flex items-center space-x-2">
                          <Checkbox 
                            id={availableRole} 
                            checked={availableRoles.includes(availableRole)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAvailableRoles(prev => [...prev, availableRole]);
                              } else {
                                setAvailableRoles(prev => prev.filter(r => r !== availableRole));
                              }
                            }}
                          />
                          <Label htmlFor={availableRole} className="text-sm">
                            {availableRole === 'usuario' && 'Usuario'}
                            {availableRole === 'calificador' && 'Calificador'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pertenencia: Facultad u Oficina */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">El usuario pertenece a una facultad u oficina?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>¿Pertenece a una facultad u oficina?</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <Button type="button" variant={belongsTo === 'facultad' ? 'default' : 'outline'} onClick={() => { setBelongsTo('facultad'); setOfficeId(''); setOfficeHeadEmail(''); setOfficeHeadName(''); }}>
                        Facultad
                      </Button>
                      <Button type="button" variant={belongsTo === 'oficina' ? 'default' : 'outline'} onClick={() => { setBelongsTo('oficina'); setFacultyId(''); setProfessionalSchoolId(''); setFacultyHeadEmail(''); setFacultyHeadName(''); }}>
                        Oficina
                      </Button>
                      <Button type="button" variant={belongsTo === 'ninguno' ? 'default' : 'outline'} onClick={() => { setBelongsTo('ninguno'); setFacultyId(''); setProfessionalSchoolId(''); setOfficeId(''); setFacultyHeadEmail(''); setFacultyHeadName(''); setOfficeHeadEmail(''); setOfficeHeadName(''); }}>
                        Ninguno
                      </Button>
                    </div>
                  </div>
                  {belongsTo === 'facultad' && (
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="faculty">Facultad</Label>
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
                          <Label htmlFor="facultyHeadName">Nombre del jefe de facultad</Label>
                          <Input id="facultyHeadName" value={facultyHeadName} onChange={(e) => setFacultyHeadName(e.target.value)} placeholder="Nombre del jefe de facultad" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facultyHeadEmail">Correo del jefe de facultad</Label>
                          <Input id="facultyHeadEmail" type="email" value={facultyHeadEmail} onChange={(e) => setFacultyHeadEmail(e.target.value)} placeholder="correo@facultad.edu.pe" />
                        </div>
                      </div>
                    </div>
                  )}
                  {belongsTo === 'oficina' && (
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="office">Oficina</Label>
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
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="officeHeadName">Nombre del jefe de oficina</Label>
                          <Input id="officeHeadName" value={officeHeadName} onChange={(e) => setOfficeHeadName(e.target.value)} placeholder="Nombre del jefe de oficina" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="officeHeadEmail">Correo del jefe de oficina</Label>
                          <Input id="officeHeadEmail" type="email" value={officeHeadEmail} onChange={(e) => setOfficeHeadEmail(e.target.value)} placeholder="correo@oficina.edu.pe" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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