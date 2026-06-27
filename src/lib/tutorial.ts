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
    slug: 'comecar-curso',
    title: 'Encontrar e começar um curso',
    description:
      'Vai a Conteúdos e abre um curso que te interesse. Adiciona-o aos teus cursos e, em "Os meus cursos", inicia-o para começares a aprender.',
    youtubeUrl: 'https://youtu.be/k6OACr38MaM',
  },
  {
    slug: 'avancar-aulas',
    title: 'Avançar e concluir aulas',
    description:
      'Vês cada aula, marca-la como concluída e avanças para a seguinte. Quando terminas as aulas de um módulo, passas ao módulo seguinte.',
    youtubeUrl: 'https://youtu.be/hvHMUKTsuTg',
  },
  {
    slug: 'conversas',
    title: 'Conversas',
    description:
      'Tens uma dúvida numa aula? Deixa a tua pergunta e a equipa responde-te. Acompanhas tudo em "Conversas" e ficas a saber quando há resposta nova.',
    youtubeUrl: 'https://youtu.be/_ib3tdMv4NA',
  },
  {
    slug: 'live',
    title: 'Transmissões Live',
    description:
      'Quando houver uma transmissão em direto, o botão Live fica ativo e abre a emissão aqui mesmo no portal, sem teres de sair para o YouTube.',
    youtubeUrl: 'https://youtu.be/-OHIzXECPLw',
  },
];
