export const siteConfig = {
  name: 'Logos',
  url: 'https://logos.cclx.pt',
  description:
    'Plataforma de estudo bíblico da CCLX — cursos para crescer no conhecimento das Escrituras.',
  organization: {
    name: 'CCLX',
    fullName: 'Comunidade Cristã Lisboa',
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
  { href: '/fala-connosco', label: 'Fala connosco' },
] as const;
