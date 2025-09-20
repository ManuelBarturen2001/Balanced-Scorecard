"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllUsers, getAllIndicators } from '@/lib/data';
import { getCollection } from '@/lib/firebase-functions';
import type { AssignedIndicator, Indicator, User, VerificationStatus } from '@/lib/types';
import { statusTranslations } from '@/lib/types';
import { Search, Users as UsersIcon, ClipboardList, ChevronRight } from 'lucide-react';

const statusToColor: Record<VerificationStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
  Overdue: 'bg-orange-100 text-orange-800 border-orange-300',
};

export function GradersOverviewPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [allUsers, allIndicators, allAssignments] = await Promise.all([
          getAllUsers(),
          getAllIndicators(),
          getCollection<AssignedIndicator>('assigned_indicator'),
        ]);
        setUsers(allUsers);
        setIndicators(allIndicators);
        setAssignments(allAssignments);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const graders = useMemo<User[]>(() => users.filter((u: User) => u.role === 'calificador'), [users]);
  const indicatorById = useMemo<Map<string, Indicator>>(() => new Map(indicators.map((i: Indicator) => [i.id, i])), [indicators]);
  const userById = useMemo<Map<string, User>>(() => new Map(users.map((u: User) => [u.id, u])), [users]);

  // Construir filas Jurado/Responsable/Indicador/Estado, una por cada par jurado-asignación
  type Row = { jurorName: string; responsableName: string; indicatorName: string; overallStatus: VerificationStatus; jurorId: string };
  const rows = useMemo<Row[]>(() => {
    const base: { jurorId: string; responsableId: string; indicatorId: string; overallStatus: VerificationStatus }[] = assignments.flatMap((a: AssignedIndicator) => (a.jury || []).map((j: string) => ({
      jurorId: j,
      responsableId: a.userId,
      indicatorId: a.indicatorId,
      overallStatus: (a.overallStatus || 'Pending') as VerificationStatus,
    })));
    return base.map((r) => ({
      jurorName: userById.get(r.jurorId)?.name || r.jurorId,
      responsableName: userById.get(r.responsableId)?.name || r.responsableId,
      indicatorName: indicatorById.get(r.indicatorId)?.name || r.indicatorId,
      overallStatus: r.overallStatus,
      jurorId: r.jurorId,
    }));
  }, [assignments, indicatorById, userById]);

  const filteredGraders = useMemo<User[]>(() => {
    const term = search.trim().toLowerCase();
    if (!term) return graders;
    return graders.filter((g: User) => g.name.toLowerCase().includes(term) || g.email.toLowerCase().includes(term));
  }, [graders, search]);

  const countsByGrader = useMemo(() => {
    const map = new Map<string, { total: number; pending: number; submitted: number; approved: number; rejected: number }>();
    for (const g of graders) {
      map.set(g.id, { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0 });
    }
    for (const a of assignments) {
      const st = (a.overallStatus || 'Pending') as VerificationStatus;
      for (const gid of a.jury || []) {
        const entry = map.get(gid) || { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0 };
        entry.total += 1;
        if (st === 'Pending' || st === 'Overdue') entry.pending += 1;
        if (st === 'Submitted') entry.submitted += 1;
        if (st === 'Approved') entry.approved += 1;
        if (st === 'Rejected') entry.rejected += 1;
        map.set(gid, entry);
      }
    }
    return map;
  }, [assignments, graders]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">Cargando...</div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Gestión de Calificadores
          </CardTitle>
          <CardDescription>Listado de jurados y asignaciones asociadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar calificador por nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredGraders.map((g: User) => {
              const c = countsByGrader.get(g.id) || { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0 };
              return (
                <Card key={g.id} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <CardDescription className="truncate">{g.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="border-muted-foreground/30">Total: {c.total}</Badge>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">Presentado: {c.submitted}</Badge>
                      <Badge className="bg-green-100 text-green-800 border-green-300">Completado: {c.approved}</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente: {c.pending}</Badge>
                      <Badge className="bg-red-100 text-red-800 border-red-300">Rechazado: {c.rejected}</Badge>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/graders/${g.id}`}>
                        Ver detalles <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Asignaciones por jurado
          </CardTitle>
          <CardDescription>Tabla: Jurado, Responsable, Indicador, Estado</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <ScrollArea className="w-full">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jurado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Indicador</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r: Row, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link href={`/admin/graders/${r.jurorId}`} className="text-primary hover:underline">{r.jurorName}</Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.responsableName}</td>
                      <td className="px-4 py-2">{r.indicatorName}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded border px-2 py-0.5 ${statusToColor[r.overallStatus]}`}>
                          {statusTranslations[r.overallStatus]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Sin asignaciones</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GradersOverviewPage;

