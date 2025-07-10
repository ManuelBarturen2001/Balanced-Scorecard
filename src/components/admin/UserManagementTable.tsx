
"use client";

import type { User, UserRole } from '@/lib/types';
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
  admin: "Administrador",
  user: "Usuario",
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
      initials = names[0].substring(0,2);
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
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} 
                       className={cn(user.role === 'admin' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80', 'font-medium')}>
                  {roleTranslations[user.role] || user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-right px-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <Link href={`/admin/users/manage/${user.id}`} passHref legacyBehavior>
                      <DropdownMenuItem asChild>
                        <a>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver/Editar Perfil
                        </a>
                      </DropdownMenuItem>
                    </Link>
                   
                    <DropdownMenuSeparator />
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Desactivar
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción desactivará la cuenta de usuario para {user.name}. Esta es una acción simulada y no eliminará permanentemente los datos en esta demostración.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeactivateUser(user.id, user.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
        <div className="text-center p-8 text-muted-foreground">
          No se encontraron usuarios.
        </div>
      )}
    </div>
  );
}
