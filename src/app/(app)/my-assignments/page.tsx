"use client";

import { AssignmentCard } from '@/components/my-assignments/AssignmentCard';
import { AssignmentDetailsModal } from '@/components/my-assignments/AssignmentDetailsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getIndicatorById } from '@/lib/data';
import { getCollectionWhereCondition } from '@/lib/firebase-functions';
import type { AssignedIndicator, MockFile } from '@/lib/types';
import { ClipboardList, Info } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function MyAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [userIndicators, setUserIndicators] = useState<AssignedIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<AssignedIndicator | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        try {
          const allAssignedIndicators = await getCollectionWhereCondition('assigned_indicator', 'userId', user.id);
          setUserIndicators(allAssignedIndicators as AssignedIndicator[]);
        } catch (error) {
          console.error('Error fetching assigned indicators:', error);
          setUserIndicators([]);
        }
        setIsLoading(false);
      } else if (!authLoading && !user) {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading]);

  const handleViewDetails = useCallback((indicator: AssignedIndicator) => {
    setSelectedIndicator(indicator);
    setIsModalOpen(true);
  }, []);

  const handleFileUpload = useCallback(async (assignedIndicatorId: string, verificationMethodName: string, file: File) => {
    setUserIndicators(prevIndicators =>
      prevIndicators.map(ind => {
        if (ind.id === assignedIndicatorId) {
          return {
            ...ind,
            assignedVerificationMethods: ind.assignedVerificationMethods.map(vm => {
              if (vm.name === verificationMethodName) {
                const newFile: MockFile = {
                    name: file.name,
                    url: '#mock-url', 
                    uploadedAt: new Date(),
                    size: file.size,
                    type: file.type,
                };
                return { ...vm, submittedFile: newFile, status: 'Submitted' as const };
              }
              return vm;
            }),
             overallStatus: ind.assignedVerificationMethods.every(vm => vm.status === 'Approved' || (vm.name === verificationMethodName && file)) ? 'Submitted' : ind.overallStatus,
          };
        }
        return ind;
      })
    );

    try {
      const indicator = await getIndicatorById(userIndicators.find(i => i.id === assignedIndicatorId)?.indicatorId || '');
      const methodName = verificationMethodName;

      toast({
        title: "Archivo Subido (Simulado)",
        description: `El archivo "${file.name}" para "${methodName}" en el indicador "${indicator?.name}" ha sido subido teóricamente. Los cambios no persisten en esta demostración.`,
      });
    } catch (error) {
      console.error('Error getting indicator details:', error);
      toast({
        title: "Archivo Subido (Simulado)",
        description: `El archivo "${file.name}" ha sido subido teóricamente. Los cambios no persisten en esta demostración.`,
      });
    }
  }, [toast, userIndicators]);


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-1 md:py-2 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ClipboardList className="h-7 w-7 mr-3 text-primary" />
            <Skeleton className="h-8 w-48 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-3/4 rounded-md mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="shadow-sm">
              <CardHeader>
                <Skeleton className="h-6 w-3/5 rounded-md" />
                <Skeleton className="h-4 w-2/5 rounded-md mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full rounded-md mb-2" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <div className="mt-4 flex justify-end">
                  <Skeleton className="h-10 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
       <Card className="m-auto mt-10 max-w-lg shadow-lg">
        <CardHeader className="items-center text-center">
            <Info className="h-16 w-16 text-primary mb-4" />
          <CardTitle className="font-headline text-2xl">Por favor, Inicia Sesión</CardTitle>
          <CardDescription>Necesitas iniciar sesión para ver tus asignaciones.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => window.location.href = '/login'}>Ir a Iniciar Sesión</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-1 md:py-2 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold flex items-center">
                <ClipboardList className="mr-3 h-7 w-7 text-primary" />
                Mis Asignaciones
            </h1>
            <p className="text-muted-foreground mt-1">
                Visualiza y gestiona tus indicadores asignados y la carga de archivos de verificación.
            </p>
        </div>
      </div>

      {userIndicators.length === 0 ? (
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Sin Asignaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">Actualmente no tienes indicadores asignados.</p>
            <Button variant="link" className="mt-2" onClick={() => window.location.href = '/assign-indicators'}>Asignar Nuevo Indicador</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid">
          {userIndicators.map((indicator,i) => 
            <AssignmentCard
              key={i}
              assignedIndicator={indicator}
              onViewDetails={handleViewDetails}
              onFileUpload={handleFileUpload}
            />
          )}
        </div>
      )}

      {selectedIndicator && (
        <AssignmentDetailsModal
          indicator={selectedIndicator}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
