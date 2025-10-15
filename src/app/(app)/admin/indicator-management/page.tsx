"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { AssignedIndicator, Indicator, Perspective } from "@/lib/types";
import { getAllAssignedIndicators, getAllIndicators, getAllPerspectives } from "@/lib/data";
import { isPast } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Layers } from "lucide-react";

// Helper to safely parse different date formats that may appear in Firestore/strings
function parseDate(date: any): Date | null {
  if (!date) return null;
  try {
    if (typeof date === "object" && "seconds" in date) return new Date((date as any).seconds * 1000);
    if (typeof date === "object" && typeof (date as any).toDate === "function") return (date as any).toDate();
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    if (typeof date === "number") return new Date(date);
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

type AggregatedIndicator = {
  indicatorId: string;
  indicatorName: string;
  totalAssignments: number;
  completedAssignments: number; // assignments with all methods not pending
  hasOverduePending: boolean;
  hasPending: boolean; // but not overdue
};

export default function IndicatorManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [indicators, setIndicators] = useState<Record<string, Indicator>>({});
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);

  // Access control: only admin and supervisor
  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin" && user.role !== "supervisor") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allPersp, allInd, allAssigned] = await Promise.all([
          getAllPerspectives(),
          getAllIndicators(),
          getAllAssignedIndicators(),
        ]);

        const indMap: Record<string, Indicator> = {};
        for (const ind of allInd) indMap[ind.id] = ind;

        setPerspectives(allPersp);
        setIndicators(indMap);
        setAssignments(allAssigned);
      } catch (error) {
        console.error("Error loading indicator management data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const byPerspective = useMemo(() => {
    // Group assignments by perspectiveId then by indicatorId
    const group: Record<string, Record<string, AssignedIndicator[]>> = {};
    for (const a of assignments) {
      const pId = a.perspectiveId;
      const indId = a.indicatorId;
      if (!pId || !indId) continue;
      if (!group[pId]) group[pId] = {};
      if (!group[pId][indId]) group[pId][indId] = [];
      group[pId][indId].push(a);
    }
    return group;
  }, [assignments]);

  const aggregateForIndicator = (list: AssignedIndicator[], indicatorId: string): AggregatedIndicator => {
    const indicatorName = indicators[indicatorId]?.name || "Indicador";

    let completedAssignments = 0;
    let hasOverduePending = false;
    let hasPending = false;

    for (const a of list) {
      const methods = a.assignedVerificationMethods || [];
      const pendingCount = methods.filter((vm) => vm.status === "Pending").length;
      const overduePending = methods.some((vm) => {
        if (vm.status !== "Pending") return false;
        const due = parseDate((vm as any).dueDate);
        return due ? isPast(due) : false;
      });

      if (pendingCount === 0) {
        completedAssignments += 1;
      } else if (overduePending) {
        hasOverduePending = true;
      } else {
        hasPending = true;
      }
    }

    return {
      indicatorId,
      indicatorName,
      totalAssignments: list.length,
      completedAssignments,
      hasOverduePending,
      hasPending,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Layers className="h-6 w-6" /> Gestión de Indicadores
          </CardTitle>
          <CardDescription>
            Seguimiento del cumplimiento de entrega por parte de los responsables, agrupado por perspectiva e indicador.
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        {perspectives.map((p) => {
          const indicatorsById = byPerspective[p.id] || {};
          const indicatorIds = Object.keys(indicatorsById);

          return (
            <AccordionItem key={p.id} value={p.id}>
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  {p.icon ? <p.icon className="h-5 w-5" /> : null}
                  <span className="font-semibold">{p.name}</span>
                  <Badge variant="secondary" className="ml-2">{indicatorIds.length} indicadores</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {indicatorIds.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4">No hay indicadores asignados en esta perspectiva.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                    {indicatorIds.map((indId) => {
                      const agg = aggregateForIndicator(indicatorsById[indId], indId);
                      const percent = agg.totalAssignments > 0 ? Math.round((agg.completedAssignments / agg.totalAssignments) * 100) : 0;

                      // Determine aggregated color priority: Red > Yellow > Green
                      let colorClass = "bg-emerald-500";
                      let legend = (
                        <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Verde: Completado</div>
                      );
                      if (agg.hasOverduePending) {
                        colorClass = "bg-red-500";
                        legend = (
                          <div className="flex items-center gap-1 text-red-600"><AlertCircle className="h-4 w-4" /> Rojo: Vencido con pendientes</div>
                        );
                      } else if (agg.hasPending) {
                        colorClass = "bg-amber-500";
                        legend = (
                          <div className="flex items-center gap-1 text-amber-600"><Clock className="h-4 w-4" /> Amarillo: Pendiente antes del vencimiento</div>
                        );
                      }

                      return (
                        <Card key={indId} className="border-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">
                              {indicators[indId]?.name || "Indicador"}
                            </CardTitle>
                            <CardDescription>
                              {agg.completedAssignments}/{agg.totalAssignments} completados
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="relative">
                                <Progress value={percent} className="h-3 bg-muted" />
                                {/* Overlay a color bar to express the state visually */}
                                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                                  <div className={`${colorClass} h-full`} style={{ width: `${percent}%`, opacity: 0.3 }} />
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{percent}%</span>
                                {legend}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

