"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: "Inicio de Sesión Exitoso",
          description: "¡Bienvenido/a de nuevo!",
        });
        
        // Verificar si es el primer login del usuario
        if (user?.isFirstLogin) {
          toast({
            title: "Bienvenido",
            description: "Es tu primer acceso. Te redirigiremos a tu perfil para que cambies tu contraseña.",
            duration: 4000,
          });
          router.push('/profile?firstLogin=true');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError('Correo electrónico o contraseña no válidos. Intenta con alice@example.com o bob@example.com (cualquier contraseña).');
        toast({
          title: "Fallo en Inicio de Sesión",
          description: "Correo electrónico o contraseña no válidos.",
          variant: "destructive",
        });
      }

    } catch (err: any) {
      setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
      toast({
        title: "Error de Autenticación",
        description: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center">
         <div className="mx-auto mb-4 h-16 w-16 relative" data-ai-hint="abstract logo">
            <svg viewBox="0 0 100 100" fill="currentColor" className="text-primary h-full w-full">
                <path d="M50,5 A20,20 0 0,0 50,45 A20,20 0 0,0 50,5 M25,25 A20,20 0 0,1 75,25 M25,75 A20,20 0 0,0 75,75 M50,55 A20,20 0 0,1 50,95 A20,20 0 0,1 50,55" stroke="currentColor" strokeWidth="5" fill="none" />
                <circle cx="50" cy="50" r="10" />
            </svg>
        </div>
        <CardTitle className="text-3xl font-headline text-primary">Iniciar Sesión en GoalTracker</CardTitle>
        <CardDescription>Accede a tu panel de gestión de objetivos institucionales.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            {!isLoading && <LogIn className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center text-sm">
        <p className="text-muted-foreground">Usa credenciales de prueba como alice@example.com (admin) o bob@example.com (usuario).</p>
      </CardFooter>
    </Card>
  );
}