'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { BookMarked, ChevronDown, LogOut, Shield, User } from 'lucide-react';

import { signOutAction } from '@/lib/auth/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  const [isPending, startTransition] = useTransition();
  const showAdminLink = user.role !== 'user';

  return (
    <DropdownMenu>
      {/*
        Sem aria-label aqui: WCAG SC 2.5.3 ("Label in Name") exige que o
        accessible name inclua o texto visível. Antes existia
        `aria-label="Menu do utilizador {nome}"` que substituía o
        texto visível "Olá, {nome}" — falhava em axe DevTools. Base UI
        anuncia automaticamente o role de menu trigger; o texto visível
        passa a ser o accessible name.
      */}
      <DropdownMenuTrigger className="text-ink hover:text-orange-hover focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
        <span aria-live="polite">Olá, {firstName(user.displayName)}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Sessão de <span className="text-ink font-medium">{user.displayName}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/meus-cursos" />}>
          <BookMarked className="h-4 w-4" aria-hidden="true" />
          Os meus cursos
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/perfil" />}>
          <User className="h-4 w-4" aria-hidden="true" />
          Perfil
        </DropdownMenuItem>
        {showAdminLink && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield className="h-4 w-4" aria-hidden="true" />
            Área admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void signOutAction();
            });
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Terminar sessão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
