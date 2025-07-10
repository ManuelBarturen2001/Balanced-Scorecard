import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 text-primary hover:text-primary/80 transition-colors duration-200", className)}>
       <div className="h-8 w-8 relative" data-ai-hint="abstract logo">
         <svg viewBox="0 0 100 100" fill="currentColor" className="h-full w-full">
            <path d="M50,5 A20,20 0 0,0 50,45 A20,20 0 0,0 50,5 M25,25 A20,20 0 0,1 75,25 M25,75 A20,20 0 0,0 75,75 M50,55 A20,20 0 0,1 50,95 A20,20 0 0,1 50,55" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="12" />
         </svg>
      </div>
      {!iconOnly && (
        <span className="text-xl font-headline font-bold">
          GoalTracker
        </span>
      )}
    </Link>
  );
}
