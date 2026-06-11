'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { SIGN_IN_PROVIDERS } from '@/lib/auth/providers';
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
 */
export function SignInButton() {
  const [isPending, startTransition] = useTransition();

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
            disabled={isPending}
            onClick={() => {
              // A action devolve o URL do OAuth; navegamos no cliente (não há
              // redirect() server-side para externo - ver nota em actions.ts).
              startTransition(async () => {
                const url = await provider.action();
                window.location.assign(url);
              });
            }}
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
