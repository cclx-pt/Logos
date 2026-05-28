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

export const navItems: readonly NavItem[] = [
  { href: '/conhece-nos', label: 'Conhece-nos' },
  { href: '/conteudos', label: 'Conteúdos' },
  { href: '/meus-cursos', label: 'Meus cursos' },
  { href: '/fala-connosco', label: 'Fala Connosco' },
] as const;
