# Spike - áudio das aulas em segundo plano (PR0)

> **Estado:** por correr. Ramo `spike-audio-segundo-plano`. **Descartável - não mergeia em `main`.**
>
> Existe para responder a duas perguntas antes de investir ~2 semanas na funcionalidade
> completa. Quando estiver respondido, este ficheiro fica com os resultados e o ramo é
> apagado; o que sobrevive é a decisão registada no `changelog.md`.

## Porque existe

O plano de áudio das aulas ("modo Spotify" - ouvir com o telemóvel bloqueado) assenta em duas
suposições que **nenhum teste automático consegue provar**. Se qualquer uma for falsa, o resto
do plano não se sustenta.

| # | Pergunta | Se falhar |
|---|---|---|
| **A** | O browser consegue extrair o áudio de um master real da CCLX (ffmpeg.wasm + WORKERFS) sem rebentar a memória? Em quanto tempo? | Cai-se para upload manual de MP3. O admin passa a exportar o áudio fora da app - perde-se o "menos trabalho", ganha-se tudo o resto |
| **B** | Um `<audio>` + Media Session continua a tocar num iPhone e num Android **com o ecrã bloqueado**? | **A funcionalidade não existe.** Parar - não construir mais nada |

**B é eliminatória.** Testar primeiro.

## Onde

`/admin/spike-audio` (fora da nav; chega-se pelo URL directo). Fica sob `/admin` para herdar o
guard do `admin/layout.tsx` - quem não é admin vê 404 PT-PT, como manda a regra de conteúdo
restrito invisível.

## Como testar B (a eliminatória) - 10 minutos

Precisa de um **telemóvel real**. Emuladores e o modo responsivo do browser não servem: o que
se está a testar é o comportamento do sistema operativo quando o ecrã bloqueia.

1. Abrir o preview da Vercel do ramo no telemóvel e entrar em `/admin/spike-audio`
2. Na secção **B**, colar o URL de um MP3 acessível e carregar em **Carregar**.
   **Atenção: tem de estar em `*.supabase.co` ou no próprio site.** A `media-src` da CSP
   (`next.config.ts`) é `'self' blob: https://*.supabase.co` - o MP3 de um podcast público
   qualquer é **bloqueado pela CSP** e o teste falha pela razão errada. Carregar um MP3 para
   o Storage do projeto live e usar um URL assinado de longa duração (é o caminho real da
   PR3, portanto ainda melhor prova)
3. **Tocar**
4. **Bloquear o telemóvel.** Confirmar que:
   - o som continua
   - o ecrã de bloqueio mostra título, curso e imagem
   - os botões do ecrã de bloqueio funcionam (pausa, ±15 s)
5. Esperar 2-3 minutos com o ecrã bloqueado. Trocar de app. Voltar
6. Desbloquear e **ler o Registo**: é ele que diz o que aconteceu enquanto ninguém via. Um
   `pause` ou `stalled` com hora, logo a seguir ao `documento hidden`, é a assinatura da falha

Repetir em **iOS/Safari** e em **Android/Chrome**. Os dois têm de passar.

> Nota: preferir um URL a um blob. Um ficheiro convertido em blob vive na memória do
> separador e não prova o caminho real (streaming por HTTP, com Range requests).

> **Como chegar à página no telemóvel** (dois portões, ambos por ultrapassar antes do teste):
> 1. Os previews estão atrás de **Vercel Authentication** desde 25-08-2026 - fazer login da
>    Vercel nesse browser primeiro, senão o URL responde 302 e nunca se chega à app
> 2. `/admin/spike-audio` exige sessão de **admin**. O login **Google não funciona em URLs de
>    preview** (falta `https://logos-*-jcrninjas-projects.vercel.app/**` nas Redirect URLs do
>    Supabase - item ⏳ do `status.md`): ou se acrescenta lá o wildcard, ou se entra por
>    **email OTP**, que não depende de redirect URLs

## Como testar A

1. Na secção **A**, escolher um ficheiro de vídeo master real (quanto maior, melhor - é o caso
   difícil que interessa)
2. A primeira conversão descarrega ~32 MB do core do ffmpeg. É uma vez por sessão
3. Registar da tabela de resultados: **tamanho de entrada, tamanho de saída, redução, tempo**

**Referência esperada:** 64 kbps mono ≈ 28,8 MB/hora, logo uma aula de 45 min deve dar ~22 MB.
Se a saída for muito maior, o `-b:a 64k` não pegou.

### O que registar

| Métrica | iPhone | Android | Desktop |
|---|---|---|---|
| B: continua a tocar com ecrã bloqueado | | | n/a |
| B: controlos no ecrã de bloqueio | | | n/a |
| B: imagem no ecrã de bloqueio | | | n/a |
| A: master de entrada (MB) | n/a | n/a | **147,3** (29m44s, 720p, AAC 127 kb/s estéreo) |
| A: MP3 de saída (MB) | n/a | n/a | **13,6** (64,0 kb/s mono) |
| A: tempo de conversão | n/a | n/a | **24,5 s** (~80x tempo real) |
| A: pico de memória (DevTools) | n/a | n/a | não medido - não foi preciso, não houve pressão |

## Decisões técnicas já fechadas neste spike

Coisas que custaram a descobrir e que valem para a implementação a sério:

- **Core ESM, não UMD.** O `@ffmpeg/ffmpeg` cria o worker com `{ type: "module" }`
  (`classes.js:110`). Num module worker o `importScripts` rebenta e o `worker.js` cai no catch
  com `await import(coreURL)`. Passar-lhe o build UMD dá um erro obscuro em runtime.
  `scripts/copy-ffmpeg-core.mjs` copia de `dist/esm`
- **O worker tem de ser servido de `/ffmpeg/` e passado em `classWorkerURL`** (descoberto a
  19-09-2026, quando a secção A não fazia nada). Por omissão o `load()` faz
  `new Worker(new URL("./worker.js", import.meta.url))` (`classes.js:110`) - padrão que o
  **Turbopack analisa e empacota**. Dentro do worker está `await import(coreURL)`
  (`worker.js:19`), com um URL que só existe em runtime: o bundler não o resolve, troca-o por
  um stub, e a conversão morre com **`Cannot find module as expression is too dynamic`**. O
  `/* @vite-ignore */` que o pacote traz nessa linha serve o Vite, não o Turbopack. Com
  `classWorkerURL: '/ffmpeg/worker.js'` o `load()` vai pelo ramo de `classes.js:105`
  (`new Worker(new URL(<variável>, ...))`, que o bundler não consegue analisar e deixa em
  paz): o ficheiro é servido tal e qual e o import volta a ser nativo do browser. O
  `worker.js` importa `./const.js` e `./errors.js` - ambos folhas -, por isso **os três**
  viajam para `public/ffmpeg/`. As duas metades falham em silêncio se alguma se perder, logo
  ficam travadas por `src/test/ffmpeg-worker-assets.test.ts`
- **E o `classWorkerURL` tem de ser absoluto** (segunda armadilha, encadeada na primeira). O
  `load()` faz `new Worker(new URL(classWorkerURL, import.meta.url))`, e em produção o
  Turbopack compila o `import.meta.url` para um `file://` - o caminho do ficheiro em build,
  não o URL do site. Um caminho relativo (`'/ffmpeg/worker.js'`) resolve contra essa base e dá
  **`Failed to construct 'Worker': Script at 'file:///ffmpeg/worker.js' cannot be accessed from
  origin ...`**. Com `${window.location.origin}/ffmpeg/worker.js` o `new URL` ignora a base.
  Só o `classWorkerURL` precisa disto: o `coreURL` e o `wasmURL` são resolvidos **dentro** do
  worker, contra o URL do próprio worker, que já está certo
- **Core servido de `/ffmpeg/`, não de CDN.** Por omissão o `@ffmpeg/ffmpeg` aponta para
  `unpkg.com` (`const.js:CORE_URL`). Copiar de `node_modules` no build evita uma CDN de
  terceiros no caminho crítico do admin *e* na CSP, sem meter 32 MB no git
  (`public/ffmpeg/` está no `.gitignore`). Há teste que trava a reintrodução de CDNs
- **`@ffmpeg/core` 0.12.x é single-thread.** Não usa `SharedArrayBuffer`, logo não obriga a
  headers COOP/COEP - que partiriam os iframes do YouTube e do Turnstile
- **WORKERFS, não MEMFS.** MEMFS copia o ficheiro todo para dentro da memória do wasm (teto de
  ~2 GB); WORKERFS monta o `File` e lê-o preguiçosamente. É o que decide se masters grandes passam
- **CSP.** Precisou de três mudanças em `next.config.ts`, todas com teste em
  `src/test/security-headers.test.ts`:
  - `script-src 'wasm-unsafe-eval'` - compilar WebAssembly. É o mínimo, **não** é o
    `'unsafe-eval'` geral
  - `worker-src 'self' blob:` - sem isto o worker do ffmpeg não nasce e a conversão morre calada
  - `media-src 'self' blob: https://*.supabase.co` - **não havia directiva `media-src`**, logo
    caía em `default-src 'self'`. Sem ela, o 302 do futuro route handler `/audio` para a signed
    URL do bucket seria bloqueado, e o áudio não tocaria sem erro óbvio
- **`<audio>`, nunca Web Audio.** O `AudioContext` do iOS é suspenso assim que o ecrã bloqueia
  ([WebKit #237878](https://bugs.webkit.org/show_bug.cgi?id=237878)). Trocar o elemento por um
  grafo de Web Audio (equalizador, normalização de volume) desliga a reprodução em segundo
  plano **em silêncio**. Está em comentário no leitor

## Resultados

> Preencher depois de correr. Enquanto estiver assim, o plano de áudio está por validar.

**A - extracção: PASSA** (19-09-2026, desktop). Um master real da CCLX
(`Fundamentos da Fé Módulo 1 - Aula 3.mp4`, **147,3 MB**, 29m44s) converteu em
**24,5 s** para **13,6 MB**, a ~80x tempo real. O WORKERFS aguentou sem copiar o ficheiro
para dentro da memória do wasm, e o `-b:a 64k` pegou (o log fecha em `bitrate= 64.0kbits/s`).
Extrapolando para uma aula de 45 min: **~21 MB, ~37 s**. A primeira conversão da sessão paga
~4 s a carregar o core; as seguintes não.

> Detalhe que parece mau e não é: no fim do log aparece `Aborted()`, **depois** de o ficheiro
> estar completo (o `PRONTO` vem logo a seguir). É o `exit()` do ffmpeg a derrubar o runtime
> emscripten no fim da execução. Só seria problema se a mesma instância fosse reutilizada -
> o código cria uma `new FFmpeg()` por conversão, por isso não é.

**Consequência para o plano:** a extração no browser fica de pé, logo o admin **não** precisa
de exportar o áudio por fora. O "menos trabalho" mantém-se.

**B - segundo plano:** _por correr_

**Decisão:** _por tomar_
