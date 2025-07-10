"use client";

import { Accordion } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAllIndicators, getAllUsers } from '@/lib/data';
import { getCollectionWhereArrayContains } from '@/lib/firebase-functions';
import type { AssignedIndicator, Indicator, User, AssignedVerificationMethod, VerificationStatus } from '@/lib/types';
import { Search } from 'lucide-react';
import { GradingAssignmentAccordionItem } from './GradingAssignmentAccordionItem';
import { useEffect, useState, useCallback } from 'react';

interface AdminGradingTableProps {
  currentUser: User | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onAssignmentUpdate: (assignmentId: string, updatedMethods: AssignedVerificationMethod[]) => void;
}

export function AdminGradingTable({ currentUser, searchTerm, onSearchTermChange, onAssignmentUpdate }: AdminGradingTableProps) {
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        // Obtener asignaciones donde el usuario actual está en el array jury
        const assignmentsData = await getCollectionWhereArrayContains('assigned_indicator', 'jury', currentUser.id);
        const [indicatorsData, usersData] = await Promise.all([
          getAllIndicators(),
          getAllUsers()
        ]);
        
        setAssignments(assignmentsData as AssignedIndicator[]);
        setIndicators(indicatorsData);
        setUsersList(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);
  
  const handleAssignmentUpdate = useCallback((assignmentId: string, updatedMethods: AssignedVerificationMethod[], newOverallStatus: VerificationStatus) => {
    setAssignments(prevAssignments =>
      prevAssignments.map(asm => {
        if (asm.id === assignmentId) {
          return { 
            ...asm, 
            assignedVerificationMethods: updatedMethods,
            overallStatus: newOverallStatus 
          };
        }
        return asm;
      })
    );
    // Call the parent's onAssignmentUpdate
    onAssignmentUpdate(assignmentId, updatedMethods);
  }, [onAssignmentUpdate]);

  const getIndicatorName = (id: string) => indicators.find(i => i.id === id)?.name || 'N/A';
  const getUserName = (id: string) => usersList.find(u => u.id === id)?.name || 'N/A';
  const getIndicatorById = (id: string) => indicators.find(i => i.id === id);

  const filteredAssignments = assignments.filter(a => {
    const indicator = getIndicatorName(a.indicatorId).toLowerCase();
    const user = getUserName(a.userId).toLowerCase();
    const status = (a.overallStatus || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return indicator.includes(term) || user.includes(term) || status.includes(term);
  });

  return (
    <Card className="shadow-lg border-border">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Listado de Asignaciones</CardTitle>
        <CardDescription>Busca y expande una asignación para calificar los métodos de verificación.</CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por indicador, usuario, estado..."
            className="w-full pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-2">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Cargando asignaciones...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No se encontraron asignaciones {searchTerm ? 'con los criterios de búsqueda.' : 'pendientes.'}
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredAssignments.map((assignment) => (
              <GradingAssignmentAccordionItem
                key={assignment.id}
                assignment={assignment}
                indicator={getIndicatorById(assignment.indicatorId)!}
                indicatorName={getIndicatorName(assignment.indicatorId)}
                userName={getUserName(assignment.userId)}
                onUpdate={handleAssignmentUpdate}
                currentUser={currentUser}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
