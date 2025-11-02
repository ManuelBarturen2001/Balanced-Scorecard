"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, FileCheck, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';

const roleIcons: Record<UserRole, React.ElementType> = {
  responsable: User,
  calificador: FileCheck,
  asignador: Users,
  admin: Settings,
  supervisor: Settings, // Añadido para cumplir con el tipo UserRole
};

const roleLabels: Record<UserRole, string> = {
  responsable: 'Responsable',
  calificador: 'Calificador',
  asignador: 'Asignador',
  admin: 'Administrador',
  supervisor: 'Supervisor', // Añadido para cumplir con el tipo UserRole
};

export function RoleSwitcher() {
  const { user, updateUserProfile } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Solo mostrar para roles variantes
  if (!user || user.roleType !== 'variante' || !user.availableRoles || user.availableRoles.length <= 1) {
    return null;
  }

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === user.role) return;
    
    console.log('Changing role from', user.role, 'to', newRole);
    setIsLoading(true);
    try {
      await updateUserProfile({ availableRoles: [newRole] });
      console.log('Role updated in Firebase and local state');
      
      // Redirigir al dashboard correspondiente al nuevo rol
      switch (newRole) {
        case 'responsable':
          router.push('/dashboard/usuario');
          break;
        case 'calificador':
          router.push('/dashboard/calificador');
          break;
        case 'asignador':
          router.push('/dashboard/asignador');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        default:
          router.push('/dashboard');
      }
      
      // Pequeño delay para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Forzar la actualización del router sin recargar la página
      router.refresh();
      console.log('Router refreshed');
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleIcon = roleIcons[user.role] ;
  const CurrentIcon = currentRoleIcon || User;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <CurrentIcon className="h-4 w-4 mr-2" />
          {roleLabels[user.role]}
          <Badge variant="secondary" className="ml-2">
            {user.availableRoles.length} roles
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.availableRoles.map((role) => {
          const Icon = roleIcons[role];
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleChange(role)}
              disabled={role === user.role || isLoading}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {roleLabels[role]}
              {role === user.role && (
                <Badge variant="outline" className="ml-auto">
                  Actual
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 