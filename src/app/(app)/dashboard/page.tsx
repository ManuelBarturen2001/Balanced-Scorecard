"use client"; 

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      // Redirigir según el rol del usuario
      switch (user.role) {
        case 'usuario':
          router.push('/dashboard/usuario');
          break;
        case 'calificador':
          router.push('/dashboard/calificador');
          break;
        case 'asignador':
          router.push('/dashboard/asignador');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        default:
          // Si no tiene rol específico, ir al dashboard de usuario
          router.push('/dashboard/usuario');
          break;
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
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
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
