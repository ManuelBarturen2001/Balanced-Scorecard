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
import { AlertCircle, CheckCircle2, Clock, Layers, Search, Filter, Gauge, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "green" | "yellow" | "red">("all");

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

  const kpis = useMemo(() => {
    let totalAssignments = 0;
    let completed = 0; // all methods complete
    let pending = 0; // has pending but not overdue
    let overdue = 0; // has pending and overdue

    for (const a of assignments) {
      totalAssignments += 1;
      const methods = a.assignedVerificationMethods || [];
      const hasPending = methods.some((m) => m.status === "Pending");
      const hasOverdue = methods.some((m) => m.status === "Pending" && (() => {
        const d = parseDate((m as any).dueDate);
        return d ? isPast(d) : false;
      })());
      if (!hasPending) completed += 1;
      else if (hasOverdue) overdue += 1;
      else pending += 1;
    }

    const completionRate = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;
    return { totalAssignments, completed, pending, overdue, completionRate };
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
      {/* Header + KPIs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border-border xl:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-col md:flex-row">
              <div className="flex items-center gap-2">
                <Layers className="h-6 w-6" />
                <CardTitle className="font-headline text-2xl">Gestión de Indicadores</CardTitle>
              </div>
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar indicador..."
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              Seguimiento del cumplimiento de entrega por parte de los responsables, agrupado por perspectiva e indicador.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground">Total asignaciones</div>
              <div className="text-2xl font-bold">{kpis.totalAssignments}</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground">Completadas</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div className="text-2xl font-bold">{kpis.completed}</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground">Pendientes</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <div className="text-2xl font-bold">{kpis.pending}</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground">Vencidas</div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div className="text-2xl font-bold">{kpis.overdue}</div>
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Tasa global de completitud: {kpis.completionRate}%
              </div>
              <Progress value={kpis.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            Filtrar por estado
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setStatusFilter("all")} 
            className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
              statusFilter === "all" 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-border hover:border-primary/50"
            }`}
          >
            Todos
          </button>
          <button 
            onClick={() => setStatusFilter("green")} 
            className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
              statusFilter === "green" 
                ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                : "border-border hover:border-emerald-500/50"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Verdes
            </span>
          </button>
          <button 
            onClick={() => setStatusFilter("yellow")} 
            className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
              statusFilter === "yellow" 
                ? "border-amber-500 bg-amber-50 text-amber-700" 
                : "border-border hover:border-amber-500/50"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4 text-amber-500" /> Amarillos
            </span>
          </button>
          <button 
            onClick={() => setStatusFilter("red")} 
            className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
              statusFilter === "red" 
                ? "border-red-500 bg-red-50 text-red-700" 
                : "border-border hover:border-red-500/50"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-500" /> Rojos
            </span>
          </button>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        {perspectives.map((p) => {
          const indicatorsById = byPerspective[p.id] || {};
          const indicatorIds = Object.keys(indicatorsById)
            .filter((indId) => {
              // text search on indicator name
              const name = indicators[indId]?.name || "";
              if (query && !name.toLowerCase().includes(query.toLowerCase())) return false;
              return true;
            });

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

                      // status filter
                      const statusKey = agg.hasOverduePending ? "red" : agg.hasPending ? "yellow" : "green";
                      if (statusFilter !== "all" && statusFilter !== statusKey) return null;

                      return (
                        <Card key={indId} className="border-border hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-base font-semibold">
                                  {indicators[indId]?.name || "Indicador"}
                                </CardTitle>
                                <CardDescription>
                                  {agg.completedAssignments}/{agg.totalAssignments} completados
                                </CardDescription>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      className={`${statusKey === "red" ? "bg-red-100 text-red-700" : statusKey === "yellow" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                                    >
                                      {statusKey === "red" ? "Rojo" : statusKey === "yellow" ? "Amarillo" : "Verde"}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    {statusKey === "red" ? "Vencido con pendientes" : statusKey === "yellow" ? "Pendiente antes del vencimiento" : "Completado"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </CardHeader>
                          <CardContent>
                              <div className="space-y-3">
                              {/* Solid color bar: full width colored according to aggregated status (red/yellow/green) */}
                              <div className={`w-full h-3 rounded-full border ${
                                agg.hasOverduePending ? 'bg-[#EF4444]' : agg.hasPending ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                              }`} />
                              <div className="flex items-center justify-end text-sm text-muted-foreground">
                                {legend}
                              </div>
                              {indicators[indId]?.moreInformationLink ? (
                                <a
                                  href={indicators[indId]?.moreInformationLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs underline text-primary"
                                >
                                  Ver más información
                                </a>
                              ) : null}
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

