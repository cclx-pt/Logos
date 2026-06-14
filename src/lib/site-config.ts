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
 * Navegação dividida em dois grupos para o cabeçalho desktop respirar:
 *  - `primaryNavItems` (funcionais) ficam à esquerda, junto ao logo.
 *  - `secondaryNavItems` (institucionais: conhece-nos, contacto) ficam à
 *    direita, junto à área de utilizador.
 * O menu mobile junta os dois (`navItems`) na mesma ordem lógica.
 */
export const primaryNavItems: readonly NavItem[] = [
  { href: '/conteudos', label: 'Conteúdos' },
  { href: '/meus-cursos', label: 'Meus cursos' },
] as const;

export const secondaryNavItems: readonly NavItem[] = [
  { href: '/conhece-nos', label: 'Conhece-nos' },
  { href: '/fala-connosco', label: 'Fala connosco' },
] as const;

export const navItems: readonly NavItem[] = [...primaryNavItems, ...secondaryNavItems] as const;
