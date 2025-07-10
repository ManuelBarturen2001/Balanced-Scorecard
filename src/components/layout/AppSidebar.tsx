
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { navItems } from '@/config/site';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut } from 'lucide-react';
import { Logo } from './Logo';
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
        {/* El logo se centra ya que el botón de toggle ahora está en AppHeader */}
        <div className="flex items-center justify-center h-8"> 
          <Logo iconOnly={sidebarState === 'collapsed'} />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <ScrollArea className="h-full p-2">
          <SidebarMenu>
            {navItems.map((item) => {
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
                      className="w-full justify-start"
                    >
                      <a>
                        <item.icon className="h-5 w-5" />
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
