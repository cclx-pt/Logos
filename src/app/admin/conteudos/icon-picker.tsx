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
  HelpCircle,
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
 * IconPicker — seletor visual de ícone para CourseForm (e futuras entidades
 * que precisem de ícone). Server Component puro: usa `<input type="radio">`
 * para deixar o navegador tratar da escolha e o `:checked` da CSS para
 * destacar a selecção. Zero JavaScript no cliente.
 *
 * O valor submetido em `formData.get('icon')` é o slug kebab-case do ícone
 * (ex.: `book-open`) — mesmo formato que a coluna `courses.icon` já guardava.
 * Se o curso tem um valor pré-existente fora da lista curada (legacy ou
 * digitado manualmente), preserva-se como entrada extra "Personalizado".
 */
type IconDef = {
  /** Valor kebab-case guardado em DB. */
  slug: string;
  /** Componente Lucide a renderizar. */
  Component: LucideIcon;
  /** Etiqueta acessível PT-PT (tooltip + sr-only). */
  label: string;
};

const ICONS: IconDef[] = [
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

type Props = { selected: string | null };

export function IconPicker({ selected }: Props) {
  const trimmed = selected?.trim() ?? '';
  const isKnown = trimmed.length > 0 && ICONS.some((icon) => icon.slug === trimmed);
  const showCustom = trimmed.length > 0 && !isKnown;

  return (
    <fieldset className="border-border rounded-md border p-4">
      <legend className="text-muted-foreground px-1 text-xs font-medium">
        Ícone do curso (opcional)
      </legend>
      <p className="text-muted-foreground mb-3 text-xs">
        Aparece no cartão do curso no catálogo. Escolhe um ou deixa em branco.
      </p>

      <div
        role="radiogroup"
        aria-label="Ícone do curso"
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10"
      >
        <label
          title="Sem ícone"
          className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary focus-within:ring-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors focus-within:ring-2"
        >
          <input
            type="radio"
            name="icon"
            value=""
            defaultChecked={trimmed.length === 0}
            className="sr-only"
          />
          <span aria-hidden="true" className="text-muted-foreground text-lg">
            —
          </span>
          <span className="sr-only">Sem ícone</span>
        </label>

        {ICONS.map(({ slug, Component, label }) => (
          <label
            key={slug}
            title={label}
            className="border-border bg-background text-ink hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary has-checked:text-orange-primary focus-within:ring-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors focus-within:ring-2"
          >
            <input
              type="radio"
              name="icon"
              value={slug}
              defaultChecked={trimmed === slug}
              className="sr-only"
            />
            <Component aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </label>
        ))}

        {showCustom ? (
          <label
            title={`Personalizado: ${trimmed}`}
            className="border-destructive/40 bg-destructive/5 text-destructive has-checked:bg-destructive/10 has-checked:border-destructive focus-within:ring-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors focus-within:ring-2"
          >
            <input type="radio" name="icon" value={trimmed} defaultChecked className="sr-only" />
            <HelpCircle aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Personalizado: {trimmed}</span>
          </label>
        ) : null}
      </div>

      {showCustom ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Este curso tem o ícone personalizado <code className="text-destructive">{trimmed}</code>{' '}
          (fora da lista). Mantém-se se não escolheres outro.
        </p>
      ) : null}
    </fieldset>
  );
}
