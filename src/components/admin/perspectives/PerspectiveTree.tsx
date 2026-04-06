"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import type { Perspective, Indicator } from "@/lib/types";

interface PerspectiveTreeProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

interface ExpandedPerspective {
  [perspectiveId: string]: boolean;
}

interface DeleteConfirmation {
  type: "perspective" | "indicator" | "method" | null;
  id: string;
  indicatorId?: string;
  name: string;
}

export function PerspectiveTree({ refreshTrigger, onRefresh }: PerspectiveTreeProps) {
  const { toast } = useToast();
  const [perspectives, setPerspectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerspectives, setExpandedPerspectives] = useState<ExpandedPerspective>({});
  
  // Estados para modales
  const [showIndicatorDialog, setShowIndicatorDialog] = useState(false);
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    type: null,
    id: "",
    name: "",
  });
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState("");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState("");
  const [newIndicatorName, setNewIndicatorName] = useState("");
  const [newMethodName, setNewMethodName] = useState("");
  const [editingIndicator, setEditingIndicator] = useState<any>(null);
  const [editingMethod, setEditingMethod] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/perspectives");
      const data = await response.json();
      console.log("Loaded perspectives:", data);
      
      if (!response.ok) {
        throw new Error(data.error || "Error cargando perspectivas");
      }
      
      setPerspectives(data);
    } catch (error) {
      console.error("Error loading perspectives:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar las perspectivas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePerspective = (perspectiveId: string) => {
    setExpandedPerspectives(prev => ({
      ...prev,
      [perspectiveId]: !prev[perspectiveId]
    }));
  };

  const handleAddIndicator = async () => {
    if (!newIndicatorName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el indicador.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perspectiveId: selectedPerspectiveId,
          name: newIndicatorName,
        }),
      });

      if (!response.ok) throw new Error("Error creando indicador");

      toast({
        title: "Éxito",
        description: "Indicador creado correctamente.",
      });

      setNewIndicatorName("");
      setShowIndicatorDialog(false);
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el indicador.",
        variant: "destructive",
      });
    }
  };

  const handleAddMethod = async () => {
    if (!newMethodName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el método de verificación.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/verification-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorId: selectedIndicatorId,
          name: newMethodName,
        }),
      });

      if (!response.ok) throw new Error("Error creando método");

      toast({
        title: "Éxito",
        description: "Método de verificación creado correctamente.",
      });

      setNewMethodName("");
      setShowMethodDialog(false);
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el método de verificación.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePerspective = async (perspectiveId: string, perspectiveName: string) => {
    setDeleteConfirmation({
      type: "perspective",
      id: perspectiveId,
      name: perspectiveName,
    });
  };

  const handleConfirmDelete = async () => {
    const { type, id, indicatorId } = deleteConfirmation;

    try {
      if (type === "perspective") {
        const response = await fetch(`/api/perspectives/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error eliminando perspectiva");
        }

        toast({
          title: "Éxito",
          description: "Perspectiva eliminada correctamente.",
        });

        onRefresh();
      } else if (type === "indicator") {
        const response = await fetch("/api/indicators", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ indicatorId: id }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error eliminando indicador");
        }

        toast({
          title: "Éxito",
          description: "Indicador eliminado correctamente.",
        });

        onRefresh();
      } else if (type === "method") {
        const response = await fetch("/api/verification-methods", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            indicatorId,
            methodId: id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error eliminando método");
        }

        toast({
          title: "Éxito",
          description: "Método de verificación eliminado correctamente.",
        });

        onRefresh();
      }

      setDeleteConfirmation({ type: null, id: "", name: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el elemento.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Estructura Jerárquica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {perspectives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <p>No hay perspectivas creadas aún</p>
              <p className="text-sm">Crea una perspectiva para comenzar a organizar tus indicadores</p>
            </div>
          ) : (
            perspectives.map((perspective) => (
              <div key={perspective.id} className="space-y-2">
              {/* Perspectiva */}
              <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                <button
                  onClick={() => togglePerspective(perspective.id)}
                  className="flex items-center justify-center w-6 h-6"
                >
                  {expandedPerspectives[perspective.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <span className="font-semibold flex-1">{perspective.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPerspectiveId(perspective.id);
                    setShowIndicatorDialog(true);
                  }}
                  className="h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Indicador
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePerspective(perspective.id, perspective.name)}
                  className="h-7"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Indicadores */}
              {expandedPerspectives[perspective.id] && perspective.indicators && (
                <div className="ml-6 space-y-2">
                  {perspective.indicators.map((indicator: any) => (
                    <div key={indicator.id} className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 border-l-2 border-muted">
                        <button
                          onClick={() => togglePerspective(`ind-${indicator.id}`)}
                          className="flex items-center justify-center w-6 h-6"
                        >
                          {expandedPerspectives[`ind-${indicator.id}`] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <span className="text-sm flex-1">{indicator.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedIndicatorId(indicator.id);
                            setShowMethodDialog(true);
                          }}
                          className="h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          MDV
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmation({
                            type: "indicator",
                            id: indicator.id,
                            name: indicator.name,
                          })}
                          className="h-7"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Métodos de Verificación */}
                      {expandedPerspectives[`ind-${indicator.id}`] && indicator.verificationMethods && indicator.verificationMethods.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {indicator.verificationMethods.map((method: any, index: number) => {
                            // Soportar tanto strings como objetos { id, name }
                            const methodId = typeof method === "string" ? `method-${index}` : method.id || `method-${index}`;
                            const methodName = typeof method === "string" ? method : method.name || method;
                            
                            return (
                              <div
                                key={methodId}
                                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 border-l-2 border-muted text-sm bg-muted/20"
                              >
                                <span>{methodName}</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteConfirmation({
                                    type: "method",
                                    id: methodId,
                                    indicatorId: indicator.id,
                                    name: methodName,
                                  })}
                                  className="h-6"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog - Nuevo Indicador */}
      <Dialog open={showIndicatorDialog} onOpenChange={setShowIndicatorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Indicador</DialogTitle>
            <DialogDescription>Ingresa el nombre del nuevo indicador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre del indicador"
              value={newIndicatorName}
              onChange={(e) => setNewIndicatorName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddIndicator();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndicatorDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddIndicator}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Nuevo Método de Verificación */}
      <Dialog open={showMethodDialog} onOpenChange={setShowMethodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Método de Verificación</DialogTitle>
            <DialogDescription>Ingresa el nombre del nuevo método</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre del método de verificación"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddMethod();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMethodDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMethod}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog - Confirmación de eliminación */}
      <AlertDialog open={deleteConfirmation.type !== null} onOpenChange={(open) => {
        if (!open) {
          setDeleteConfirmation({ type: null, id: "", name: "" });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteConfirmation.type === "perspective" ? "perspectiva" : deleteConfirmation.type === "indicator" ? "indicador" : "método de verificación"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar "{deleteConfirmation.name}". Esta acción no se puede deshacer.
              {deleteConfirmation.type === "perspective" && " La perspectiva debe estar sin indicadores."}
              {deleteConfirmation.type === "indicator" && " El indicador debe estar sin asignaciones."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
