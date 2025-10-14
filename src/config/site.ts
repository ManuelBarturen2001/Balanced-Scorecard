
import type { NavItemConfig } from '@/lib/types';
import { LayoutDashboard, ListPlus, Users, ClipboardList, ClipboardCheck, UserCheck, BarChart3 } from 'lucide-react';

export const AppConfig = {
  name: "Sistema Web de Balanced Scorecard",
  description: "Realiza un seguimiento eficaz de tus objetivos e indicadores institucionales.",
};

export const navItems: NavItemConfig[] = [
  {
    title: 'Panel Principal',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Mis asignaciones',
    href: '/my-assignments',
    icon: ClipboardList,
  },
  {
    title: 'Asignar Indicadores',
    href: '/assign-indicators',
    icon: ListPlus,
    adminOnly: true,
  },
  {
    title: 'Gestión de Indicadores',
    href: '/admin/indicator-management',
    icon: BarChart3,
    adminOnly: true,
  },
  {
    title: 'Gestión de Usuarios',
    href: '/admin/users',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Calificación',
    href: '/admin/grading',
    icon: ClipboardCheck,
    adminOnly: true,
  }
  ,
  {
    title: 'Gestión de Asignadores',
    href: '/admin/assigners',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Gestión de Calificadores',
    href: '/admin/calificadores',
    icon: UserCheck,
    adminOnly: true,
  },
  {
    title: 'Gestión de Calificaciones',
    href: '/admin/calificaciones',
    icon: ClipboardCheck,
    adminOnly: true,
  }
];
