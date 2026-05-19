import Link from 'next/link';

type BreadcrumbProps = {
  courseTitle?: string;
  /** ID do curso — necessário quando há `moduleTitle` para o link voltar a apontar à página do curso. */
  courseId?: string;
  moduleTitle?: string;
};

/**
 * Breadcrumb visível apenas em mobile (sidebar admin está `hidden md:block`,
 * por isso em mobile o utilizador precisa de uma forma de voltar atrás). Em
 * desktop é redundante.
 *
 * Suporta dois níveis de drill-down:
 *   - Cursos › Curso (página do curso)
 *   - Cursos › Curso › Módulo (página de aulas)
 */
export function ConteudosBreadcrumb({ courseTitle, courseId, moduleTitle }: BreadcrumbProps) {
  const showModule = Boolean(moduleTitle && courseId);
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground mb-6 flex items-center gap-2 text-xs md:hidden"
    >
      <Link href="/admin/conteudos" className="hover:text-ink transition-colors">
        Cursos
      </Link>
      {courseTitle ? (
        <>
          <span aria-hidden="true">›</span>
          {showModule ? (
            <Link
              href={`/admin/conteudos/${courseId}`}
              className="hover:text-ink line-clamp-1 transition-colors"
            >
              {courseTitle}
            </Link>
          ) : (
            <span className="text-ink line-clamp-1">{courseTitle}</span>
          )}
        </>
      ) : null}
      {showModule ? (
        <>
          <span aria-hidden="true">›</span>
          <span className="text-ink line-clamp-1">{moduleTitle}</span>
        </>
      ) : null}
    </nav>
  );
}
