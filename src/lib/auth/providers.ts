import { signInWithGoogleAction, signInWithMicrosoftAction } from './actions';

export type SignInProvider = {
  /** Slug do provider no Supabase Auth (Microsoft = `azure`). */
  slug: 'google' | 'azure';
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
 * Vive num módulo próprio (não em `actions.ts`) porque ficheiros `'use server'`
 * só podem exportar funções async - uma constante lá seria erro de build.
 * O primeiro elemento é o provider primário (botão sólido laranja).
 */
export const SIGN_IN_PROVIDERS: readonly SignInProvider[] = [
  { slug: 'google', label: 'Google', action: signInWithGoogleAction },
  { slug: 'azure', label: 'Microsoft', action: signInWithMicrosoftAction },
];
