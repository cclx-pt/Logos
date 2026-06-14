# feature-docs/live.md — Canal LOGOS ao vivo (`/live`)

> **Estado:** entregue (V3.6, antecipação de V6). **Rota:** `/live`. **Nav:** entrada "Live" com badge de estado.
> **Origem:** spec do ministério "Canal YouTube" + SPEC_1.md §V6 (Live Stream), adaptado ao stack Next.js/Vercel.
> **Mecanismo (V3.6):** interruptor admin **"Estamos no ar"/"Terminámos"** (`/admin/live`) + **Supabase Realtime** - a equipa liga a qualquer hora e o estado muda para todos em < 1s, sem recarregar. As janelas de horário passam a fallback opcional.

## 1. O que faz

Entrada de navegação **"Live"** que dá acesso à transmissão em direto do canal
LOGOS no YouTube, reproduzida **dentro do portal** (embed `youtube-nocookie`),
sem redirecionar para o youtube.com.

A equipa **liga a transmissão a qualquer hora** a partir de `/admin/live`, sem
tocar em variáveis de ambiente nem em janelas de horário (ver §1.1). Quando liga,
o estado muda **para todos os visitantes em menos de 1 segundo**, sem recarregar
a página (Supabase Realtime).

- **Ao vivo:** a entrada de nav fica clicável e mostra um badge **"Ao vivo"**
  (vermelho `#FF0000`, ponto a pulsar). Em `/live`, o leitor embebe o
  **`live_stream` do CANAL** (não um `videoId` específico) em 16:9 com `autoplay`:
  a YouTube serve a emissão em curso e, quando ela acaba, um ecrã offline -
  **nunca a gravação (VOD)**. **Durante a emissão não há texto** na página - só o
  leitor e o botão "Subscrever canal" (pedido explícito: sem "espetadores" nem
  descrições por cima do vídeo). O `<h1>` "Live" existe só para leitores de ecrã
  (`sr-only`).
- **A ligar (interruptor ligado, stream ainda por começar):** o leitor mostra o
  embed do canal, que apresenta o ecrã de espera/offline do próprio YouTube até o
  stream arrancar. O `videoId` continua a ser resolvido no servidor, mas só
  alimenta a deteção de fim - já não troca o que o leitor mostra.
- **Offline / terminada:** a entrada de nav aparece a cinzento legível
  (`text-muted-foreground`), badge **"Offline"**, **não clicável**
  (`aria-disabled`, fora do tab order). A página `/live` mostra **"Obrigado por
  assistires, a Live terminou."** O texto só aparece **depois** do fim da live.
- **Subscrever canal:** botão (link) que abre o YouTube já na caixa de
  confirmação de subscrição (`sub_confirmation=1`), visível em qualquer estado.

A entrada de nav e o leitor partilham o mesmo hook (`useLiveStatus`), por isso o
**botão "Live" muda sozinho** quando a emissão começa ou termina (pedido do
utilizador: sem refresh manual).

### 1.1 Interruptor admin (`live_override`) + Realtime

Mecanismo **primário** (V3.6). Em vez de adivinhar pelo horário, a equipa
controla o estado explicitamente:

1. O admin **inicia a emissão no YouTube** e depois abre `/admin/live` e carrega
   **"Estamos no ar"**.
2. O servidor faz **um** `search.list` (100 unidades) para resolver o `videoId`
   da emissão e grava a linha singleton `live_override`
   `{ is_live: true, video_id, armed_until: agora + 45 min }`.
3. A tabela `live_override` está na publicação `supabase_realtime`. Todos os
   clientes recebem o evento `postgres_changes` e fazem refetch imediato ao
   nosso endpoint → ficam "ao vivo" em **< 1s**, sem recarregar.
4. No fim, o admin carrega **"Terminámos"** → `{ is_live: false }` → Realtime →
   offline para todos. (O fim também é detetado sozinho pelo `videos.list`, ver
   §3/§4, caso o admin se esqueça.)

`armed_until` é uma rede de segurança: se a linha ficar `is_live:true` sem
`videoId` resolvido, o servidor tenta resolver durante essa janela (45 min) e
mostra o estado "a ligar"; passada a janela sem stream, cai para offline.

**Sem variáveis de ambiente novas:** o Realtime reutiliza
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A subscrição
do lado do cliente vive em `src/lib/auth/browser-client.ts` (`subscribeToTable`),
respeitando o isolamento de identidade (só `src/lib/auth/**` importa o SDK do
Supabase). A escrita do interruptor é protegida por RLS
(`current_profile_role() in ('admin','super_admin')`).

## 2. Porque não é a arquitetura "Node backend + cache em memória" do spec

O spec original pressupõe um backend de longa duração com uma **cache em memória
partilhada**. Em **Vercel (serverless)** isso não funciona: cada invocação tem a
sua própria memória, efémera — a cache não seria partilhada entre visitantes nem
sobreviveria entre pedidos, e a proteção de quota falharia em silêncio.

Adaptação:

- **"Backend"** → Route Handler `src/app/api/youtube/live-status/route.ts`.
- **"Cache partilhada"** → **Next.js Data Cache**: o `fetch` à YouTube API usa
  `next: { revalidate: TTL }`. É partilhado entre invocações e nativo do Vercel,
  sem infra extra. O cliente faz polling ao **nosso** endpoint (barato), nunca à
  API do YouTube.

## 3. Fronteira de quota (CRÍTICO)

A YouTube Data API v3 dá **10.000 unidades/dia**. `search.list` custa **100
unidades**, `videos.list` **1 unidade**. Como protegemos a quota:

1. **Interruptor admin (primário):** o `search.list` corre essencialmente **uma
   vez por emissão** - quando o admin carrega em "Estamos no ar" para resolver o
   `videoId`. Fora disso, o estado vem da linha `live_override` (leitura à BD,
   **custo zero** de quota) e da confirmação de fim via `videos.list` (1 unidade,
   cache 60s). Sem polling a `search.list`.
2. **Janelas de transmissão (secundário/legado):** quando o interruptor está
   desligado, se houver `YOUTUBE_LIVE_WINDOWS` configuradas, faz-se polling com
   `search.list` **só dentro** dessas janelas (`isWithinLiveWindow`,
   `src/lib/youtube/live-windows.ts`), com **Data Cache** (TTL
   `YOUTUBE_CACHE_TTL_SECONDS`, default 180s). Sem janelas e sem interruptor, o
   estado é **offline** (fail-safe). Este caminho é opcional: dá para usar só o
   interruptor.

**Cálculo (só janelas):** `chamadas/dia = (segundos de janela) / TTL`;
`unidades = chamadas × 100`, que deve ficar confortavelmente < 10.000.
Ex.: 1 janela de 3h/dia, TTL 180s → 60 chamadas × 100 = **6.000 unidades/dia**.
Com o interruptor, o custo típico é de **~100 unidades por emissão**.

> **Confirmação de fim de emissão:** quando o `search.list` devolve um candidato
> live, confirmamos com `videos.list` (`part=snippet,liveStreamingDetails`, **1
> unidade**, cache 60s) se a emissão ainda está a decorrer. O custo é desprezável
> face às 100 unidades do `search.list`, mas evita reproduzir a gravação (VOD)
> depois de a live terminar (ver §4) - o `search.list?eventType=live` tem atraso
> de propagação e continua a listar a emissão durante minutos após o fim.

## 4. Fail-safe

Qualquer incerteza resolve para **offline** (nunca mostrar "ao vivo" sem
confirmação):

| Situação | Resultado |
|---|---|
| Interruptor ligado, `videos.list` confirma a decorrer | `live:true` (com `videoId`) |
| Interruptor ligado, `videoId` por resolver (dentro de `armed_until`) | `live:true`, `videoId:null` (leitor mostra o embed do canal: ecrã de espera do YouTube) |
| Interruptor ligado mas sem `YOUTUBE_API_KEY` | confia no admin: `live:true` + `stale:true` |
| Interruptor ligado, `armed_until` expirou sem stream | `live:false` |
| Interruptor desligado | cai para as janelas (abaixo) |
| Fora das janelas | `live:false` (sem chamada à API) |
| Falta `YOUTUBE_API_KEY` (caminho das janelas) | `live:false` + `stale:true` |
| Erro / `5xx` / quota esgotada | `live:false` + `stale:true` |
| Resposta sem `items` | `live:false` (canal parado, caso normal) |
| Resposta malformada | `live:false` |
| Emissão terminou (`search` ainda lista, mas `videos.list` tem `actualEndTime`) | `live:false` |
| Verificação `videos.list` falha (erro/quota) | mantém `live:true` + `stale:true` |

`stale:true` serve para log/monitorização; a página nunca parte.

## 5. Ficheiros

| Ficheiro | Papel |
|---|---|
| `src/lib/youtube/live-status.ts` | Lê `live_override` (**primário**) → senão janelas; `search.list` + confirmação de fim via `videos.list` + fail-safe + Data Cache (servidor) |
| `src/lib/youtube/live-override.ts` | Leitura da linha singleton `live_override` (estado do interruptor), fail-safe (servidor) |
| `src/lib/youtube/live-windows.ts` | Parsing + gating das janelas, fallback (puro, testável) |
| `src/lib/youtube/use-live-status.ts` | Hook: **Realtime** (`live_override`) + polling 60s de backstop (cliente) |
| `src/lib/youtube/channel.ts` | IDs/links públicos do canal (subscrição) |
| `src/lib/auth/browser-client.ts` | Cliente Supabase no browser + `subscribeToTable` (Realtime), isolado em `auth/` |
| `src/app/api/youtube/live-status/route.ts` | Endpoint que expõe o estado ao cliente |
| `src/app/live/page.tsx` | Página `/live` (render inicial no servidor; `<h1>` `sr-only`) |
| `src/app/admin/live/page.tsx` | Painel admin: estado + botões "Estamos no ar"/"Terminámos" |
| `src/app/admin/live/actions.ts` | Server actions `goLiveAction`/`endLiveAction` (guarda `isAdmin`, escreve `live_override`) |
| `src/components/site/live-player.tsx` | Leitor 16:9 que embebe o `live_stream` do CANAL (a YouTube serve a emissão em curso ou um ecrã offline, **nunca o VOD**) + botão "Subscrever canal" |
| `src/components/site/live-badge.tsx` | Badge "Ao vivo"/"Offline" |
| `src/components/site/live-nav-link.tsx` | Entrada de nav com os 3 estados |
| `supabase/migrations/20260613140000_live_override.sql` | Tabela singleton `live_override` + RLS + publicação Realtime (**só logos-dev**) |

Integração: `header.tsx` (desktop) e `mobile-nav.tsx` renderizam `LiveNavLink`
ao lado de `NavLinks`; a nav de admin (`src/app/admin/layout.tsx`) tem a entrada
"Live" → `/admin/live`. Animação do ponto em `globals.css` (`animate-live-pulse`,
desligada com `prefers-reduced-motion`). Toasts do interruptor em
`save-toast-listener.tsx` (`live_ligada`/`live_terminada`).

## 6. Configuração (env)

| Variável | Default | Notas |
|---|---|---|
| `YOUTUBE_API_KEY` | — | **Só no servidor.** Nunca no bundle do cliente. Usada ao ligar o interruptor (resolver `videoId`) e na confirmação de fim. |
| `YOUTUBE_CHANNEL_ID` | `UCcSXFqxY-XEjMMLLW2TXmtg` | Público |
| `YOUTUBE_LIVE_WINDOWS` | — | **Opcional (secundário/legado).** `"DOW HH:MM-HH:MM; ..."`, Europe/Lisbon. Só conta com o interruptor desligado. Sem janelas e sem interruptor → offline. |
| `YOUTUBE_CACHE_TTL_SECONDS` | `180` | Alinhar com o intervalo desejado de polling à API (caminho das janelas) |

A chave configura-se no Google Cloud Console (YouTube Data API v3 → Credentials)
e define-se nos scopes Preview/Production da Vercel + `.env.local`.

O **Realtime não precisa de variáveis novas**: reutiliza
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (já definidas
para a autenticação).

## 7. Privacidade

- Embed via **`youtube-nocookie.com`** (coerente com o vídeo da homepage e com a
  Política de Privacidade): não define cookies de tracking até à reprodução.
- O `iframe` só é montado quando há transmissão e o utilizador está em `/live`.
- O botão "Subscrever" é um simples link de saída; não recolhe dados no portal.
- A `YOUTUBE_API_KEY` nunca chega ao cliente (verificável em DevTools → Network).

## 8. Acessibilidade

- Entrada offline: `aria-disabled="true"` e fora do tab order (não é `<a>`).
- Badge com texto legível ("Ao vivo"/"Offline") — não depende só da cor.
- `prefers-reduced-motion` desliga o pulsar do ponto.
- `iframe` com `title` descritivo.

## 9. Limitações conhecidas (MVP)

- **Depende de o admin carregar no interruptor.** Com "Estamos no ar", a live é
  detetada a qualquer hora; sem interruptor e fora das janelas, não é detetada.
- **Quota esgotada a meio de uma transmissão** → a entrada cai para offline
  (fail-safe). Aceitável no MVP.
- Dois streams em simultâneo → usa-se `items[0]` (o mais recente).
- A migração `live_override` está **só em logos-dev** até 01-07-2026 (regra V3);
  o interruptor só funciona em produção depois de a migração ser aplicada lá.

## 10. Evolução futura (fora de âmbito)

- **WebSub/PubSubHubbub (push):** o YouTube notifica o servidor quando o canal
  inicia conteúdo, sem consumo de quota e em tempo real, dispensando o
  `search.list` (100 unidades) para a *deteção de início*. (A *confirmação de
  fim* já usa `videos.list`, 1 unidade - ver §3/§4.) Recomendado se for preciso
  deteção fiável fora de janelas ou latência < 60s.
- Galeria de vídeos recentes; contagem de espetadores (`concurrentViewers`).
- Deteção de "já és subscritor" — **explicitamente fora de âmbito** (exigiria
  OAuth com scope sensível `youtube.readonly` e verificação da app pelo Google).

## 11. Testes

- `live-windows.test.ts` — parsing e gating de janelas (DST Europe/Lisbon, fim
  exclusivo, fail-safe sem janelas).
- `live-status.test.ts` — live/offline/stale, sem chamada fora de janela ou sem
  chave, parsing de respostas malformadas, **confirmação de fim de emissão**
  (`parseVideoLiveState` + cai para offline quando `videos.list` tem
  `actualEndTime`; mantém live+stale quando a verificação falha) e o
  **interruptor admin** (`live_override` prioritário sobre as janelas;
  confirmado/terminado/stale; sem chave → confia no admin; estado "a ligar"
  quando o stream ainda não resolve; `armed_until` expirado → offline;
  interruptor desligado → fallback para janelas).
- `admin/live/actions.test.ts` — guarda de admin (sessão ausente ou utilizador
  comum → recusa; `admin`/`super_admin` → escreve), `goLiveAction` e
  `endLiveAction`, erro de escrita propagado.
- `live-badge.test.tsx` — texto e presença/ausência do pulsar.
