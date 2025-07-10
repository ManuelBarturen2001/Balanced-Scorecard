"use client";

import { AdminGradingTable } from '@/components/admin/grading/AdminGradingTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { indicators as allIndicators, assignedIndicators as initialAssignedIndicators, users } from '@/lib/data';
import type { AssignedIndicator, AssignedVerificationMethod, VerificationStatus } from '@/lib/types';
import { ClipboardCheck, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function AdminGradingPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentAssignments, setCurrentAssignments] = useState<AssignedIndicator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Deep copy to allow modifications
    setCurrentAssignments(JSON.parse(JSON.stringify(initialAssignedIndicators)));
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard'); 
    }
  }, [isAdmin, authLoading, router]);

  const calculateOverallStatus = (methods: AssignedVerificationMethod[]): VerificationStatus => {
    if (methods.length === 0) return 'Pending';
    
    const statuses = methods.map(m => m.status);

    if (statuses.some(s => s === 'Rejected')) return 'Rejected';
    if (statuses.every(s => s === 'Approved')) return 'Approved';
    if (statuses.some(s => s === 'Submitted')) return 'Submitted';
    // If some are Approved and others Pending/Overdue, could be 'In Progress'
    // For now, if not all approved, not rejected, and at least one submitted, it's 'Submitted'.
    // Otherwise, it's 'Pending'.
    const hasPendingOrOverdue = statuses.some(s => s === 'Pending' || s === 'Overdue');
    if (hasPendingOrOverdue && !statuses.some(s => s === 'Submitted')) return 'Pending';

    return 'Pending'; // Default fallback
  };

  const handleGradingUpdate = useCallback((assignmentId: string, updatedMethods: AssignedVerificationMethod[]) => {
    setCurrentAssignments(prevAssignments =>
      prevAssignments.map(asm => {
        if (asm.id === assignmentId) {
          const newOverallStatus = calculateOverallStatus(updatedMethods);
          return { 
            ...asm, 
            assignedVerificationMethods: updatedMethods,
            overallStatus: newOverallStatus 
          };
        }
        return asm;
      })
    );
    toast({
        title: "Calificación Guardada (Mock)",
        description: "La calificación para la asignación ha sido actualizada. Estos cambios son solo para la demostración."
    });
  }, [toast]);

  if (authLoading) {
    return (
      <div className="space-y-6 container mx-auto py-2">
        <div className="flex justify-between items-start">
            <div>
                <Skeleton className="h-8 w-48 rounded-md" />
                <Skeleton className="h-4 w-64 rounded-md mt-2" />
            </div>
        </div>
        <Skeleton className="h-12 w-full rounded-md mb-4" /> {/* For Search */}
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
          <Button onClick={() => router.push('/dashboard')}>Volver al Dashboard</Button>
        </CardContent>
      </Card>
    );
  }
  
  const filteredAssignments = currentAssignments.filter(assignment => {
    const indicator = allIndicators.find(i => i.id === assignment.indicatorId);
    const user = users.find(u => u.id === assignment.userId);
    const lowerSearchTerm = searchTerm.toLowerCase();

    return (
        (indicator?.name.toLowerCase().includes(lowerSearchTerm)) ||
        (user?.name.toLowerCase().includes(lowerSearchTerm)) ||
        (user?.email.toLowerCase().includes(lowerSearchTerm)) ||
        (assignment.overallStatus?.toLowerCase().includes(lowerSearchTerm))
    );
  });


  return (
    <div className="container mx-auto py-1 md:py-2 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold flex items-center">
                <ClipboardCheck className="mr-3 h-7 w-7 text-primary" />
                Panel de Calificación
            </h1>
            <p className="text-muted-foreground mt-1">
                Revisa y califica las asignaciones de indicadores de los usuarios.
            </p>
        </div>
      </div>
      
      <AdminGradingTable 
        onAssignmentUpdate={handleGradingUpdate}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        currentUser={user}
      />
    </div>
  );
}
