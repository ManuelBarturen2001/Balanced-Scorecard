
"use client";

import type { User, UserRole, RoleType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit3, Trash2, ShieldCheck, UserCheck, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UserManagementTableProps {
  users: User[];
  onUserUpdate: (userId: string, updates: Partial<User>) => void; 
  onUserDelete: (userId: string) => void; 
}

const roleTranslations: Record<UserRole, string> = {
  usuario: "Usuario",
  calificador: "Calificador",
  asignador: "Asignador",
  responsable: "Responsable",
  admin: "Administrador",
};

const roleTypeTranslations: Record<RoleType, string> = {
  variante: "Variante",
  unico: "Único",
};

const roleColors: Record<UserRole, string> = {
  usuario: "bg-blue-100 text-blue-800",
  calificador: "bg-green-100 text-green-800",
  asignador: "bg-purple-100 text-purple-800",
  responsable: "bg-amber-100 text-amber-800",
  admin: "bg-red-100 text-red-800",
};

export function UserManagementTable({ users, onUserUpdate, onUserDelete }: UserManagementTableProps) {
  const { toast } = useToast();
  
  const handleRoleChange = (userId: string, newRole: UserRole) => {
    onUserUpdate(userId, { role: newRole });
    toast({
      title: "Rol de Usuario Actualizado (Simulado)",
      description: `El rol del usuario ha sido cambiado a ${roleTranslations[newRole]}. Esta es una acción simulada y los cambios no persisten.`,
    });
  };

  const handleDeactivateUser = (userId: string, userName: string) => {
    onUserDelete(userId);
    toast({
      title: "Usuario Desactivado (Simulado)",
      description: `${userName} ha sido desactivado. Esta es una acción simulada y los cambios no persisten.`,
      variant: "destructive"
    });
  };
  
  const getInitials = (name: string = "") => {
    const names = name.split(' ');
    let initials = names[0] ? names[0][0] : '';
    if (names.length > 1 && names[names.length - 1]) {
      initials += names[names.length - 1][0];
    } else if (names[0] && names[0].length > 1) {
      initials += names[0].substring(0,2);
    }
    return initials.toUpperCase() || 'U';
  };

  return (
    <div className="rounded-lg border border-border shadow-sm bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] px-4">Avatar</TableHead>
            <TableHead className="px-4">Nombre</TableHead>
            <TableHead className="px-4">Correo Electrónico</TableHead>
            <TableHead className="px-4">Rol</TableHead>
            <TableHead className="px-4">Tipo</TableHead>
            <TableHead className="px-4">Facultad</TableHead>
            <TableHead className="px-4">Oficina</TableHead>
            <TableHead className="text-right px-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/50">
              <TableCell className="px-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium px-4">{user.name}</TableCell>
              <TableCell className="px-4 text-muted-foreground">{user.email}</TableCell>
              <TableCell className="px-4">
                <div className="flex flex-col gap-1">
                  <Badge 
                    className={cn("text-xs", roleColors[user.role])}
                  >
                    {roleTranslations[user.role]}
                  </Badge>
                  {user.roleType === 'variante' && user.availableRoles && user.availableRoles.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {user.availableRoles.map((role) => (
                        <Badge 
                          key={role} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {roleTranslations[role]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-4">
                <Badge variant="outline" className="text-xs">
                  {roleTypeTranslations[user.roleType || 'variante']}
                </Badge>
              </TableCell>
              <TableCell className="px-4 text-muted-foreground">
                {user.facultyId ? 'Facultad asignada' : 'Sin facultad'}
              </TableCell>
              <TableCell className="px-4 text-muted-foreground">
                {user.officeId || user.officeName ? 'Oficina asignada' : 'Sin oficina'}
              </TableCell>
              <TableCell className="px-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/users/manage/${user.id}`} className="flex items-center">
                        <Edit3 className="mr-2 h-4 w-4" />
                        Editar Usuario
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/users/manage/${user.id}`} className="flex items-center">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'usuario' : 'admin')}
                      className="flex items-center"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Cambiar Rol (Simulado)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="flex items-center text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Desactivar Usuario
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción desactivará al usuario "{user.name}". 
                            Esta es una acción simulada y los cambios no persisten.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeactivateUser(user.id, user.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Desactivar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay usuarios para mostrar</p>
        </div>
      )}
    </div>
  );
}
