/**
 * Copia o core do ffmpeg.wasm **e o worker do @ffmpeg/ffmpeg** de
 * `node_modules/` para `public/ffmpeg/`, para serem servidos same-origin.
 *
 * Porque existe:
 *   - O `@ffmpeg/ffmpeg` carrega o core (um .js + um .wasm de ~32 MB) em
 *     runtime, a partir de um URL. Por omissao aponta para uma CDN publica
 *     (unpkg), o que obrigaria a abrir `connect-src` a um dominio externo na
 *     CSP e poria uma dependencia de terceiros no caminho critico do admin.
 *   - Meter os 32 MB directamente em `public/` versionado incharia o git para
 *     sempre.
 *   - Copiar do pacote pnpm no arranque resolve as duas: o binario vem do
 *     lockfile (auditavel por `pnpm audit`), e `public/ffmpeg/` esta no
 *     .gitignore.
 *
 * Corre no `dev` e no `build` (ver package.json). Nao usamos os hooks
 * `predev`/`prebuild` porque o pnpm tem `enable-pre-post-scripts=false` por
 * omissao desde a v7 - nao correriam.
 *
 * Usa a versao **ESM**, nao a UMD. O @ffmpeg/ffmpeg cria o worker com
 * `{ type: "module" }` (`classes.js:110`); num module worker o `importScripts`
 * rebenta, e o `worker.js` cai no catch e faz `await import(coreURL)`. Passar-lhe
 * o build UMD daria um erro obscuro em runtime.
 *
 * O pacote @ffmpeg/core (0.12.x) e o build **single-thread**: nao precisa de
 * SharedArrayBuffer, logo nao obriga a headers COOP/COEP - que partiriam os
 * iframes do YouTube e do Turnstile.
 *
 * ---------------------------------------------------------------------------
 * PORQUE E QUE O WORKER TAMBEM VEM PARA CA (nao e detalhe - era o que partia)
 * ---------------------------------------------------------------------------
 * Por omissao o `load()` faz `new Worker(new URL("./worker.js", import.meta.url),
 * { type: "module" })` (`classes.js:110`). Esse padrao e *statically analisavel*,
 * por isso o **Turbopack empacota o worker** - e dentro dele esta
 * `await import(_coreURL)` (`worker.js:19`), com um URL que so existe em runtime.
 * O bundler nao consegue resolver, troca o import por um stub, e a conversao
 * morre com **"Cannot find module as expression is too dynamic"**. O
 * `/* @vite-ignore *\/` que o pacote traz nessa linha serve o Vite; o Turbopack
 * ignora-o.
 *
 * Copiando o worker para `public/ffmpeg/` e passando-lhe `classWorkerURL`, o
 * `load()` vai pelo ramo de `classes.js:105` (`new Worker(new URL(<variavel>,
 * ...))`, que o bundler nao consegue analisar e por isso deixa em paz): o
 * ficheiro e servido tal e qual, e o `await import()` volta a ser um import
 * nativo do browser, com um URL de runtime, que e o que sempre devia ter sido.
 *
 * O `worker.js` importa `./const.js` e `./errors.js` - ambos folhas, sem
 * importacoes proprias -, por isso os tres viajam juntos e nada mais e preciso.
 */

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const to = join(root, 'public', 'ffmpeg');

const SOURCES = [
  {
    from: join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm'),
    pkg: '@ffmpeg/core',
    files: ['ffmpeg-core.js', 'ffmpeg-core.wasm'],
  },
  {
    from: join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm'),
    pkg: '@ffmpeg/ffmpeg',
    // worker.js + as duas folhas que ele importa.
    files: ['worker.js', 'const.js', 'errors.js'],
  },
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const source of SOURCES) {
    if (!(await exists(source.from))) {
      console.error(
        `[ffmpeg-core] Nao encontrei ${source.pkg} em node_modules. Corre \`pnpm install\` primeiro.`,
      );
      process.exit(1);
    }
  }

  await mkdir(to, { recursive: true });

  let copied = 0;
  for (const source of SOURCES) {
    for (const file of source.files) {
      const src = join(source.from, file);
      const dest = join(to, file);

      // Salta se ja la esta com o mesmo tamanho - o .wasm tem 32 MB e isto
      // corre a cada `pnpm dev`.
      const [srcStat, destStat] = await Promise.all([stat(src), stat(dest).catch(() => null)]);
      if (destStat && destStat.size === srcStat.size) continue;

      await copyFile(src, dest);
      copied += 1;
    }
  }

  console.log(
    copied === 0
      ? '[ffmpeg-core] Ja actualizado em public/ffmpeg/.'
      : `[ffmpeg-core] ${copied} ficheiro(s) copiado(s) para public/ffmpeg/.`,
  );
}

await main();
