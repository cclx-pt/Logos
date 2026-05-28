import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser, getServerClient, ROLE_LABEL, type SupabaseUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Perfil',
  description: 'A tua área pessoal no LOGOS.',
};

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function avatarUrl(user: SupabaseUser): string | null {
  const meta = user.user_metadata as Record<string, unknown> | null;
  const candidate = meta?.['avatar_url'] ?? meta?.['picture'];
  return typeof candidate === 'string' && candidate.startsWith('https://') ? candidate : null;
}

export default async function PerfilPage() {
  const profile = await getCurrentUser();
  if (!profile) {
    notFound();
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const photo = avatarUrl(user);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={96}
            height={96}
            referrerPolicy="no-referrer"
            className="border-border h-24 w-24 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="border-border bg-muted text-ink font-display flex h-24 w-24 shrink-0 items-center justify-center rounded-full border text-2xl font-medium"
          >
            {initials(profile.displayName)}
          </div>
        )}
        <div className="text-center sm:text-left">
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
            {profile.displayName}
          </h1>
          <p className="text-muted-foreground mt-1 font-sans text-sm">{ROLE_LABEL[profile.role]}</p>
        </div>
      </header>

      <dl className="border-border bg-border mt-12 grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
        <div className="bg-background px-5 py-4">
          <dt className="text-muted-foreground font-sans text-xs tracking-wide uppercase">Nome</dt>
          <dd className="text-ink mt-1 font-sans text-sm">{profile.displayName}</dd>
        </div>
        <div className="bg-background px-5 py-4">
          <dt className="text-muted-foreground font-sans text-xs tracking-wide uppercase">Email</dt>
          <dd className="text-ink mt-1 font-sans text-sm break-all">
            {user.email ?? 'Sem email associado'}
          </dd>
        </div>
        <div className="bg-background px-5 py-4">
          <dt className="text-muted-foreground font-sans text-xs tracking-wide uppercase">Papel</dt>
          <dd className="text-ink mt-1 font-sans text-sm">{ROLE_LABEL[profile.role]}</dd>
        </div>
        <div className="bg-background px-5 py-4">
          <dt className="text-muted-foreground font-sans text-xs tracking-wide uppercase">
            Conta criada em
          </dt>
          <dd className="text-ink mt-1 font-sans text-sm">
            {new Date(profile.createdAt).toLocaleDateString('pt-PT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </dd>
        </div>
      </dl>

      <p className="text-muted-foreground mt-10 font-sans text-sm">
        Edição de perfil em breve. Por agora, alterações ao nome ou foto são geridas na tua conta
        Google.
      </p>
    </section>
  );
}
