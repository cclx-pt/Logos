export const siteConfig = {
  name: 'LOGOS',
  url: 'https://logos.cclx.pt',
  description:
    'Plataforma de estudo Bíblico da CCLX. Cursos para crescer no conhecimento das Escrituras.',
  organization: {
    name: 'CCLX',
    fullName: 'Comunidade Cristã de Lisboa',
    website: 'https://cclx.pt',
    email: 'logos@cclx.pt',
  },
} as const;

export type NavItem = {
  href: string;
  label: string;
};

/**
 * Navegação do cabeçalho, por ordem de leitura (esquerda → direita):
 * Live → institucionais → Conteúdos → páginas de conta. O Live é renderizado
 * à parte (`LiveNavLink`, dinâmico) e fica em primeiro. O menu mobile segue a
 * mesma ordem.
 *
 * Os itens de conta (`accountNavItems` + "As minhas conversas", esta última
 * renderizada à parte pelo `ConversasLink`) **só aparecem depois do login**.
 * "Conteúdos" é público - o catálogo é visível mesmo deslogado.
 */
export const institutionalNavItems: readonly NavItem[] = [
  { href: '/conhece-nos', label: 'Conhece-nos' },
  { href: '/fala-connosco', label: 'Fala connosco' },
] as const;

/** Conteúdos é público (catálogo visível a deslogados). */
export const publicContentNavItems: readonly NavItem[] = [
  { href: '/conteudos', label: 'Conteúdos' },
] as const;

/** Páginas de conta - só aparecem depois do login. */
export const accountNavItems: readonly NavItem[] = [
  { href: '/meus-cursos', label: 'Meus cursos' },
] as const;

export const navItems: readonly NavItem[] = [
  ...institutionalNavItems,
  ...publicContentNavItems,
  ...accountNavItems,
] as const;
