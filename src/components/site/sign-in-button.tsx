'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { SIGN_IN_PROVIDERS, providerLoginHref } from '@/lib/auth/providers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Botão "Entrar" do cabeçalho. Abre um menu com os providers de
 * `SIGN_IN_PROVIDERS` + a entrada de email OTP. Sem `next` — após login,
 * o callback aterra na home.
 *
 * Cada provider é um `<a>` para o route handler `/auth/login/<provider>` (307
 * real para o provider). Não usamos Server Action programática aqui: o
 * `redirect()` externo numa action invocada via `startTransition` rebentava no
 * Next 16 ("Connection closed", 500) - era exactamente este botão. `<a>` em vez
 * de `<Link>` evita o prefetch que dispararia o início do OAuth.
 */
export function SignInButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
        Entrar
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-52">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Iniciar sessão com
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SIGN_IN_PROVIDERS.map((provider) => (
          <DropdownMenuItem
            key={provider.slug}
            render={<a href={providerLoginHref(provider.slug)} />}
          >
            {provider.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/entrar" />}>Email (código)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
