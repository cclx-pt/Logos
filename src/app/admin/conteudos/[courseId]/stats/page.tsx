import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3, Users, CheckCircle2 } from 'lucide-react';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { getCourseStats } from '@/lib/courses/stats';

export const metadata = {
  title: 'Estatísticas · Área admin · LOGOS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ courseId: string }>;
};

type CourseRow = { id: string; title: string };
type LessonRow = { id: string };

export default async function CourseStatsPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    notFound();
  }

  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) {
    notFound();
  }

  const supabase = await getServerClient();
  const [{ data: course, error: courseError }, { data: modules, error: modulesError }] =
    await Promise.all([
      supabase.from('courses').select('id, title').eq('id', courseId).maybeSingle<CourseRow>(),
      supabase.from('modules').select('id').eq('course_id', courseId).returns<{ id: string }[]>(),
    ]);

  if (courseError) {
    throw new Error(`Falha a carregar curso: ${courseError.message}`);
  }
  if (!course) {
    notFound();
  }
  if (modulesError) {
    throw new Error(`Falha a carregar módulos: ${modulesError.message}`);
  }

  const moduleIds = (modules ?? []).map((m) => m.id);
  let lessonIds: string[] = [];
  if (moduleIds.length > 0) {
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)
      .returns<LessonRow[]>();
    if (lessonsError) {
      throw new Error(`Falha a carregar aulas: ${lessonsError.message}`);
    }
    lessonIds = (lessons ?? []).map((l) => l.id);
  }

  const stats = await getCourseStats(course.id, lessonIds);
  const totalLessons = lessonIds.length;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-xs">
        <Link href="/admin/conteudos" className="hover:text-ink transition-colors">
          Conteúdos
        </Link>
        <span aria-hidden="true" className="mx-2">
          ›
        </span>
        <Link href={`/admin/conteudos/${course.id}`} className="hover:text-ink transition-colors">
          {course.title}
        </Link>
        <span aria-hidden="true" className="mx-2">
          ›
        </span>
        <span className="text-ink">Estatísticas</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
          Estatísticas de {course.title}
        </h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          Telemetria leve do curso. Acessos são registados quando alguém clica em{' '}
          <strong>Começar curso</strong> ou <strong>Continuar curso</strong>. Conclusões são
          contadas a partir de aulas marcadas como concluídas pelos utilizadores.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Acessos totais"
          value={stats.totalAccesses}
          hint="Cada clique no CTA conta — incluindo o mesmo utilizador várias vezes."
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Utilizadores únicos"
          value={stats.uniqueUsers}
          hint="Pessoas distintas que abriram o curso pelo menos uma vez."
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Aulas concluídas"
          value={stats.lessonCompletions}
          hint={
            totalLessons > 0
              ? `De ${totalLessons} aula${totalLessons === 1 ? '' : 's'} disponíveis no curso.`
              : 'Este curso ainda não tem aulas.'
          }
        />
      </section>

      <section className="border-border bg-card rounded-xl border p-6">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">Notas</h2>
        <ul className="text-muted-foreground mt-3 list-inside list-disc space-y-1 text-sm">
          <li>
            Acessos e utilizadores únicos vêm de <code>course_access_log</code> (RLS dá SELECT só a
            admin/super_admin).
          </li>
          <li>
            Aulas concluídas vêm de <code>lesson_completions</code> e contam toggles activos —
            desmarcar uma aula reduz o número.
          </li>
          <li>
            Não há contagem de &ldquo;utilizadores que concluíram o curso inteiro&rdquo; — V3 não
            escreve em <code>course_completions</code>; deriva on-read na página do curso.
          </li>
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="text-orange-primary flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <p className="font-display text-ink mt-3 text-4xl font-medium tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-2 text-xs">{hint}</p>
    </div>
  );
}
