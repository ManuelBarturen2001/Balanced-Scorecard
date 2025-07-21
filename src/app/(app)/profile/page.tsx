"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Save, UserCircle, ShieldQuestion, Lock, AlertCircle, GraduationCap, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFacultyById, getProfessionalSchoolById } from '@/lib/data';
import type { Faculty, ProfessionalSchool } from '@/lib/types';

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserProfile, changePassword, markAsExperienced } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [professionalSchool, setProfessionalSchool] = useState<ProfessionalSchool | null>(null);

  // Verificar si es el primer login
  const isFirstLogin = searchParams.get('firstLogin') === 'true' || user?.isFirstLogin;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user) {
      console.log('user', user);
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.avatar || '');
      
      // Obtener información de facultad y escuela profesional
      if (user.facultyId) {
        const userFaculty = getFacultyById(user.facultyId);
        setFaculty(userFaculty || null);
      }
      
      if (user.professionalSchoolId) {
        const userProfessionalSchool = getProfessionalSchoolById(user.professionalSchoolId);
        setProfessionalSchool(userProfessionalSchool || null);
      }
    }
  }, [user, authLoading, router]);

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
    if (!user) return;
    setIsSaving(true);

    try {
      await updateUserProfile({ name, email, avatar });
      toast({
        title: "Perfil Actualizado",
        description: "Tu información de perfil ha sido actualizada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error al Actualizar",
        description: "No se pudo actualizar tu perfil. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      await changePassword(newPassword);
      
      // Si es el primer login, marcar como usuario experimentado
      if (isFirstLogin) {
        await markAsExperienced();
      }
      
      toast({
        title: "Contraseña Actualizada",
        description: "Tu contraseña ha sido actualizada exitosamente.",
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Si era el primer login, redirigir al dashboard
      if (isFirstLogin) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
      
    } catch (error: any) {
      let errorMessage = "No se pudo actualizar la contraseña. Inténtalo de nuevo.";
      
      if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es muy débil.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Por seguridad, debes volver a iniciar sesión antes de cambiar la contraseña.";
      }
      
      setPasswordError(errorMessage);
      toast({
        title: "Error al Cambiar Contraseña",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  if (authLoading || !user) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-xl mx-auto">
          <CardHeader className="items-center">
             <Skeleton className="h-28 w-28 rounded-full mb-4" />
             <Skeleton className="h-7 w-48 mb-1" />
             <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-36 ml-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 md:py-10">
      {/* Alerta para primer login */}
      {isFirstLogin && (
        <Alert className="max-w-xl mx-auto mb-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Bienvenido/a</strong> - Es tu primer acceso al sistema. Por favor, cambia tu contraseña temporal por una de tu elección.
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-xl mx-auto space-y-6">
        {/* Formulario de perfil */}
        <Card className="shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardHeader className="items-center text-center">
              <Avatar className="h-28 w-28 mb-4 border-2 border-primary shadow-md">
                <AvatarImage src={avatar || undefined} alt={name} data-ai-hint="user avatar" />
                <AvatarFallback className="text-4xl">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-3xl font-headline flex items-center justify-center">
                  <UserCircle className="mr-3 h-8 w-8 text-primary" />
                  Mi Perfil
              </CardTitle>
              <CardDescription>Actualiza tu información personal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre Completo</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
           
              <div className="space-y-2">
                <Label htmlFor="profile-email">Correo Electrónico</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profile-avatar">URL del Avatar (opcional)</Label>
                <Input
                  id="profile-avatar"
                  value={avatar}
                  placeholder="https://placehold.co/128x128.png"
                  onChange={(e) => setAvatar(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Usa una URL de imagen completa. Por ejemplo: <code>https://placehold.co/128x128.png</code>
                </p>
              </div>

              {/* Información académica no editable */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-muted-foreground">Información Académica</h3>
                
                <div className="space-y-2">
                  <Label>Facultad</Label>
                  <div className="flex items-center space-x-2 text-sm p-2.5 bg-muted/50 border border-input rounded-md text-muted-foreground">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span>{faculty ? faculty.name : 'No asignada'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Escuela Profesional</Label>
                  <div className="flex items-center space-x-2 text-sm p-2.5 bg-muted/50 border border-input rounded-md text-muted-foreground">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span>{professionalSchool ? professionalSchool.name : 'No asignada'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                  <Label>Rol</Label>
                  <div className="flex items-center space-x-2 text-sm p-2.5 bg-muted/50 border border-input rounded-md text-muted-foreground">
                      <ShieldQuestion className="h-5 w-5 text-primary" />
                      <span>{user.role === 'admin' ? 'Administrador' : 'Usuario'} (No editable)</span>
                  </div>
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

        {/* Formulario de cambio de contraseña */}
        <Card className="shadow-lg">
          <form onSubmit={handlePasswordChange}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5 text-primary" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>
                {isFirstLogin ? 'Establece una nueva contraseña para tu cuenta.' : 'Actualiza tu contraseña por seguridad.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                  required
                  minLength={6}
                />
              </div>
              {passwordError && (
                <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {passwordError}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isChangingPassword || !newPassword || !confirmPassword}>
                <Lock className="mr-2 h-4 w-4" />
                {isChangingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}