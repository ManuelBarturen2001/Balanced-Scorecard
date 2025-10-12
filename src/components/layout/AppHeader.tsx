
"use client";

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, UserCircle, Settings, PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar'; 
import { Logo } from './Logo';
import { ThemeToggle } from '@/components/theme-toggle';
// import { RoleSwitcher } from './RoleSwitcher';
import { NotificationBell } from './NotificationBell';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const roleLabels = {
  responsable: 'Responsable',
  calificador: 'Calificador',
  asignador: 'Asignador',
  admin: 'Administrador',
};

export function AppHeader() {
  const { user, logout, setActiveRole } = useAuth();
  const { toggleSidebar } = useSidebar(); 
  const router = useRouter();

  const getInitials = (name: string = "") => {
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length -1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'GT';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          {/* Botón unificado para alternar la barra lateral, visible en todas las resoluciones */}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Alternar Barra Lateral">
              <PanelLeft className="h-5 w-5" />
          </Button>
          
          {/* Logo en la cabecera. La barra lateral gestiona su propio logo dinámico. */}
          <Logo iconOnly={false} /> 
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {user && (
            <>
              {/* Notificaciones */}
              <NotificationBell />
              
              {/* Cambio de roles se ofrece dentro del menú del usuario */}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar" />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[user.role]}
                        </Badge>
                        {user.roleType === 'variante' && (
                          <Badge variant="secondary" className="text-xs">
                            Variante
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* Cambiar de rol para usuarios con roles variantes */}
                  {user.roleType === 'variante' && (user.availableRoles?.length || 0) > 1 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Cambiar de rol</DropdownMenuLabel>
                      {['responsable','calificador']
                        .filter(r => user.availableRoles?.includes(r as any))
                        .map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => {
                              if (r === user.role) return;
                              setActiveRole(r as any);
                              router.push(r === 'responsable' ? '/dashboard/usuario' : '/dashboard/calificador');
                            }}
                            className="flex items-center gap-2"
                          >
                            <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: r === user.role ? 'var(--primary)' : 'transparent', border: '1px solid var(--border)' }} />
                            <span>{r === 'responsable' ? 'Responsable' : 'Calificador'}</span>
                          </DropdownMenuItem>
                        ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <Link href="/profile" passHref legacyBehavior>
                    <DropdownMenuItem asChild>
                        <a>
                            <UserCircle className="mr-2 h-4 w-4" />
                            <span>Perfil</span>
                        </a>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={() => alert("Página de configuración (simulado)")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
