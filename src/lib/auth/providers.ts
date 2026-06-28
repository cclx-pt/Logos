/**
 * Registry único dos providers OAuth visíveis na UI. Todas as superfícies de
 * login (`<ProviderSignIn>`, dropdown "Entrar" do cabeçalho, `/entrar`)
 * derivam daqui - adicionar/remover um provider é uma entrada nesta lista.
 *
 * Hoje só tem Google (o email + código OTP é um fluxo de 2 passos à parte,
 * em `<EmailOtpSignIn>`). Microsoft/Entra foi removido em 10-06-2026.
 *
 * **O início do OAuth é um route handler** (`/auth/login/[provider]`), não uma
 * Server Action: termina num redirect para um URL externo (o do provider), e
 * Server Actions que fazem `redirect()` externo rebentam quando invocadas pelo
 * cliente (Next 16, "Connection closed", 500 - foi o bug do botão "Entrar").
 * Os botões de login são por isso simples links para `providerLoginHref(...)`.
 */

export type SignInProviderSlug = 'google';

export type SignInProvider = {
  /** Slug do provider no Supabase Auth e no URL do route handler. */
  slug: SignInProviderSlug;
  /** Nome visível na UI ("Continuar com {label}", item do dropdown). */
  label: string;
};

export const SIGN_IN_PROVIDERS: readonly SignInProvider[] = [{ slug: 'google', label: 'Google' }];

/** Type guard para validar o `[provider]` do route handler contra o registry. */
export function isSignInProvider(slug: string): slug is SignInProviderSlug {
  return SIGN_IN_PROVIDERS.some((p) => p.slug === slug);
}

/**
 * Href do route handler que inicia o OAuth deste provider. `next` é o caminho
 * interno para onde voltar após o login (validado server-side no callback).
 * Usar com um `<a>` simples (não `<Link>`): prefetch dispararia o início do
 * OAuth ao passar o rato.
 */
export function providerLoginHref(slug: SignInProviderSlug, next?: string): string {
  return next ? `/auth/login/${slug}?next=${encodeURIComponent(next)}` : `/auth/login/${slug}`;
}
