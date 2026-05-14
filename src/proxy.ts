import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Excluir assets estáticos e ficheiros públicos: poupa ciclos de refresh.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
