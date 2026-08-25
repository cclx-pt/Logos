/**
 * Copia o core do ffmpeg.wasm de `node_modules/@ffmpeg/core` para
 * `public/ffmpeg/`, para ser servido same-origin.
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
 */

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const to = join(root, 'public', 'ffmpeg');

const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(from))) {
    console.error(
      '[ffmpeg-core] Nao encontrei @ffmpeg/core em node_modules. Corre `pnpm install` primeiro.',
    );
    process.exit(1);
  }

  await mkdir(to, { recursive: true });

  let copied = 0;
  for (const file of FILES) {
    const src = join(from, file);
    const dest = join(to, file);

    // Salta se ja la esta com o mesmo tamanho - o .wasm tem 32 MB e isto corre
    // a cada `pnpm dev`.
    const [srcStat, destStat] = await Promise.all([stat(src), stat(dest).catch(() => null)]);
    if (destStat && destStat.size === srcStat.size) continue;

    await copyFile(src, dest);
    copied += 1;
  }

  console.log(
    copied === 0
      ? '[ffmpeg-core] Ja actualizado em public/ffmpeg/.'
      : `[ffmpeg-core] ${copied} ficheiro(s) copiado(s) para public/ffmpeg/.`,
  );
}

await main();
