"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAllUsers, getAllIndicators } from '@/lib/data';
import { getCollection } from '@/lib/firebase-functions';
import type { AssignedIndicator, Indicator, User, VerificationStatus } from '@/lib/types';
import { statusTranslations } from '@/lib/types';
import { Eye } from 'lucide-react';

const statusToColor: Record<VerificationStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
  Overdue: 'bg-orange-100 text-orange-800 border-orange-300',
};

export default function GraderDetailsPage() {
  const params = useParams();
  const graderId = params?.id as string;
  const [users, setUsers] = useState<User[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AssignedIndicator | null>(null);
  const [loading, setLoading] = useState(true);

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
        setAssignments(allAssignments.filter(a => a.jury?.includes(graderId)));
      } finally {
        setLoading(false);
      }
    };
    if (graderId) load();
  }, [graderId]);

  const indicatorById = useMemo<Map<string, Indicator>>(() => new Map(indicators.map((i: Indicator) => [i.id, i])), [indicators]);
  const userById = useMemo<Map<string, User>>(() => new Map(users.map((u: User) => [u.id, u])), [users]);

  type Row = { assignment: AssignedIndicator; responsableName: string; indicatorName: string; overallStatus: VerificationStatus };
  const rows = useMemo<Row[]>(() => assignments.map((a: AssignedIndicator) => ({
    assignment: a,
    responsableName: userById.get(a.userId)?.name || a.userId,
    indicatorName: indicatorById.get(a.indicatorId)?.name || a.indicatorId,
    overallStatus: (a.overallStatus || 'Pending') as VerificationStatus,
  })), [assignments, indicatorById, userById]);

  const graderName = useMemo(() => userById.get(graderId)?.name || graderId, [userById, graderId]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calificador: {graderName}</CardTitle>
          <CardDescription>Responsable • Indicador • Estado Global • Acción</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <ScrollArea className="w-full">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Indicador</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado Global</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r: Row, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap">{r.responsableName}</td>
                        <td className="px-4 py-2">{r.indicatorName}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center rounded border px-2 py-0.5 ${statusToColor[r.overallStatus]}`}>
                            {statusTranslations[r.overallStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelected(r.assignment); setOpen(true); }}>
                            <Eye className="h-4 w-4 mr-1" /> Ver detalles
                          </Button>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Calificaciones del responsable</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">Responsable: <strong>{userById.get(selected.userId)?.name || selected.userId}</strong></div>
                <div className="text-sm">Indicador: <strong>{indicatorById.get(selected.indicatorId)?.name || selected.indicatorId}</strong></div>
                <div className="text-sm">Estado Global: <strong>{statusTranslations[(selected.overallStatus || 'Pending') as VerificationStatus]}</strong></div>
                <div className="border rounded">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left">Método</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.assignedVerificationMethods?.map(m => (
                        <tr key={m.name} className="border-t">
                          <td className="px-3 py-2">{m.name}</td>
                          <td className="px-3 py-2">
                            <Badge className={statusToColor[m.status]}> {statusTranslations[m.status]} </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

