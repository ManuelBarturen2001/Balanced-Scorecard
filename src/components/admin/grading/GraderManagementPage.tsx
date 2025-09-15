"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllAssignedIndicators, getAllUsers } from '@/lib/data';
import type { AssignedIndicator, User, VerificationStatus } from '@/lib/types';
import { FileCheck, Search, Users as UsersIcon } from 'lucide-react';

interface JuryWithStats {
  juryUser: User;
  totalAssignments: number;
  completed: number;
  pending: number;
  rejected: number;
}

export function GraderManagementPage() {
  const { isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [search, setSearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | VerificationStatus>('');
  const [selectedJury, setSelectedJury] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    getAllUsers().then(setAllUsers);
    getAllAssignedIndicators().then(setAssignments);
  }, []);

  const juryUsers = useMemo(() => allUsers.filter(u => u.role === 'calificador'), [allUsers]);

  const juryWithStats = useMemo<JuryWithStats[]>(() => {
    return juryUsers.map(jury => {
      const related = assignments.filter(a => a.jury?.includes(jury.id));
      const totalAssignments = related.length;
      const completed = related.filter(a => a.overallStatus === 'Approved').length;
      const rejected = related.filter(a => a.overallStatus === 'Rejected').length;
      const pending = related.filter(a => a.overallStatus !== 'Approved' && a.overallStatus !== 'Rejected').length;
      return { juryUser: jury, totalAssignments, completed, pending, rejected };
    });
  }, [assignments, juryUsers]);

  const filteredJury = useMemo(() => {
    return juryWithStats.filter(j => {
      const byName = j.juryUser.name.toLowerCase().includes(search.toLowerCase());
      const byFaculty = !facultyFilter || j.juryUser.facultyId === facultyFilter;
      const byStatus = !statusFilter || j.pending > 0 && statusFilter === 'Pending' || j.completed > 0 && statusFilter === 'Approved' || j.rejected > 0 && statusFilter === 'Rejected';
      return byName && byFaculty && byStatus;
    });
  }, [juryWithStats, search, facultyFilter, statusFilter]);

  const openDetails = (jury: User) => {
    setSelectedJury(jury);
    setDetailsOpen(true);
  };

  const juryAssignments = useMemo(() => {
    if (!selectedJury) return [] as AssignedIndicator[];
    return assignments.filter(a => a.jury?.includes(selectedJury.id));
  }, [assignments, selectedJury]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Calificaciones</h1>
          <p className="text-muted-foreground mt-2">Lista de jurados y sus calificaciones asignadas a responsables.</p>
        </div>
        <Badge variant="outline" className="text-sm">Total jurados: {filteredJury.length}</Badge>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jurado por nombre" className="pl-8" />
          </div>
          <Select value={facultyFilter} onValueChange={setFacultyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por facultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {Array.from(new Set(allUsers.map(u => u.facultyId).filter(Boolean) as string[])).map(fid => (
                <SelectItem key={fid} value={fid}>{fid}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="Pending">Pendiente</SelectItem>
              <SelectItem value="Approved">Completo</SelectItem>
              <SelectItem value="Rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJury.map(({ juryUser, totalAssignments, completed, pending, rejected }) => (
          <Card key={juryUser.id} className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{juryUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{juryUser.email}</p>
                </div>
                <UsersIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">Total: {totalAssignments}</Badge>
                <Badge variant="secondary">Completo: {completed}</Badge>
                <Badge variant="outline">Pendiente: {pending}</Badge>
                <Badge variant="destructive">Rechazado: {rejected}</Badge>
              </div>
            </div>
            <div className="border-t bg-muted/50 p-4">
              <Button onClick={() => openDetails(juryUser)} className="w-full">
                Ver detalles
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Calificaciones de {selectedJury?.name}
          </DialogTitle>

          <div className="flex-1 overflow-hidden rounded-md border bg-background">
            <ScrollArea className="h-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Responsable</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Indicador</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado Global</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Jurado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {juryAssignments.map(a => (
                    <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">{a.responsableName || a.userId}</td>
                      <td className="px-4 py-3">{a.indicatorId}</td>
                      <td className="px-4 py-3">
                        <Badge variant={a.overallStatus === 'Approved' ? 'secondary' : a.overallStatus === 'Rejected' ? 'destructive' : 'outline'}>
                          {a.overallStatus || 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(a.jury || []).length} jurado(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

