import { BarChart3, Users, CheckCircle2 } from 'lucide-react';

import { getServerClient } from '@/lib/auth';
import { getCourseStats } from '@/lib/courses/stats';
import { StatCard } from '@/components/admin/stat-card';

type LessonRow = { id: string };

type Props = {
  courseId: string;
};

/**
 * CourseStatsContent — bloco partilhado de estatísticas de um curso.
 * Server Component: faz fetch das contagens (acessos, utilizadores
 * únicos, conclusões de aulas) e renderiza 3 stat cards + notas.
 *
 * Usado dentro da `CollapsibleSection` "Estatísticas" em
 * `/admin/conteudos/[courseId]`. A página standalone `/stats` foi
 * absorvida em V3.3 PR2.
 */
export async function CourseStatsContent({ courseId }: Props) {
  const supabase = await getServerClient();
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', courseId)
    .returns<{ id: string }[]>();

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

  const stats = await getCourseStats(courseId, lessonIds);
  const totalLessons = lessonIds.length;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground max-w-prose text-sm">
        Telemetria leve do curso. Acessos são registados quando alguém clica em{' '}
        <strong>Começar curso</strong> ou <strong>Continuar curso</strong>. Conclusões são contadas
        a partir de aulas marcadas como concluídas pelos utilizadores.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Acessos totais"
          value={stats.totalAccesses}
          hint="Cada clique no CTA conta, incluindo o mesmo utilizador várias vezes."
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
      </div>

      <div className="border-border bg-background rounded-lg border p-4">
        <h3 className="text-ink text-xs font-semibold tracking-wide uppercase">Notas</h3>
        <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            Acessos e utilizadores únicos vêm de <code>course_access_log</code> (RLS dá SELECT só a
            admin/super_admin).
          </li>
          <li>
            Aulas concluídas vêm de <code>lesson_completions</code> e contam toggles activos;
            desmarcar uma aula reduz o número.
          </li>
          <li>
            Não há contagem de &ldquo;utilizadores que concluíram o curso inteiro&rdquo;: V3 não
            escreve em <code>course_completions</code>; deriva on-read na página do curso.
          </li>
        </ul>
      </div>
    </div>
  );
}
