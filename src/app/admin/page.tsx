import { getCurrentUser } from '@/lib/auth';

export const metadata = {
  title: 'Área admin · Logos',
};

const ROLE_LABEL: Record<'admin' | 'super_admin', string> = {
  admin: 'Administrador',
  super_admin: 'Super administrador',
};

export default async function AdminHomePage() {
  // Layout já garante user !== null e role !== 'user'. TS não sabe disso,
  // por isso voltamos a ler — o cache de pedido evita query duplicada.
  const user = await getCurrentUser();
  if (!user || user.role === 'user') return null;

  const label = ROLE_LABEL[user.role];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-muted-foreground text-sm">{label}</p>
        <h1 className="font-display text-ink mt-1 text-3xl font-medium tracking-tight">
          Olá, {user.displayName.split(/\s+/)[0]}.
        </h1>
      </header>
      <section className="text-ink/80 max-w-prose space-y-3 text-sm leading-relaxed">
        <p>
          Esta é a área de gestão do Logos. À medida que as versões avançam, vais encontrar aqui
          ferramentas para criar cursos, módulos e aulas, atribuir etiquetas a utilizadores, e rever
          estatísticas de uso.
        </p>
        {user.role === 'super_admin' && (
          <p>
            Como super administrador, podes ainda promover outros utilizadores a administradores em{' '}
            <span className="font-medium">Utilizadores</span>.
          </p>
        )}
      </section>
    </div>
  );
}
