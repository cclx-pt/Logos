import Link from 'next/link';
import { ChevronDown, LogOut, Shield } from 'lucide-react';

import { signOutAction } from '@/lib/auth/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile } from '@/lib/auth';

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

export function UserMenu({ user }: { user: Profile }) {
  const showAdminLink = user.role !== 'user';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="text-ink hover:text-orange-hover focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Menu do utilizador ${user.displayName}`}
      >
        <span aria-live="polite">Olá, {firstName(user.displayName)}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Sessão de <span className="text-ink font-medium">{user.displayName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showAdminLink && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield className="h-4 w-4" aria-hidden="true" />
            Área admin
          </DropdownMenuItem>
        )}
        <form action={signOutAction}>
          <DropdownMenuItem render={<button type="submit" className="w-full" />}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Terminar sessão
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
