"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RouteProtector } from "@/components/dashboard/RouteProtector";
import { PerspectiveTree } from "@/components/admin/perspectives/PerspectiveTree";
import { PlusCircle } from "lucide-react";

export default function PerspectivesManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [perspectiveName, setPerspectiveName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreatePerspective = async () => {
    if (!perspectiveName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la perspectiva.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/perspectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: perspectiveName }),
      });

      if (!response.ok) throw new Error("Error creando perspectiva");

      toast({
        title: "Éxito",
        description: "Perspectiva creada correctamente.",
      });

      setPerspectiveName("");
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la perspectiva.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RouteProtector allowedRoles={["admin"]}>
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">
              Gestión de Perspectivas e Indicadores
            </CardTitle>
            <CardDescription>
              Administra la estructura jerárquica: Perspectivas → Indicadores → Métodos de Verificación
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Nueva Perspectiva */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Nueva Perspectiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="perspective-name">Nombre de la Perspectiva</Label>
              <div className="flex gap-2">
                <Input
                  id="perspective-name"
                  placeholder="Ej: Clientes, Procesos, Crecimiento..."
                  value={perspectiveName}
                  onChange={(e) => setPerspectiveName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleCreatePerspective();
                    }
                  }}
                />
                <Button
                  onClick={handleCreatePerspective}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Crear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Árbol de Perspectivas, Indicadores y Métodos */}
        <PerspectiveTree refreshTrigger={refreshTrigger} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
      </div>
    </RouteProtector>
  );
}
