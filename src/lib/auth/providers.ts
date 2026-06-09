import { signInWithGoogleAction } from './actions';

export type SignInProvider = {
  /** Slug do provider no Supabase Auth. */
  slug: 'google';
  /** Nome visível na UI ("Continuar com {label}", item do dropdown). */
  label: string;
  /** Server Action que inicia o fluxo OAuth (aceita FormData com `next`). */
  action: (formData?: FormData) => Promise<void>;
};

/**
 * Registry único dos providers OAuth visíveis na UI. Todas as superfícies de
 * login (`<ProviderSignIn>`, dropdown "Entrar" do cabeçalho, `/entrar`)
 * derivam daqui - adicionar/remover um provider é: wrapper em `actions.ts` +
 * uma entrada nesta lista, sem tocar nos componentes.
 *
 * Hoje só tem Google (o email + código OTP é um fluxo de 2 passos à parte,
 * em `<EmailOtpSignIn>`). Microsoft/Entra foi removido em 10-06-2026.
 *
 * Vive num módulo próprio (não em `actions.ts`) porque ficheiros `'use server'`
 * só podem exportar funções async - uma constante lá seria erro de build.
 * O primeiro elemento é o provider primário (botão sólido laranja).
 */
export const SIGN_IN_PROVIDERS: readonly SignInProvider[] = [
  { slug: 'google', label: 'Google', action: signInWithGoogleAction },
];
