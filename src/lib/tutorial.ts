/**
 * Conteúdo do tutorial "Como funciona" (página `/como-funciona`) e do convite
 * de 1.ª visita. Uma entrada por feature.
 *
 * Os vídeos são **embeds do YouTube** (regra dura: não alojamos vídeo). Enquanto
 * não existirem, `youtubeUrl` fica `null` e a UI mostra um placeholder "em
 * breve". Para publicar um vídeo, mete aqui a URL (`youtu.be/<id>` ou
 * `youtube.com/watch?v=<id>`) - o resto trata-se sozinho.
 */
export type TutorialStep = {
  /** Âncora estável (`/como-funciona#<slug>`). */
  slug: string;
  title: string;
  description: string;
  /** URL YouTube do vídeo demonstrativo, ou `null` enquanto não existir. */
  youtubeUrl: string | null;
};

export const tutorialSteps: readonly TutorialStep[] = [
  {
    slug: 'encontrar-cursos',
    title: 'Encontrar e inscrever em cursos',
    description:
      'No separador Conteúdos vês todos os cursos disponíveis. Abre um curso para conheceres os módulos e as aulas e inscreve-te para o guardares em "Os meus cursos".',
    youtubeUrl: null,
  },
  {
    slug: 'ver-aula',
    title: 'Ver uma aula',
    description:
      'Cada aula tem o vídeo e, quando existe, a apostila em PDF para descarregares. Navegas pelas aulas do curso pela árvore lateral ou pelos botões de avançar e recuar.',
    youtubeUrl: null,
  },
  {
    slug: 'marcar-concluida',
    title: 'Marcar como concluída',
    description:
      'Quando terminas uma aula, marca-a como concluída. O curso mostra o que já fizeste e, quando concluis tudo, aparece o ecrã de curso concluído - simples, sem percentagens.',
    youtubeUrl: null,
  },
  {
    slug: 'perguntas-live',
    title: 'Perguntas e transmissões Live',
    description:
      'Tens uma dúvida numa aula? Usa o campo de perguntas e a equipa responde-te - acompanhas tudo em "Conversas". Quando houver uma transmissão em direto, o botão Live abre-a aqui no portal.',
    youtubeUrl: null,
  },
];
