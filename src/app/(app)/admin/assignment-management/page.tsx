"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactView } from "@/components/dashboard/CompactView";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllAssignedIndicators, 
  getAllIndicators, 
  getAllUsers,
  updateAssignedIndicator,
  deleteAssignedIndicator
} from "@/lib/data";
import type { AssignedIndicator, Indicator, User, VerificationMethod } from "@/lib/types";
import { Edit2, Trash2, Search, AlertCircle } from "lucide-react";

export default function AssignmentManagementPage() {
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
  const [enabledMethods, setEnabledMethods] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignedIndicator | null>(null);

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

        setAssignments(allAssignments);
        setIndicators(indMap);
        setUsers(userMap);
      } catch (error) {
        console.error("Error loading assignment management data:", error);
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

  const handleEdit = (assignment: AssignedIndicator) => {
    setEditingAssignment(assignment);
    setEnabledMethods(assignment.assignedVerificationMethods?.map(m => m.name) || []);
    setShowEditModal(true);
  };

  const handleDelete = (assignment: AssignedIndicator) => {
    setAssignmentToDelete(assignment);
    setShowDeleteConfirm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;

    try {
      // Actualizar los métodos de verificación
      const updatedAssignment = {
        ...editingAssignment,
        assignedVerificationMethods: enabledMethods.map(method => ({
          name: method,
          status: editingAssignment.assignedVerificationMethods?.find(m => m.name === method)?.status || "Pending",
          dueDate: editingAssignment.dueDate,
          notes: editingAssignment.assignedVerificationMethods?.find(m => m.name === method)?.notes || ""
        }))
      };

      await updateAssignedIndicator(editingAssignment.id!, updatedAssignment);
      
      // Actualizar el estado local
      setAssignments(prev => prev.map(a => 
        a.id === editingAssignment.id ? updatedAssignment : a
      ));

      toast({
        title: "Asignación Actualizada",
        description: "La asignación ha sido actualizada exitosamente.",
      });

      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la asignación. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      await deleteAssignedIndicator(assignmentToDelete.id!);
      
      // Actualizar el estado local
      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));

      toast({
        title: "Asignación Eliminada",
        description: "La asignación ha sido eliminada exitosamente.",
      });

      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignación. Por favor, intenta de nuevo.",
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
      <CompactView assignments={assignments} />
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">Gestión de Asignaciones</CardTitle>
              <CardDescription>
                Administra las asignaciones de indicadores existentes. Puedes editar los métodos de verificación o eliminar asignaciones.
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
                  No se encontraron asignaciones
                </div>
              ) : (
                filteredAssignments.map((assignment) => {
                  const indicator = indicators[assignment.indicatorId];
                  const responsable = users[assignment.userId];
                  return (
                    <Card key={assignment.id} className="border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {indicator?.name || "Indicador"}
                            </CardTitle>
                            <CardDescription>
                              Asignado a: {responsable?.name || "Usuario"} ({responsable?.email})
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(assignment)}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(assignment)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Métodos de verificación asignados:
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {assignment.assignedVerificationMethods?.map((method, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                • {method.name}
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  method.status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                                  method.status === "Submitted" ? "bg-blue-100 text-blue-700" :
                                  method.status === "Approved" ? "bg-green-100 text-green-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {method.status}
                                </span>
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
            <DialogTitle>Editar Asignación</DialogTitle>
            <DialogDescription>
              Modifica los métodos de verificación habilitados para esta asignación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Indicador</Label>
              <Input
                value={indicators[editingAssignment?.indicatorId || ""]?.name || ""}
                disabled
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Responsable Actual</Label>
                <Input
                  value={users[editingAssignment?.userId || ""]?.name || ""}
                  disabled
                />
              </div>
              {!editingAssignment?.assignedVerificationMethods?.some(m => 
                m.status !== "Pending" || new Date(m.dueDate) < new Date()
              ) && (
                <div className="space-y-2">
                  <Label>Cambiar Responsable</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={editingAssignment?.userId || ""}
                    onChange={(e) => {
                      if (editingAssignment) {
                        setEditingAssignment({
                          ...editingAssignment,
                          userId: e.target.value
                        });
                      }
                    }}
                  >
                    <option value="">Seleccionar nuevo responsable</option>
                    {Object.values(users)
                      .filter(u => u.role === "responsable")
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Jurado Actual</Label>
                <Input
                  value={users[editingAssignment?.assignerId || ""]?.name || ""}
                  disabled
                />
              </div>
              {!editingAssignment?.assignedVerificationMethods?.some(m => 
                m.status !== "Pending" || new Date(m.dueDate) < new Date()
              ) && (
                <div className="space-y-2">
                  <Label>Cambiar Jurado</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={editingAssignment?.assignerId || ""}
                    onChange={(e) => {
                      if (editingAssignment) {
                        setEditingAssignment({
                          ...editingAssignment,
                          assignerId: e.target.value
                        });
                      }
                    }}
                  >
                    <option value="">Seleccionar nuevo jurado</option>
                    {Object.values(users)
                      .filter(u => u.role === "calificador")
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Métodos de Verificación</Label>
              {indicators[editingAssignment?.indicatorId || ""]?.verificationMethods?.map((method, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`method-${index}`}
                    checked={enabledMethods.includes(method)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEnabledMethods([...enabledMethods, method]);
                      } else {
                        if (enabledMethods.length > 1) {
                          setEnabledMethods(enabledMethods.filter(m => m !== method));
                        } else {
                          toast({
                            title: "Error",
                            description: "Debe mantener al menos un método de verificación habilitado.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  />
                  <Label htmlFor={`method-${index}`}>{method}</Label>
                </div>
              ))}
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

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta asignación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Se eliminará la asignación del indicador "{indicators[assignmentToDelete?.indicatorId || ""]?.name}" 
                para {users[assignmentToDelete?.userId || ""]?.name}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )};