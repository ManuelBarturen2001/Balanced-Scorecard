import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 text-primary hover:text-primary/80 transition-colors duration-200", className)}>
      <div className="h-11 w-auto md:h-14 relative flex-shrink-0">
        <Image
          src="/Img/UNMSM.png"
          alt="Logo UNMSM"
          width={180}
          height={60}
          className="h-full w-auto object-contain"
        />
      </div>
    </Link>
  );
}
