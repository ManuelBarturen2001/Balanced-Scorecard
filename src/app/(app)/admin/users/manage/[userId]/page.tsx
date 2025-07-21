"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserById, updateUser, getAllFaculties, getProfessionalSchoolsByFaculty } from '@/lib/data';
import type { User, Faculty, ProfessionalSchool } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [facultyId, setFacultyId] = useState('');
  const [professionalSchoolId, setProfessionalSchoolId] = useState('');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setFacultyId(foundUser.facultyId || '');
          setProfessionalSchoolId(foundUser.professionalSchoolId || '');
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
    const loadFaculties = async () => {
      try {
        const facultiesData = getAllFaculties();
        setFaculties(facultiesData);
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
      
      // Si el usuario ya tenía una escuela profesional, verificar si sigue siendo válida
      if (professionalSchoolId && !schools.find(s => s.id === professionalSchoolId)) {
        setProfessionalSchoolId('');
      }
    } else {
      setProfessionalSchools([]);
      setProfessionalSchoolId('');
    }
  }, [facultyId, professionalSchoolId]);

  const getInitials = (nameStr: string = "") => {
    const names = nameStr.split(' ');
    let initials = names[0] ? names[0][0] : '';
    if (names.length > 1 && names[names.length - 1]) {
      initials += names[names.length - 1][0];
    } else if (names[0] && names[0].length > 1) {
      initials = names[0].substring(0,2);
    }
    return initials.toUpperCase() || 'U';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setIsSaving(true);

    try {
      // Update user in Firebase
      await updateUser(userId, {
        name,
        email,
        avatar,
        facultyId: facultyId || undefined,
        professionalSchoolId: professionalSchoolId || undefined,
      });
      
      // Update local state for immediate feedback
      setUserToEdit(prev => prev ? {...prev, name, email, avatar, facultyId, professionalSchoolId} : null);

      // If the edited user is the current logged-in user, update the activeUser in localStorage
      if (currentUser && currentUser.id === userId) {
        await updateUserProfile({
          name,
          email,
          avatar,
          facultyId: facultyId || undefined,
          professionalSchoolId: professionalSchoolId || undefined,
        });
      }

      toast({
        title: "Perfil Actualizado",
        description: `La información de ${name} ha sido actualizada exitosamente.`,
      });
      router.push('/admin/users');
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error al Actualizar",
        description: "No se pudo actualizar la información del usuario. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-72 mb-8" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isAdmin) return null;
  
  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Button variant="outline" onClick={() => router.push('/admin/users')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Gestión de Usuarios
        </Button>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="items-center text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <CardTitle className="font-headline text-2xl">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!userToEdit) return <p className="text-center mt-10">Usuario no encontrado.</p>;

  return (
    <div className="container mx-auto py-6 md:py-10">
       <Button variant="outline" onClick={() => router.push('/admin/users')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Gestión de Usuarios
      </Button>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center space-x-4 mb-4">
                <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={avatar || undefined} alt={name} data-ai-hint="user avatar" />
                    <AvatarFallback className="text-3xl">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl font-headline flex items-center">
                        <UserCircle2 className="mr-2 h-6 w-6 text-primary" />
                        Editar Perfil de Usuario
                    </CardTitle>
                    <CardDescription>Modifica la información para {userToEdit.name}.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">URL del Avatar (opcional)</Label>
              <Input
                id="avatar"
                value={avatar}
                placeholder="https://placehold.co/128x128.png"
                onChange={(e) => setAvatar(e.target.value)}
                disabled={isSaving}
              />
               <p className="text-xs text-muted-foreground">
                Usa una URL de imagen completa. Por ejemplo: <code>https://placehold.co/128x128.png</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faculty">Facultad</Label>
              <Select value={facultyId} onValueChange={setFacultyId} disabled={isSaving}>
                <SelectTrigger id="faculty">
                  <SelectValue placeholder="Selecciona una facultad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin facultad">Sin facultad</SelectItem>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="professional-school">Escuela Profesional</Label>
              <Select 
                value={professionalSchoolId} 
                onValueChange={setProfessionalSchoolId} 
                disabled={isSaving || !facultyId}
              >
                <SelectTrigger id="professional-school">
                  <SelectValue placeholder={facultyId ? "Selecciona una escuela profesional" : "Primero selecciona una facultad"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin escuela profesional">Sin escuela profesional</SelectItem>
                  {professionalSchools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
                <Label>Rol de Usuario</Label>
                <Input value={userToEdit.role === 'admin' ? 'admin' : 'user'} readOnly disabled className="bg-muted/50"/>
                <p className="text-xs text-muted-foreground">
                El rol se gestiona desde la tabla principal de usuarios.
                </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}