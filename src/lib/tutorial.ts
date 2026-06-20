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
    slug: 'marcar-concluida',
    title: 'Marcar como concluída',
    description:
      'Quando terminas uma aula, marca-a como concluída. O curso mostra o que já fizeste e, quando concluis tudo, aparece o ecrã de curso concluído - simples, sem percentagens.',
    youtubeUrl: null,
  },
  {
    slug: 'perguntas',
    title: 'Perguntas e conversas',
    description:
      'Tens uma dúvida numa aula? Usa o campo de perguntas e a equipa responde-te. Acompanhas tudo em "Conversas" e ficas a saber quando há resposta nova.',
    youtubeUrl: null,
  },
  {
    slug: 'live',
    title: 'Transmissões Live',
    description:
      'Quando houver uma transmissão em direto, o botão Live fica ativo e abre a emissão aqui mesmo no portal, sem teres de sair para o YouTube.',
    youtubeUrl: null,
  },
];
