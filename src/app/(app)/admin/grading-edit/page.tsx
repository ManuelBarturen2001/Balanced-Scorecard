"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllAssignedIndicators, 
  getAllIndicators, 
  getAllUsers,
  updateAssignedIndicator
} from "@/lib/data";
import type { AssignedIndicator, Indicator, User, VerificationStatus } from "@/lib/types";
import { Edit2, Search, AlertCircle } from "lucide-react";

export default function GradingEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignedIndicator[]>([]);
  const [indicators, setIndicators] = useState<Record<string, Indicator>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignedIndicator | null>(null);
  const [editingMethod, setEditingMethod] = useState<string>("");
  const [editingStatus, setEditingStatus] = useState<VerificationStatus>("Pending");
  const [editingNotes, setEditingNotes] = useState<string>("");

  // Control de acceso: solo admin
  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allAssignments, allIndicators, allUsers] = await Promise.all([
          getAllAssignedIndicators(),
          getAllIndicators(),
          getAllUsers(),
        ]);

        // Convertir arrays a objetos para acceso más rápido
        const indMap: Record<string, Indicator> = {};
        const userMap: Record<string, User> = {};
        
        allIndicators.forEach(ind => indMap[ind.id] = ind);
        allUsers.forEach(u => userMap[u.id] = u);

        // Filtrar asignaciones que tienen al menos un método calificado (incluyendo todos los estados)
        const gradedAssignments = allAssignments.filter(assignment => 
          assignment.assignedVerificationMethods?.some(method => 
            method.status === "Rejected" || 
            method.status === "Observed" || 
            method.status === "Approved" ||
            method.status === "Submitted"
          )
        );

        // Log para depuración
        console.log("Total de asignaciones:", allAssignments.length);
        console.log("Asignaciones filtradas:", gradedAssignments.length);
        console.log("Asignaciones con calificaciones:", gradedAssignments);

        setAssignments(gradedAssignments);
        setIndicators(indMap);
        setUsers(userMap);
      } catch (error) {
        console.error("Error loading grading management data:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, intenta de nuevo.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleEdit = (assignment: AssignedIndicator, methodName: string) => {
    const method = assignment.assignedVerificationMethods?.find(m => m.name === methodName);
    if (!method) return;

    setEditingAssignment(assignment);
    setEditingMethod(methodName);
    setEditingStatus(method.status);
    setEditingNotes(method.notes || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;

    try {
      const updatedMethods = editingAssignment.assignedVerificationMethods.map(method => {
        if (method.name === editingMethod) {
          return {
            ...method,
            status: editingStatus as VerificationStatus,
            notes: editingNotes,
            dueDate: method.dueDate // Mantenemos la fecha original
          };
        }
        return method;
      });

      const updatedAssignment: AssignedIndicator = {
        ...editingAssignment,
        id: editingAssignment.id,
        userId: editingAssignment.userId,
        indicatorId: editingAssignment.indicatorId,
        assignerId: editingAssignment.assignerId,
        dueDate: editingAssignment.dueDate,
        assignedVerificationMethods: updatedMethods,
        assignedDate: editingAssignment.assignedDate
      };

      if (!editingAssignment.id) {
        throw new Error("La asignación no tiene ID");
      }
      
      await updateAssignedIndicator(editingAssignment.id, updatedAssignment);
      
      // Actualizar el estado local
      setAssignments(prev => prev.map(a => 
        a.id === editingAssignment.id ? updatedAssignment : a
      ));

      toast({
        title: "Calificación Actualizada",
        description: "La calificación ha sido actualizada exitosamente.",
      });

      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating grading:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la calificación. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Filtrar asignaciones según término de búsqueda
  const filteredAssignments = assignments.filter(assignment => {
    const indicator = indicators[assignment.indicatorId];
    const responsable = users[assignment.userId];
    const searchString = `${indicator?.name || ""} ${responsable?.name || ""} ${responsable?.email || ""}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">Edición de Calificaciones</CardTitle>
              <CardDescription>
                Administra las calificaciones realizadas por los jurados. Aquí puedes ver y modificar todas las calificaciones, incluyendo las aprobadas, rechazadas, observadas y enviadas.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por indicador o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {filteredAssignments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No se encontraron calificaciones para editar
                </div>
              ) : (
                filteredAssignments.map((assignment) => {
                  const indicator = indicators[assignment.indicatorId];
                  const responsable = users[assignment.userId];
                  const calificador = users[assignment.assignerId];
                  return (
                    <Card key={assignment.id} className="border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {indicator?.name || "Indicador"}
                            </CardTitle>
                            <CardDescription>
                              Responsable: {responsable?.name || "Usuario"} ({responsable?.email})
                              <br />
                              Jurado: {calificador?.name || "Jurado"} ({calificador?.email})
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Métodos de verificación calificados:
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {assignment.assignedVerificationMethods?.filter(method => 
                              method.status === "Rejected" || 
                              method.status === "Observed" || 
                              method.status === "Approved" ||
                              method.status === "Submitted"
                            ).map((method, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{method.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      method.status === "Rejected" ? "bg-red-100 text-red-700" :
                                      method.status === "Observed" ? "bg-yellow-100 text-yellow-700" :
                                      method.status === "Approved" ? "bg-green-100 text-green-700" :
                                      "bg-blue-100 text-blue-700"
                                    }`}>
                                      {method.status}
                                    </span>
                                  </div>
                                  {method.notes && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Observaciones: {method.notes}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(assignment, method.name)}
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de Edición */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Calificación</DialogTitle>
            <DialogDescription>
              Modifica el estado y las observaciones de la calificación seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de Verificación</Label>
              <Input
                value={editingMethod}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={editingStatus}
                onChange={(e) => setEditingStatus(e.target.value as VerificationStatus)}
              >
                <option value="Pending">Pendiente</option>
                <option value="Submitted">Enviado</option>
                <option value="Approved">Aprobado</option>
                <option value="Rejected">Rechazado</option>
                <option value="Observed">Observado</option>
                <option value="Overdue">Vencido</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Ingrese las observaciones o comentarios..."
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )};