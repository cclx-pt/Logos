import Link from 'next/link';
import { Shield } from 'lucide-react';

import { cn } from '@/lib/utils';

type AdminBadgeLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export function AdminBadgeLink({ className, onNavigate }: AdminBadgeLinkProps) {
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      className={cn(
        'bg-sage-card text-ink hover:bg-sage-card/80 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      <Shield className="h-3.5 w-3.5" aria-hidden="true" />
      Área admin
    </Link>
  );
}
