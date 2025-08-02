"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, AlertCircle, GraduationCap, Shield, BookOpen } from 'lucide-react';
import Image from 'next/image';

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
          description: "¡Bienvenido/a al Sistema Web de Balanced Scorecard!",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <Image
              src="/Img/unmsm.svg"
              alt="Logo Universidad Nacional Mayor de San Marcos"
              width={120}
              height={120}
              className="w-32 h-32 md:w-48 md:h-48 object-contain"
              priority
            />
          </div>
          
          <div className="w-20 md:w-24 h-1 bg-primary mx-auto rounded-full mb-4"></div>
          
          <h1 className="text-lg md:text-xl font-bold text-primary mb-6 whitespace-nowrap">
            Universidad Nacional Mayor de San Marcos
          </h1>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl md:text-2xl font-headline text-primary">
              Iniciar Sesión
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo Institucional
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@unmsm.edu.pe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 border-2 focus:border-primary h-11 md:h-12 bg-background"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 border-2 focus:border-primary h-11 md:h-12 bg-background"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="flex items-center text-sm text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="text-xs md:text-sm">{error}</span>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-11 md:h-12 text-sm md:text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="text-xs md:text-sm">Iniciando sesión...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-xs md:text-sm">Acceder al Sistema</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 text-center">
            <div className="w-full pt-4 border-t border-border/30">
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span className="text-xs">Sistema Web de Balanced Scorecard</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                © 2025 Universidad Nacional Mayor de San Marcos
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}