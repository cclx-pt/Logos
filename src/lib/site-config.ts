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
 * institucionais → Live → funcionais. O Live é renderizado à parte
 * (`LiveNavLink`, dinâmico) entre os dois grupos. O menu mobile segue a mesma
 * ordem. As páginas pessoais (conversas, admin, perfil) ficam à direita, fora
 * destes grupos.
 */
export const institutionalNavItems: readonly NavItem[] = [
  { href: '/conhece-nos', label: 'Conhece-nos' },
  { href: '/fala-connosco', label: 'Fala connosco' },
] as const;

export const functionalNavItems: readonly NavItem[] = [
  { href: '/conteudos', label: 'Conteúdos' },
  { href: '/meus-cursos', label: 'Meus cursos' },
] as const;

export const navItems: readonly NavItem[] = [
  ...institutionalNavItems,
  ...functionalNavItems,
] as const;
