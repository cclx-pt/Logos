import { getCurrentUser } from '@/lib/auth';

import { FirstVisitTutorial } from './first-visit-tutorial';

/**
 * Gate server-side do convite de 1.ª visita: só renderiza o banner se houver
 * sessão iniciada. Para anónimos não aparece nada. A lógica de "mostrar uma vez
 * por browser" (localStorage) vive no `FirstVisitTutorial` (cliente).
 */
export async function FirstVisitTutorialGate() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <FirstVisitTutorial userId={user.id} />;
}
