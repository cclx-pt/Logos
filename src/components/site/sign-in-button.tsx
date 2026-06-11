import Link from 'next/link';

/**
 * Botão "Entrar" do cabeçalho - link directo para a página de início de
 * sessão `/entrar` (Google + email OTP).
 *
 * Antes era um dropdown (Base UI) cujos itens iniciavam o login (Server Action
 * programática). Era frágil: o `redirect()` externo da action rebentava quando
 * invocada pelo cliente ("This page couldn't load", 500). Um `<Link>` para
 * `/entrar` é navegação normal, à prova de bala - e a página `/entrar` já junta
 * os dois métodos de login de forma mais clara que um dropdown.
 */
export function SignInButton() {
  return (
    <Link
      href="/entrar"
      className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      Entrar
    </Link>
  );
}
