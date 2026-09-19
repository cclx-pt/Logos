/**
 * Regressao do arranque do ffmpeg.wasm no browser.
 *
 * Razao de existir: o @ffmpeg/ffmpeg cria o worker, por omissao, com
 * `new Worker(new URL("./worker.js", import.meta.url))`. Esse padrao e
 * statically analisavel, por isso o Turbopack **empacota o worker** - e dentro
 * dele esta `await import(coreURL)`, com um URL que so existe em runtime. O
 * bundler nao o resolve, troca-o por um stub, e a conversao morre com
 * "Cannot find module as expression is too dynamic". O `/* @vite-ignore *\/`
 * que o pacote traz nessa linha serve o Vite; o Turbopack ignora-o.
 *
 * A saida e servir o worker de /ffmpeg/ (copiado de node_modules no build) e
 * passa-lo em `classWorkerURL`, para o bundler nunca lhe tocar. Sao duas metades
 * da mesma correccao e falham em silencio se alguma se perder - dai este teste.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('arranque do ffmpeg.wasm', () => {
  it('serve o worker do @ffmpeg/ffmpeg de /ffmpeg/, com as folhas que ele importa', () => {
    const script = read('scripts', 'copy-ffmpeg-core.mjs');

    // worker.js importa ./const.js e ./errors.js; sem os tres, o worker
    // servido de /ffmpeg/ da 404 nos imports e nao arranca.
    for (const file of ['worker.js', 'const.js', 'errors.js']) {
      expect(script).toContain(file);
    }
    for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
      expect(script).toContain(file);
    }
  });

  it('passa classWorkerURL ao load(), senao o Turbopack empacota o worker', () => {
    const client = read('src', 'app', 'admin', 'spike-audio', 'spike-audio-client.tsx');

    expect(client).toContain('classWorkerURL');
    // Absoluto: um caminho relativo resolve contra `import.meta.url`, que o
    // Turbopack compila para file:// em producao, e o Worker rebenta com
    // "Script at 'file:///ffmpeg/worker.js' cannot be accessed from origin".
    expect(client).toContain('window.location.origin}/ffmpeg/worker.js');
  });
});
