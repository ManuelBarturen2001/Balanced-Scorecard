"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Send } from 'lucide-react';
import { User } from '@/lib/types';
import { sendCustomNotification } from '@/lib/notificationService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SendNotificationDialogProps {
  users: User[];
}

export function SendNotificationDialog({ users }: SendNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [actionUrl, setActionUrl] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<'all' | 'responsable' | 'calificador' | 'asignador'>('all');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const filteredUsers = users.filter(u => {
    if (filterRole === 'all') return u.role !== 'admin';
    return u.role === filterRole;
  });

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Campos requeridos",
        description: "El título y mensaje son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Selecciona usuarios",
        description: "Debes seleccionar al menos un usuario",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Obtener el nombre del remitente
      const senderInfo = currentUser 
        ? `${currentUser.name} (Administrador)` 
        : 'Administrador';

      await sendCustomNotification(
        selectedUsers,
        title,
        message,
        priority,
        actionUrl || undefined,
        senderInfo // Pasar el nombre del remitente
      );

      toast({
        title: "¡Notificación enviada!",
        description: `Notificación enviada a ${selectedUsers.length} usuario(s)`,
      });

      // Limpiar formulario
      setTitle('');
      setMessage('');
      setActionUrl('');
      setSelectedUsers([]);
      setPriority('medium');
      setOpen(false);
    } catch (error) {
      console.error('Error enviando notificación:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la notificación",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Enviar Notificación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Notificación Manual</DialogTitle>
          <DialogDescription>
            Envía una notificación personalizada a los usuarios seleccionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ej: Recordatorio importante"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje *</Label>
            <Textarea
              id="message"
              placeholder="Escribe el mensaje de la notificación..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Baja</SelectItem>
                <SelectItem value="medium">🟡 Media</SelectItem>
                <SelectItem value="high">🔴 Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* URL de acción (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="actionUrl">URL de Acción (opcional)</Label>
            <Input
              id="actionUrl"
              placeholder="/my-assignments"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              URL a la que se redirigirá al hacer clic en la notificación
            </p>
          </div>

          {/* Filtro de rol */}
          <div className="space-y-2">
            <Label>Filtrar por Rol</Label>
            <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                <SelectItem value="responsable">Responsables</SelectItem>
                <SelectItem value="calificador">Calificadores</SelectItem>
                <SelectItem value="asignador">Asignadores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selección de usuarios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Usuarios ({selectedUsers.length} seleccionados)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedUsers.length === filteredUsers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay usuarios disponibles
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <Label
                      htmlFor={`user-${user.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground ml-2">({user.email})</span>
                      <span className="text-xs ml-2 text-muted-foreground">
                        - {user.role}
                      </span>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Notificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
