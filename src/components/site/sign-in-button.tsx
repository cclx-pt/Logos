'use client';

import { useTransition } from 'react';
import { ChevronDown } from 'lucide-react';

import { signInWithGoogleAction, signInWithMicrosoftAction } from '@/lib/auth/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Botão "Entrar" do cabeçalho. Abre um menu com os providers disponíveis
 * (Google + Microsoft). Sem `next` — após login, o callback aterra na home.
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
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void signInWithGoogleAction();
            });
          }}
        >
          Google
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void signInWithMicrosoftAction();
            });
          }}
        >
          Microsoft
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
