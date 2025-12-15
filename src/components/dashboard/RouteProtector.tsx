"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface RouteProtectorProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

/**
 * Componente protector de rutas que valida el rol del usuario
 * Si el usuario no tiene acceso, lo redirecciona a la página anterior
 */
export function RouteProtector({ allowedRoles, children }: RouteProtectorProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      // Verificar si el usuario tiene un rol permitido
      if (user && allowedRoles.includes(user.role)) {
        setIsAuthorized(true);
      } else {
        // Si no está autorizado, redirigir a la página anterior
        setIsAuthorized(false);
        // Usar setTimeout para asegurar que se ejecute después del render
        const timer = setTimeout(() => {
          // Intentar ir atrás en el historial
          window.history.back();
          
          // Si no hay historial previo, redirigir al dashboard principal
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }, 300);

        return () => clearTimeout(timer);
      }
      setIsChecking(false);
    }
  }, [user, authLoading, allowedRoles, router]);

  // Mostrar skeleton mientras se verifica el acceso
  if (authLoading || isChecking) {
    return (
      <div className="space-y-6 container mx-auto py-2">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-2/5 rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md mt-2" />
          </CardHeader>
          <CardContent className="p-0 md:p-2">
            <div className="space-y-2 p-4">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no está autorizado, no mostrar nada (el redirect ya está en progreso)
  if (!isAuthorized) {
    return null;
  }

  // Si está autorizado, mostrar el contenido
  return <>{children}</>;
}
