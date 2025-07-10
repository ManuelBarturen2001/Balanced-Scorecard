"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getAllUsers, getAllIndicators, getAllPerspectives, insertAssignedIndicator, checkExistingAssignment, getAllUsersExceptCurrent } from '@/lib/data';
import type { AssignedIndicator, User, Indicator, Perspective, VerificationMethod } from '@/lib/types';
import { Loader2, PlusCircle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

// Función para truncar texto
const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export function AssignIndicatorForm() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [usersForAssignment, setUsersForAssignment] = useState<User[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [verificationMethods, setVerificationMethods] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingUsersForAssignment, setIsLoadingUsersForAssignment] = useState(true);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(true);
  const [isLoadingPerspectives, setIsLoadingPerspectives] = useState(true);
  const [isLoadingVerificationMethods, setIsLoadingVerificationMethods] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('');
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState('');
  const [selectedJuryMember, setSelectedJuryMember] = useState('');
  const [selectedJuryMembers, setSelectedJuryMembers] = useState<User[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [dueDateError, setDueDateError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users if admin
        if (isAdmin) {
          const [fetchedUsers, fetchedUsersForAssignment] = await Promise.all([
            getAllUsers(), // Para jurados (todos los usuarios)
            getAllUsersExceptCurrent(user?.id || '') // Para asignación (excluyendo usuario actual)
          ]);
          setUsers(fetchedUsers);
          setUsersForAssignment(fetchedUsersForAssignment);
        }
        
        // Fetch indicators
        const fetchedIndicators = await getAllIndicators();
        setIndicators(fetchedIndicators);
        
        // Fetch perspectives
        const fetchedPerspectives = await getAllPerspectives();
        setPerspectives(fetchedPerspectives);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, intenta de nuevo.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingUsersForAssignment(false);
        setIsLoadingIndicators(false);
        setIsLoadingPerspectives(false);
      }
    };

    fetchData();
  }, [isAdmin, user?.id, toast]);

  // Fetch verification methods when indicator changes
  useEffect(() => {
    if (!selectedIndicatorId) {
      setVerificationMethods([]);
      return;
    }
    setIsLoadingVerificationMethods(true);
    try {
      const selectedIndicator = indicators.find(i => i.id === selectedIndicatorId);
      setVerificationMethods(selectedIndicator?.verificationMethods || []);
    } catch (error) {
      console.error('Error setting verification methods:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de verificación. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVerificationMethods(false);
    }
  }, [selectedIndicatorId, indicators, toast]);

  // Filtrar usuarios disponibles para jurado (excluyendo los ya seleccionados)
  const availableJuryMembers = users.filter(user => 
    !selectedJuryMembers.some(selected => selected.id === user.id)
  );

  const handleAddJuryMember = () => {
    if (selectedJuryMember && !selectedJuryMembers.some(member => member.id === selectedJuryMember)) {
      const juryMember = users.find(user => user.id === selectedJuryMember);
      if (juryMember) {
        setSelectedJuryMembers(prev => [...prev, juryMember]);
        setSelectedJuryMember('');
      }
    }
  };

  const handleRemoveJuryMember = (juryMemberId: string) => {
    setSelectedJuryMembers(prev => prev.filter(member => member.id !== juryMemberId));
  };

  // Validación reactiva de la fecha de vencimiento
  useEffect(() => {
    if (dueDate) {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Comparación justa por día
      
      if (selectedDate < today) {
        setDueDateError('La fecha de vencimiento no puede ser anterior a hoy.');
      } else {
        setDueDateError('');
      }
    } else {
      setDueDateError('');
    }
  }, [dueDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId || !selectedIndicatorId || !selectedPerspectiveId || verificationMethods.length === 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos y asegúrate de que el indicador tenga métodos de verificación.",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate || dueDateError) {
      toast({
        title: "Error",
        description: dueDateError || "Por favor selecciona una fecha de vencimiento válida.",
        variant: "destructive",
      });
      return;
    }

    if (selectedJuryMembers.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos un jurado para calificar la asignación.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verificar si ya existe una asignación para este usuario e indicador
      const hasExistingAssignment = await checkExistingAssignment(selectedUserId, selectedIndicatorId);

      if (hasExistingAssignment) {
        alert(`Ya existe una asignación del indicador seleccionado para el usuario. No se puede crear una asignación duplicada.`);
        return;
      }

      const selectedDueDate = new Date(dueDate);

      const newAssignedIndicator: Omit<AssignedIndicator, 'id'> = {
        userId: selectedUserId,
        indicatorId: selectedIndicatorId,
        perspectiveId: selectedPerspectiveId,
        assignedDate: new Date(),
        dueDate: selectedDueDate,
        assignedVerificationMethods: verificationMethods.map((method) => ({
          name: method,
          status: 'Pending',
          dueDate: selectedDueDate,
          notes: ''
        })),
        overallStatus: 'Pending',
        jury: selectedJuryMembers.map(member => member.id)
      };

      const docId = await insertAssignedIndicator(newAssignedIndicator);
      
      toast({
        title: "Indicador Asignado Exitosamente",
        description: `El indicador ha sido asignado y guardado en la base de datos con ID: ${docId}`,
      });

      // Reset form
      setSelectedUserId('');
      setSelectedIndicatorId('');
      setSelectedPerspectiveId('');
      setVerificationMethods([]);
      setSelectedJuryMembers([]);
      setSelectedJuryMember('');
      setDueDate('');
    } catch (error) {
      console.error('Error assigning indicator:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el indicador. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-border">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <PlusCircle className="mr-2 h-6 w-6 text-primary" />
          Asignar Nuevo Indicador
        </CardTitle>
        <CardDescription>Selecciona un usuario, indicador, perspectiva y métodos de verificación para asignar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isAdmin && (
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select
                onValueChange={setSelectedUserId}
                value={selectedUserId}
                disabled={isLoadingUsersForAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsersForAssignment ? "Cargando usuarios..." : "Selecciona un usuario para asignar el indicador"} />
                </SelectTrigger>
                <SelectContent>
                  {usersForAssignment.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {truncateText(u.name)} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isAdmin && user && (
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input 
                type="text" 
                value={user.name} 
                readOnly 
                disabled 
                className="bg-muted/30 border-border" 
              />
              <p className="text-sm text-muted-foreground">Los indicadores te serán asignados a ti.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Indicador</Label>
            <Select
              onValueChange={setSelectedIndicatorId}
              value={selectedIndicatorId}
              disabled={isLoadingIndicators}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingIndicators ? "Cargando indicadores..." : "Selecciona un indicador institucional"} />
              </SelectTrigger>
              <SelectContent>
                {indicators.map((i,index) => (
                  <SelectItem key={index} value={i.id}>{truncateText(i.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Perspectiva</Label>
            <Select
              onValueChange={setSelectedPerspectiveId}
              value={selectedPerspectiveId}
              disabled={isLoadingPerspectives}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingPerspectives ? "Cargando perspectivas..." : "Selecciona una perspectiva estratégica"} />
              </SelectTrigger>
              <SelectContent>
                {perspectives.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center">
                      {p.icon && <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                      {truncateText(p.name)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Vencimiento</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className={dueDateError ? "border-red-500" : ""}
            />
            {dueDateError ? (
              <p className="text-sm text-red-500">
                {dueDateError}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Fecha límite para completar todos los métodos de verificación.
              </p>
            )}
          </div>

          {selectedIndicatorId && (
            <div className="space-y-2">
              <Label className="text-base font-medium">Métodos de Verificación</Label>
              <p className="text-sm text-muted-foreground">
                Métodos de verificación disponibles para el indicador seleccionado.
              </p>
              {isLoadingVerificationMethods ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando métodos de verificación...</span>
                </div>
              ) : verificationMethods.length > 0 ? (
                <div className="space-y-2">
                  {verificationMethods.map((vm,index) => (
                    <div
                      key={index}
                      className="rounded-md border border-input bg-card p-3 shadow-sm"
                    >
                      <div className="font-medium">{vm}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-input bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay métodos de verificación disponibles para este indicador.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-base font-medium">Jurados para Calificación</Label>
            <p className="text-sm text-muted-foreground">
              Selecciona los usuarios que calificarán esta asignación.
            </p>
            <div className="flex gap-2">
              <Select
                onValueChange={setSelectedJuryMember}
                value={selectedJuryMember}
                disabled={isLoadingUsers || availableJuryMembers.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isLoadingUsers ? "Cargando usuarios..." : availableJuryMembers.length === 0 ? "No hay más usuarios disponibles" : "Selecciona un jurado"} />
                </SelectTrigger>
                <SelectContent>
                  {availableJuryMembers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {truncateText(u.name)} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                onClick={handleAddJuryMember}
                disabled={!selectedJuryMember || isLoadingUsers}
                className="px-4"
              >
                Agregar
              </Button>
            </div>
            
            {selectedJuryMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Jurados Seleccionados:</Label>
                <div className="space-y-2">
                  {selectedJuryMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border border-input bg-card p-3 shadow-sm"
                    >
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveJuryMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <CardFooter className="p-0 pt-6">
            <Button type="submit" className="w-full md:w-auto" disabled={!selectedIndicatorId || verificationMethods.length === 0 || !selectedPerspectiveId || selectedJuryMembers.length === 0 || !dueDate || !!dueDateError}>
              <Save className="mr-2 h-4 w-4" />
              Asignar Indicador
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
