"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getAllUsers } from '@/lib/data';
import type { User } from '@/lib/types';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users as UsersIcon, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


export default function AdminUsersPage() {
  const { isAdmin, loading: authLoading, user: currentUser } = useAuth();
  const router = useRouter();
  const [currentUsers, setCurrentUsers] = useState<User[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const users = await getAllUsers();
        setCurrentUsers(users);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Error al cargar los usuarios. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);


  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard'); 
    }
  }, [isAdmin, authLoading, router]);

  const handleUserUpdate = useCallback((userId: string, updates: Partial<User>) => {
    setCurrentUsers(prevUsers =>
      prevUsers.map(u => (u.id === userId ? { ...u, ...updates } : u))
    );
  }, []);

  const handleUserDelete = useCallback((userId: string) => {
    if (currentUser?.id === userId) {
        alert("Para fines de demostración, no puedes desactivar tu propia cuenta de administrador.");
        return;
    }
    setCurrentUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  }, [currentUser]);


  if (authLoading || loading) {
    return (
      <div className="space-y-6 container mx-auto py-2">
        <div className="flex justify-between items-start">
            <div>
                <Skeleton className="h-8 w-48 rounded-md" />
                <Skeleton className="h-4 w-64 rounded-md mt-2" />
            </div>
            <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" /> 
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="m-auto mt-10 max-w-lg shadow-lg">
        <CardHeader className="items-center text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <CardTitle className="font-headline text-2xl">Acceso Denegado</CardTitle>
          <CardDescription>No tienes privilegios de administrador para ver esta página.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => router.push('/dashboard')}>Volver al Panel Principal</Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="m-auto mt-10 max-w-lg shadow-lg">
        <CardHeader className="items-center text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <CardTitle className="font-headline text-2xl">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-1 md:py-2 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold flex items-center">
                <UsersIcon className="mr-3 h-7 w-7 text-primary" />
                Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-1">
                Ver, gestionar y actualizar cuentas de usuario. (Acciones simuladas)
            </p>
        </div>
        <Button onClick={() => router.push('/admin/users/manage/create')} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Nuevo Usuario
        </Button>
      </div>
      <UserManagementTable users={currentUsers} onUserUpdate={handleUserUpdate} onUserDelete={handleUserDelete} />
    </div>
  );
}
