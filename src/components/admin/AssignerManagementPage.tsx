
"use client";
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, AssignedIndicator, Faculty, Perspective, ProfessionalSchool, Office } from '@/lib/types';
import { UserIcon } from 'lucide-react';
import { getAssigners, getAllAssignedIndicators, getUserById, getFacultyById, getPerspectiveById, getAllFaculties, getAllProfessionalSchools, getAllOffices, getAllUsers } from '@/lib/data';


export default function AssignerManagementPage() {
  const [assigners, setAssigners] = useState<User[]>([]);
  const [filteredAssigners, setFilteredAssigners] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [faculty, setFaculty] = useState('');
  const [office, setOffice] = useState('');
  const [selectedAssigner, setSelectedAssigner] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<any[]>([]);
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterName, setFilterName] = useState('');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [schools, setSchools] = useState<ProfessionalSchool[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  // Cargar catálogos para los selects
  useEffect(() => {
    setFaculties(getAllFaculties());
    setSchools(getAllProfessionalSchools());
    setOffices(getAllOffices());
    getAllUsers().then(setUsers);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);

  // Función para formatear fechas
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return '-';
    }
  };

  // Función para determinar la variante del Badge según el estado
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'completado':
        return 'secondary';
      case 'in progress':
      case 'en progreso':
        return 'default';
      case 'pending':
      case 'pendiente':
        return 'outline';
      case 'overdue':
      case 'vencido':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    getAssigners().then(setAssigners);
  }, []);

  useEffect(() => {
    let filtered = assigners;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchLower) || 
        a.email.toLowerCase().includes(searchLower)
      );
    }
    if (faculty && faculty !== 'all') {
      filtered = filtered.filter(a => a.facultyId === faculty);
    }
    if (office && office !== 'all') {
      filtered = filtered.filter(a => a.officeId === office);
    }
    setFilteredAssigners(filtered);
  }, [search, faculty, office, assigners]);

  const handleViewDetails = async (assigner: User) => {
    setSelectedAssigner(assigner);
    setModalOpen(true);
    // Obtener todas las asignaciones y filtrar por asignador
    const allAssigned: AssignedIndicator[] = await getAllAssignedIndicators();
    // Si tienes el campo assignerId, usa esto:
    // const filtered = allAssigned.filter(a => a.assignerId === assigner.id);
    // Si NO tienes assignerId, no se puede saber a quién asignó cada asignador, a menos que lo agregues en el futuro.
    // Por ahora, simulemos que el campo existe o muestra todas las asignaciones (debes agregar assignerId en el futuro para trazabilidad real).
    const filtered = allAssigned.filter(a => (a as any).assignerId === assigner.id);
    // Obtener datos reales de responsables, perspectiva y facultad
    const mapped = await Promise.all(filtered.map(async (a) => {
      const responsable = await getUserById(a.userId);
      const perspective = a.perspectiveId ? await getPerspectiveById(a.perspectiveId) : undefined;
      const faculty = responsable?.facultyId ? getFacultyById(responsable.facultyId) : undefined;
      const school = responsable?.professionalSchoolId ? schools.find(s => s.id === responsable.professionalSchoolId) : undefined;
      const office = responsable?.officeId ? offices.find(o => o.id === responsable.officeId) : undefined;
      // Mostrar nombres de jurados
      let juradoNombres = '-';
      if (a.jury && a.jury.length > 0) {
        juradoNombres = a.jury.map((jid: string) => {
          const jurado = users.find(u => u.id === jid);
          return jurado ? jurado.name : jid;
        }).join(', ');
      }
      return {
        responsableName: responsable?.name || 'Nombre no disponible',
        perspective: perspective?.name || 'No especificado',
        faculty: faculty?.name || 'No tiene facultad',
        school: school?.name || '-',
        office: office?.name || 'No tiene oficina',
        jurado: juradoNombres,
        dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '-',
        status: a.overallStatus || 'Pendiente',
      };
    }));
    setAssignments(mapped);
    setFilteredAssignments(mapped);
  };

  // Filtros en el modal
  useEffect(() => {
    let filtered = assignments;
    if (filterFaculty && filterFaculty !== 'all') {
      const faculty = faculties.find(f => f.id === filterFaculty);
      filtered = filtered.filter(a => a.faculty === faculty?.name);
    }
    if (filterSchool && filterSchool !== 'all') {
      const school = schools.find(s => s.id === filterSchool);
      filtered = filtered.filter(a => a.school === school?.name);
    }
    if (filterOffice && filterOffice !== 'all') {
      const office = offices.find(o => o.id === filterOffice);
      filtered = filtered.filter(a => a.office === office?.name);
    }
    if (filterName && filterName !== 'all') {
      filtered = filtered.filter(a => a.responsableName === filterName);
    }
    setFilteredAssignments(filtered);
  }, [filterFaculty, filterSchool, filterOffice, filterName, assignments, faculties, schools, offices]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Asignadores</h1>
          <p className="text-muted-foreground mt-2">
            Administra y visualiza los asignadores y sus indicadores asignados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Total: {filteredAssigners.length} asignadores
          </Badge>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Filtros de búsqueda</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <Input 
              placeholder="Buscar por nombre o email" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Facultad</label>
            <Select value={faculty} onValueChange={setFaculty}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por facultad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las facultades</SelectItem>
                {faculties.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Oficina</label>
            <Select value={office} onValueChange={setOffice}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por oficina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las oficinas</SelectItem>
                {offices.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssigners.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="mx-auto w-fit p-4 rounded-full bg-muted">
              <UserIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No se encontraron asignadores</h3>
            <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          filteredAssigners.map(assigner => (
            <Card key={assigner.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{assigner.name}</h3>
                    <p className="text-sm text-muted-foreground">{assigner.email}</p>
                  </div>
                  {assigner.facultyId && (
                    <Badge variant="outline">
                      {faculties.find(f => f.id === assigner.facultyId)?.shortName || 'Sin facultad'}
                    </Badge>
                  )}
                </div>
                {assigner.officeId && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {offices.find(o => o.id === assigner.officeId)?.name}
                  </p>
                )}
              </div>
              <div className="border-t bg-muted/50 p-4">
                <Button 
                  onClick={() => handleViewDetails(assigner)}
                  className="w-full"
                >
                  Ver Detalles
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-primary" />
            Asignaciones de {selectedAssigner?.name}
          </DialogTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 mt-2">
            <Select value={filterName} onValueChange={setFilterName}>
              <SelectTrigger><SelectValue placeholder="Filtrar por responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los responsables</SelectItem>
                {Array.from(new Set(assignments.map(a => a.responsableName))).map(name => (
                  <SelectItem key={name} value={name || 'no-name'}>{name || 'Sin nombre'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterFaculty} onValueChange={setFilterFaculty}>
              <SelectTrigger><SelectValue placeholder="Filtrar por facultad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las facultades</SelectItem>
                {faculties.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger><SelectValue placeholder="Filtrar por escuela" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las escuelas</SelectItem>
                {schools
                  .filter(s => !filterFaculty || s.facultyId === filterFaculty)
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            <Select value={filterOffice} onValueChange={setFilterOffice}>
              <SelectTrigger><SelectValue placeholder="Filtrar por oficina" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las oficinas</SelectItem>
                {offices.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-hidden rounded-md border bg-background">
            <div className="overflow-y-auto h-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Perspectiva</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Facultad</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Oficina</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jurado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha de Vencimiento</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        No se encontraron asignaciones con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((asig, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{asig.responsableName}</td>
                        <td className="px-4 py-3">{asig.perspective}</td>
                        <td className="px-4 py-3">{asig.faculty || 'No tiene facultad'}</td>
                        <td className="px-4 py-3">{asig.office || 'No tiene oficina'}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={asig.jurado}>{asig.jurado}</td>
                        <td className="px-4 py-3">{asig.dueDate ? formatDate(asig.dueDate) : '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusVariant(asig.status)}>{asig.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
