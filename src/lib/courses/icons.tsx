import {
  Anchor,
  Book,
  BookMarked,
  BookOpen,
  Bookmark,
  Calendar,
  Church,
  Clock,
  Compass,
  Cross,
  FileText,
  Flame,
  Footprints,
  GraduationCap,
  HandHeart,
  Handshake,
  Headphones,
  Heart,
  Home,
  Hourglass,
  Key,
  Leaf,
  Library,
  Lightbulb,
  Map,
  MapPin,
  Megaphone,
  MessageCircle,
  Mic,
  Moon,
  Mountain,
  Music,
  Notebook,
  Pencil,
  Quote,
  Route,
  ScrollText,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Sun,
  TreePine,
  UserPlus,
  Users,
  Wheat,
  Wine,
  type LucideIcon,
} from 'lucide-react';

/**
 * Registry partilhado dos ícones disponíveis para cursos. Fonte única usada
 * por:
 *   - `IconPicker` no admin (escolha visual ao criar/editar curso).
 *   - `CourseIcon` no catálogo público (renderiza o ícone escolhido).
 *
 * Os ícones são guardados na coluna `courses.icon` como o `slug` kebab-case
 * (ex.: `book-open`). Slugs fora desta lista são tolerados — o catálogo cai
 * num ícone fallback (BookOpen) e o admin marca-os como "Personalizado".
 */
export type CourseIconDef = {
  slug: string;
  Component: LucideIcon;
  /** Etiqueta acessível em PT-PT (tooltip / aria-label). */
  label: string;
};

export const COURSE_ICONS: CourseIconDef[] = [
  { slug: 'book-open', Component: BookOpen, label: 'Livro aberto' },
  { slug: 'book', Component: Book, label: 'Livro' },
  { slug: 'book-marked', Component: BookMarked, label: 'Livro marcado' },
  { slug: 'library', Component: Library, label: 'Biblioteca' },
  { slug: 'scroll-text', Component: ScrollText, label: 'Pergaminho' },
  { slug: 'file-text', Component: FileText, label: 'Documento' },
  { slug: 'notebook', Component: Notebook, label: 'Caderno' },
  { slug: 'pencil', Component: Pencil, label: 'Lápis' },
  { slug: 'cross', Component: Cross, label: 'Cruz' },
  { slug: 'church', Component: Church, label: 'Igreja' },
  { slug: 'heart', Component: Heart, label: 'Coração' },
  { slug: 'hand-heart', Component: HandHeart, label: 'Mão e coração' },
  { slug: 'sparkles', Component: Sparkles, label: 'Brilho' },
  { slug: 'flame', Component: Flame, label: 'Chama' },
  { slug: 'sun', Component: Sun, label: 'Sol' },
  { slug: 'moon', Component: Moon, label: 'Lua' },
  { slug: 'star', Component: Star, label: 'Estrela' },
  { slug: 'users', Component: Users, label: 'Comunidade' },
  { slug: 'user-plus', Component: UserPlus, label: 'Boas-vindas' },
  { slug: 'handshake', Component: Handshake, label: 'Aperto de mão' },
  { slug: 'shield', Component: Shield, label: 'Escudo' },
  { slug: 'compass', Component: Compass, label: 'Bússola' },
  { slug: 'anchor', Component: Anchor, label: 'Âncora' },
  { slug: 'map', Component: Map, label: 'Mapa' },
  { slug: 'map-pin', Component: MapPin, label: 'Localização' },
  { slug: 'mountain', Component: Mountain, label: 'Montanha' },
  { slug: 'footprints', Component: Footprints, label: 'Pegadas' },
  { slug: 'route', Component: Route, label: 'Caminho' },
  { slug: 'megaphone', Component: Megaphone, label: 'Megafone' },
  { slug: 'message-circle', Component: MessageCircle, label: 'Mensagem' },
  { slug: 'mic', Component: Mic, label: 'Microfone' },
  { slug: 'lightbulb', Component: Lightbulb, label: 'Ideia' },
  { slug: 'calendar', Component: Calendar, label: 'Calendário' },
  { slug: 'clock', Component: Clock, label: 'Relógio' },
  { slug: 'hourglass', Component: Hourglass, label: 'Ampulheta' },
  { slug: 'home', Component: Home, label: 'Casa' },
  { slug: 'music', Component: Music, label: 'Música' },
  { slug: 'headphones', Component: Headphones, label: 'Auscultadores' },
  { slug: 'graduation-cap', Component: GraduationCap, label: 'Formatura' },
  { slug: 'wine', Component: Wine, label: 'Vinho' },
  { slug: 'sprout', Component: Sprout, label: 'Rebento' },
  { slug: 'tree-pine', Component: TreePine, label: 'Árvore' },
  { slug: 'wheat', Component: Wheat, label: 'Trigo' },
  { slug: 'leaf', Component: Leaf, label: 'Folha' },
  { slug: 'quote', Component: Quote, label: 'Citação' },
  { slug: 'bookmark', Component: Bookmark, label: 'Marcador' },
  { slug: 'key', Component: Key, label: 'Chave' },
];

const FALLBACK_ICON: CourseIconDef = COURSE_ICONS[0];

type CourseIconProps = {
  slug: string | null | undefined;
  className?: string;
};

/**
 * Renderiza o ícone Lucide associado a um `slug` de curso. Slugs desconhecidos
 * caem no `FALLBACK_ICON` (book-open) — útil para cursos legacy ou para
 * `icon = null`. Sempre `aria-hidden` porque o nome do curso adjacente já dá
 * contexto a leitores de ecrã.
 */
export function CourseIcon({ slug, className }: CourseIconProps) {
  const trimmed = slug?.trim() ?? '';
  const found = trimmed ? COURSE_ICONS.find((icon) => icon.slug === trimmed) : null;
  const Icon = (found ?? FALLBACK_ICON).Component;
  return <Icon aria-hidden="true" className={className} />;
}
