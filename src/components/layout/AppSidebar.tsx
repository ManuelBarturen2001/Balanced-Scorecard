
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { navItems } from '@/config/site';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'; 

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { state: sidebarState } = useSidebar(); 

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center h-8"> 
          {sidebarState === 'collapsed' ? (
            <div className="h-6 w-6 md:h-8 md:w-8 relative flex-shrink-0">
              <Image
                src="/Img/unmsm.svg"
                alt="Logo UNMSM"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="text-center space-y-1">
              <h2 className="text-sm md:text-base font-bold text-primary leading-tight">
                Sistema Web de
              </h2>
              <h3 className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                Balanced Scorecard
              </h3>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <ScrollArea className="h-full p-2">
          <SidebarMenu>
            {navItems.map((item) => {
              // Para asignadores, mostrar Dashboard, Mis asignaciones y Asignar Indicadores
              if (user?.role === 'asignador') {
                if (item.title === 'Gestión de Usuarios' || item.title === 'Calificación') {
                  return null;
                }
                // Permitir que los asignadores vean "Asignar Indicadores"
                if (item.title === 'Asignar Indicadores') {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Link href={item.href} legacyBehavior passHref>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1)}
                          tooltip={{ children: item.title, side: 'right', align: 'center' }}
                          className={cn(
                            "w-full justify-start transition-all duration-200 hover:bg-muted/50",
                            (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1)) && "bg-primary/10 text-primary border-l-2 border-primary"
                          )}
                        >
                          <a>
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className={cn(sidebarState === 'collapsed' && "md:hidden")}>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                }
              }
              
              // Para calificadores, mostrar Dashboard y Calificación, NO Mis asignaciones
              if (user?.role === 'calificador') {
                if (item.title === 'Mis asignaciones' || item.title === 'Asignar Indicadores' || item.title === 'Gestión de Usuarios') {
                  return null;
                }
                // Permitir que los calificadores vean "Calificación"
                if (item.title === 'Calificación') {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Link href={item.href} legacyBehavior passHref>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1)}
                          tooltip={{ children: item.title, side: 'right', align: 'center' }}
                          className={cn(
                            "w-full justify-start transition-all duration-200 hover:bg-muted/50",
                            (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1)) && "bg-primary/10 text-primary border-l-2 border-primary"
                          )}
                        >
                          <a>
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className={cn(sidebarState === 'collapsed' && "md:hidden")}>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                }
              }
              
              // Para admins, mostrar todo
              if (item.adminOnly && !isAdmin) {
                return null;
              }
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1);
              return (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={{ children: item.title, side: 'right', align: 'center' }}
                      className={cn(
                        "w-full justify-start transition-all duration-200 hover:bg-muted/50",
                        isActive && "bg-primary/10 text-primary border-l-2 border-primary"
                      )}
                    >
                      <a>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className={cn(sidebarState === 'collapsed' && "md:hidden")}>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              tooltip={{ children: "Cerrar Sesión", side: 'right', align: 'center' }}
              className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className={cn(sidebarState === 'collapsed' && "md:hidden")}>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
