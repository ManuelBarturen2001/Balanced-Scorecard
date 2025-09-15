"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllAssignedIndicators, getAllUsers } from '@/lib/data';
import type { AssignedIndicator, User } from '@/lib/types';
import { Search } from 'lucide-react';

type Row = {
  jury: User;
  responsableName: string;
  indicatorId: string;
  status: string;
};

export function GradersOverviewPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAllUsers().then(setUsers);
    getAllAssignedIndicators().then(setAssignments);
  }, []);

  const juryUsers = useMemo(() => users.filter(u => u.role === 'calificador'), [users]);

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (const a of assignments) {
      for (const juryId of a.jury || []) {
        const jury = users.find(u => u.id === juryId);
        if (jury) {
          result.push({
            jury,
            responsableName: a.responsableName || a.userId,
            indicatorId: a.indicatorId,
            status: a.overallStatus || 'Pendiente',
          });
        }
      }
    }
    return result;
  }, [assignments, users]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const byName = r.jury.name.toLowerCase().includes(search.toLowerCase()) || r.responsableName.toLowerCase().includes(search.toLowerCase());
      const byStatus = !status || r.status.toLowerCase() === status.toLowerCase();
      return byName && byStatus;
    });
  }, [rows, search, status]);

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Calificadores</h1>
          <p className="text-muted-foreground mt-2">Jurados, responsables evaluados y estado: Rechazado, Completo, Pendiente.</p>
        </div>
        <Badge variant="outline">Total registros: {filtered.length}</Badge>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por jurado o responsable" className="pl-8" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="Approved">Completo</SelectItem>
              <SelectItem value="Rejected">Rechazado</SelectItem>
              <SelectItem value="Pending">Pendiente</SelectItem>
              <SelectItem value="Submitted">Presentado</SelectItem>
              <SelectItem value="Overdue">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Jurado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Responsable</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Indicador</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No hay registros con los filtros actuales.</td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={`${r.jury.id}-${idx}`} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">{r.jury.name}</td>
                    <td className="px-4 py-3">{r.responsableName}</td>
                    <td className="px-4 py-3">{r.indicatorId}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.status === 'Approved' ? 'secondary' : r.status === 'Rejected' ? 'destructive' : 'outline'}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

