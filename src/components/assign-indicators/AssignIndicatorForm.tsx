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
import { getAllUsers, getAllIndicators, getAllPerspectives, insertAssignedIndicator, checkExistingAssignment, getAllFaculties, getAllProfessionalSchools } from '@/lib/data';
import type { AssignedIndicator, User, Indicator, Perspective, VerificationMethod, Faculty, ProfessionalSchool } from '@/lib/types';
import { Loader2, PlusCircle, Save, Search, Filter, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// Función para truncar texto
const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

interface AssignIndicatorFormProps {
  users?: User[];
  onAssignmentCreated?: () => void;
}

export function AssignIndicatorForm({ users: propUsers, onAssignmentCreated }: AssignIndicatorFormProps) {
  const { user, isAdmin, isAsignador } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [usersForAssignment, setUsersForAssignment] = useState<User[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [professionalSchools, setProfessionalSchools] = useState<ProfessionalSchool[]>([]);
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
  
  // Filtros para usuarios
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Si se proporcionan usuarios como prop, usarlos
        if (propUsers) {
          setUsers(propUsers);
          setUsersForAssignment(propUsers);
          setIsLoadingUsers(false);
          setIsLoadingUsersForAssignment(false);
        } else {
                  // Fetch users if admin or asignador
        if (isAdmin || isAsignador) {
          console.log('Fetching users for admin/asignador...');
          const [fetchedUsers, fetchedUsersForAssignment] = await Promise.all([
            getAllUsers(), // Para jurados (todos los usuarios)
            getAllUsers() // Para asignación (todos los usuarios elegibles)
          ]);
          console.log('Fetched users:', fetchedUsers);
          console.log('Fetched users for assignment:', fetchedUsersForAssignment);
          setUsers(fetchedUsers);
          setUsersForAssignment(fetchedUsersForAssignment);
        }
        }
        
        // Fetch indicators
        const fetchedIndicators = await getAllIndicators();
        setIndicators(fetchedIndicators);
        
        // Fetch perspectives
        const fetchedPerspectives = await getAllPerspectives();
        setPerspectives(fetchedPerspectives);

        // Fetch faculties and schools
        const [fetchedFaculties, fetchedSchools] = await Promise.all([
          getAllFaculties(),
          getAllProfessionalSchools()
        ]);
        setFaculties(fetchedFaculties);
        setProfessionalSchools(fetchedSchools);
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
  }, [isAdmin, isAsignador, propUsers, toast]);

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

  // Limpiar calificadores cuando cambie el usuario seleccionado
  useEffect(() => {
    if (selectedUserId) {
      setSelectedJuryMembers([]);
      setSelectedJuryMember('');
    }
  }, [selectedUserId]);

  // Filtrar usuarios según el rol del usuario actual y filtros aplicados
  const getFilteredUsers = () => {
    // Usar users en lugar de propUsers
    const usersToFilter = propUsers || users;
    if (!usersToFilter || usersToFilter.length === 0) return [];
    
    let filtered = usersToFilter;
    
    // Si el usuario es asignador o admin, mostrar todos los usuarios elegibles
    if (isAdmin || isAsignador) {
      // Aplicar filtro de búsqueda por nombre
      if (searchTerm) {
        filtered = filtered.filter(u => 
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Aplicar filtro de facultad
      if (selectedFacultyFilter !== 'all') {
        filtered = filtered.filter(u => u.facultyId === selectedFacultyFilter);
      }
      
      // Aplicar filtro de escuela profesional
      if (selectedSchoolFilter !== 'all') {
        filtered = filtered.filter(u => u.professionalSchoolId === selectedSchoolFilter);
      }
      
      return filtered;
    }
    
    // Para usuarios normales, solo mostrar su propio usuario
    return usersToFilter.filter(u => u.id === user?.id);
  };

  // Filtrar calificadores para el jurado según la facultad del usuario asignado
  const getFilteredJuryUsers = () => {
    const usersToFilter = propUsers || users;
    if (!usersToFilter) return [];
    
    // Si no hay usuario seleccionado, mostrar todos los calificadores
    if (!selectedUserId) {
      return usersToFilter.filter(u => u.role === 'calificador');
    }
    
    // Obtener la facultad del usuario seleccionado
    const selectedUser = usersToFilter.find(u => u.id === selectedUserId);
    const selectedUserFaculty = selectedUser?.facultyId;
    
    // Si el usuario seleccionado tiene facultad, filtrar calificadores por esa facultad
    if (selectedUserFaculty) {
      return usersToFilter.filter(u => 
        u.role === 'calificador' && u.facultyId === selectedUserFaculty
      );
    }
    
    // Si no tiene facultad, mostrar todos los calificadores
    return usersToFilter.filter(u => u.role === 'calificador');
  };

  const filteredUsers = getFilteredUsers();
  const filteredJuryUsers = getFilteredJuryUsers();
  
  console.log('Filtered users:', filteredUsers);
  console.log('Filtered jury users:', filteredJuryUsers);

  const handleAddJuryMember = () => {
    if (selectedJuryMember && !selectedJuryMembers.some(member => member.id === selectedJuryMember)) {
      const juryMember = users.find(u => u.id === selectedJuryMember);
      if (juryMember) {
        setSelectedJuryMembers([...selectedJuryMembers, juryMember]);
        setSelectedJuryMember('');
      }
    }
  };

  const handleRemoveJuryMember = (juryMemberId: string) => {
    setSelectedJuryMembers(selectedJuryMembers.filter(member => member.id !== juryMemberId));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFacultyFilter('all');
    setSelectedSchoolFilter('all');
  };

  // Resetear escuela cuando cambie la facultad
  const handleFacultyChange = (facultyId: string) => {
    setSelectedFacultyFilter(facultyId);
    // Si se selecciona una facultad específica, resetear la escuela
    if (facultyId !== 'all') {
      setSelectedSchoolFilter('all');
    }
  };

  const getFacultyName = (facultyId: string) => {
    const faculty = faculties.find(f => f.id === facultyId);
    return faculty?.name || 'Sin facultad';
  };

  const getSchoolName = (schoolId: string) => {
    const school = professionalSchools.find(s => s.id === schoolId);
    return school?.name || 'Sin escuela';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determinar el userId basado en el rol del usuario
    const targetUserId = (isAdmin || isAsignador) ? selectedUserId : (user?.id || '');
    
    if (!targetUserId || !selectedIndicatorId || !selectedPerspectiveId || verificationMethods.length === 0) {
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
      const hasExistingAssignment = await checkExistingAssignment(targetUserId, selectedIndicatorId);

      if (hasExistingAssignment) {
        alert(`Ya existe una asignación del indicador seleccionado para el usuario. No se puede crear una asignación duplicada.`);
        return;
      }

      const selectedDueDate = new Date(dueDate);
      // Asegurarnos de que no se vea afectada por la zona horaria local
      selectedDueDate.setMinutes(selectedDueDate.getMinutes() - selectedDueDate.getTimezoneOffset());

      const newAssignedIndicator: Omit<AssignedIndicator, 'id'> = {
        userId: targetUserId,
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
      clearFilters();
      onAssignmentCreated?.(); // Llamar a la función de callback
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
        <CardDescription>
          {isAsignador 
            ? "Selecciona un usuario, indicador, perspectiva y métodos de verificación. Los calificadores se filtrarán por la facultad del usuario asignado."
            : isAdmin
            ? "Selecciona un usuario, indicador, perspectiva y métodos de verificación. Los calificadores se filtrarán por la facultad del usuario asignado."
            : "Selecciona un indicador, perspectiva y métodos de verificación para autoasignarte."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {(isAdmin || isAsignador) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Usuario</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                </Button>
              </div>

              {/* Filtros */}
              {showFilters && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    {searchTerm && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Facultad</Label>
                      <Select value={selectedFacultyFilter} onValueChange={handleFacultyChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las facultades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las facultades</SelectItem>
                          {faculties.map((faculty) => (
                            <SelectItem key={faculty.id} value={faculty.id}>
                              {faculty.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm">Escuela Profesional</Label>
                      <Select value={selectedSchoolFilter} onValueChange={setSelectedSchoolFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las escuelas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las escuelas</SelectItem>
                          {professionalSchools
                            .filter(school => selectedFacultyFilter === 'all' || school.facultyId === selectedFacultyFilter)
                            .map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {filteredUsers.length} usuarios encontrados
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              )}

              <Select
                onValueChange={setSelectedUserId}
                value={selectedUserId}
                disabled={isLoadingUsersForAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsersForAssignment ? "Cargando usuarios..." : "Selecciona un usuario para asignar el indicador"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{u.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {u.email} • {u.role} • {getFacultyName(u.facultyId || '')} • {getSchoolName(u.professionalSchoolId || '')}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {(isAdmin || isAsignador) && (
                <p className="text-xs text-muted-foreground">
                  Puedes asignar a cualquier usuario. Los calificadores del jurado se filtrarán por la facultad del usuario asignado.
                </p>
              )}
            </div>
          )}

          {!isAdmin && !isAsignador && user && (
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
                      {p.icon && <p.icon className="mr-2 h-4 w-4" />}
                      {truncateText(p.name)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Métodos de Verificación</Label>
            {isLoadingVerificationMethods ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Cargando métodos de verificación...</span>
              </div>
            ) : verificationMethods.length > 0 ? (
              <div className="space-y-2">
                {verificationMethods.map((method, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox id={`method-${index}`} checked={true} disabled />
                    <Label htmlFor={`method-${index}`} className="text-sm">
                      {method}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona un indicador para ver sus métodos de verificación.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Jurado Calificador</Label>
            {!selectedUserId && (isAdmin || isAsignador) && (
              <p className="text-sm text-muted-foreground">
                Primero selecciona un usuario para ver los calificadores disponibles de su facultad.
              </p>
            )}
            <div className="flex gap-2">
              <Select
                onValueChange={setSelectedJuryMember}
                value={selectedJuryMember}
                disabled={isLoadingUsers || filteredJuryUsers.length === 0 || !selectedUserId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    !selectedUserId ? "Selecciona un usuario primero" :
                    isLoadingUsers ? "Cargando usuarios..." : 
                    filteredJuryUsers.length === 0 ? "No hay calificadores disponibles" : 
                    "Selecciona un jurado"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredJuryUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {truncateText(u.name)} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddJuryMember}
                disabled={!selectedJuryMember || isLoadingUsers || !selectedUserId}
                className="px-3"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            {selectedUserId && (
              <p className="text-xs text-muted-foreground">
                Mostrando calificadores de la facultad del usuario seleccionado: {
                  getFacultyName((propUsers || users)?.find(u => u.id === selectedUserId)?.facultyId || '')
                }
              </p>
            )}
          </div>
          
          {selectedJuryMembers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Jurados Seleccionados:</Label>
              <ScrollArea className="h-20 w-full rounded-md border p-2">
                <div className="space-y-1">
                  {selectedJuryMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span>{member.name} ({member.email})</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveJuryMember(member.id)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fecha de Vencimiento</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            {dueDateError && (
              <p className="text-sm text-red-600">{dueDateError}</p>
            )}
          </div>

          <CardFooter className="flex justify-end p-0">
            <Button type="submit" disabled={isLoadingUsers || isLoadingIndicators || isLoadingPerspectives}>
              <Save className="mr-2 h-4 w-4" />
              Asignar Indicador
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
