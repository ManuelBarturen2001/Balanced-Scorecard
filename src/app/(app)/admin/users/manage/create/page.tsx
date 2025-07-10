"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Save, UserPlus } from "lucide-react";
import { createUser } from "@/lib/data";
import type { UserRole } from "@/lib/types";

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [isSaving, setIsSaving] = useState(false);

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
      await createUser({ name, email, avatar, role }, password);
      toast({
        title: "Usuario creado",
        description: "El nuevo usuario ha sido creado exitosamente.",
      });
      router.push("/admin/users");
    } catch (error: any) {
      let errorMessage = "No se pudo crear el usuario. Inténtalo de nuevo.";
      
      // Manejar errores específicos de Firebase Auth
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "El correo electrónico ya está en uso.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El correo electrónico no es válido.";
      }
      
      toast({
        title: "Error al crear usuario",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 md:py-10">
      <Card className="max-w-xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader className="items-center text-center">
            <Avatar className="h-28 w-28 mb-4 border-2 border-primary shadow-md">
              <AvatarImage src={avatar || undefined} alt={name} />
              <AvatarFallback className="text-4xl">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-headline flex items-center justify-center">
              <UserPlus className="mr-3 h-8 w-8 text-primary" />
              Crear Nuevo Usuario
            </CardTitle>
            <CardDescription>Completa la información para crear un nuevo usuario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre Completo</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Correo Electrónico</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving}
                required
                className={email && !isValidEmail(email) ? "border-red-500" : ""}
              />
              {email && !isValidEmail(email) && (
                <p className="text-xs text-red-500">Ingresa un correo electrónico válido.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Contraseña</Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSaving}
                required
                className={password && !isValidPassword(password) ? "border-red-500" : ""}
              />
              {password && !isValidPassword(password) && (
                <p className="text-xs text-red-500">La contraseña debe tener al menos 6 caracteres.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-confirm-password">Confirmar Contraseña</Label>
              <Input
                id="user-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSaving}
                required
                className={confirmPassword && !passwordsMatch ? "border-red-500" : ""}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-avatar">URL del Avatar (opcional)</Label>
              <Input
                id="user-avatar"
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
              <Label htmlFor="user-role">Rol</Label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSaving}
                className="w-full border rounded-md p-2"
                required
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSaving || !isFormValid}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Guardando..." : "Crear Usuario"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 