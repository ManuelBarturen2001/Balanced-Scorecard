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
import { Eye, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const statusToColor: Record<VerificationStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
  Overdue: 'bg-orange-100 text-orange-800 border-orange-300',
};

export default function GraderDetailsPage() {
  const router = useRouter();
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
    <div className="container mx-auto py-4 space-y-4">
      {/* Header con botón de regreso */}
      <div className="flex items-center gap-4 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Calificador: {graderName}</h1>
          <p className="text-muted-foreground text-sm">
            Listado de jurados y asignaciones asociadas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Asignaciones por jurado</CardTitle>
          <CardDescription>Tabla: Jurado, Responsable, Indicador, Estado</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ScrollArea className="w-full">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">Jurado</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">Responsable</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">Indicador</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground border-b">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30">
                    {rows.map((r: Row, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{graderName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{r.responsableName}</td>
                        <td className="px-4 py-3">{r.indicatorName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${statusToColor[r.overallStatus]}`}>
                            {statusTranslations[r.overallStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" onClick={() => { setSelected(r.assignment); setOpen(true); }}>
                            <Eye className="h-4 w-4 mr-1" /> Ver detalles
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Sin asignaciones para este calificador
                        </td>
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
          <div className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Sin datos</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Responsable:</span>
                    <div className="font-medium">{userById.get(selected.userId)?.name || selected.userId}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Indicador:</span>
                    <div className="font-medium">{indicatorById.get(selected.indicatorId)?.name || selected.indicatorId}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estado Global:</span>
                    <div className="font-medium">{statusTranslations[(selected.overallStatus || 'Pending') as VerificationStatus]}</div>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Método</th>
                        <th className="px-4 py-3 text-left font-medium">Estado</th>
                        <th className="px-4 py-3 text-left font-medium">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selected.assignedVerificationMethods?.map(m => (
                        <tr key={m.name} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{m.name}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${statusToColor[m.status]} text-xs`}> 
                              {statusTranslations[m.status]} 
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{m.notes || '-'}</td>
                        </tr>
                      ))}
                      {(!selected.assignedVerificationMethods || selected.assignedVerificationMethods.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                            No hay métodos de verificación asignados
                          </td>
                        </tr>
                      )}
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