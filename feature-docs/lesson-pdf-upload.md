# Upload de sebentas PDF — upload directo (V3.7)

> **Estado:** completo. Substitui o upload via Server Action de V3 PR4b.

## Problema

A UI prometia sebentas **até 20 MB** (bucket `lesson-pdfs` com `file_size_limit = 20 MB`, validação na Server Action a 20 MB, `bodySizeLimit` do Next a 25 MB), mas qualquer PDF acima de **~4.5 MB** falhava em produção (Vercel). Um PDF de 5 MB dava erro.

**Causa:** na Vercel, as Server Actions correm como Functions, e a plataforma impõe um limite **rígido de ~4.5 MB ao corpo do pedido** que o `serverActions.bodySizeLimit` do Next **não** sobrepõe. O ficheiro era rejeitado na borda, antes de o nosso código (e a validação dos 20 MB) o ver. Localmente (`pnpm dev`) não acontecia - aí manda o `bodySizeLimit`, daí passar despercebido.

## Solução: browser → Storage directo (signed upload URL)

O PDF **deixa de passar pela Server Action**. Fluxo:

1. **`createLessonPdfUploadUrlAction(courseId)`** (`lessons-actions.ts`, admin-only) gera uma signed upload URL para o path `<courseId>/<uuid>.pdf` via `supabase.storage.from('lesson-pdfs').createSignedUploadUrl(path)`. Devolve `{ path, token }`.
2. **`uploadToSignedUrl(bucket, path, token, file, contentType)`** (`src/lib/auth/browser-client.ts`) envia o ficheiro **directamente do browser para o bucket** (`uploadToSignedUrl` do supabase-js). Wrapper genérico no bucket, na única camada que pode importar `@supabase/*`.
3. **`createLessonAction` / `updateLessonAction`** recebem só o `pdf_storage_path` (string) - corpo minúsculo, sem limite da Vercel. Validam-no com `validatePdfStoragePath` (`_lib/validation.ts`).

O `LessonForm` orquestra tudo no cliente via `onSubmit` + `useTransition` (ver "Gotchas").

## Quem impõe o quê

| Garantia | Onde |
|---|---|
| Tamanho ≤ 20 MB | **Bucket** (`file_size_limit`) no upload; o cliente faz um check prévio (`MAX_PDF_BYTES`) só para feedback rápido |
| MIME `application/pdf` | **Bucket** (`allowed_mime_types`); cliente faz check prévio de `file.type` |
| Só admin pode enviar | Admin-check em `createLessonPdfUploadUrlAction`; INSERT RLS de `storage.objects` satisfeita ao **assinar** com a sessão do admin |
| Escrever só no path certo | O **token** da signed URL autoriza só esse path |
| Path coerente com o curso | `validatePdfStoragePath`: tem de ser `<courseId>/<uuid>.pdf` com o prefixo do próprio curso (coerência com a policy RLS SELECT que extrai o courseId do path) |

## Mudança na convenção de path

Era `<courseId>/<lessonId>.pdf`; passou a **`<courseId>/<uuid>.pdf`** (nome aleatório decidido ao assinar). O nome do ficheiro está **desligado do id da aula** (que no create ainda não existe). Consequência: a limpeza (delete, troca para vídeo, substituição de PDF) lê o `pdf_storage_path` **guardado na row** em vez de o reconstruir a partir do id; ao substituir um PDF, o ficheiro antigo é removido best-effort. O prefixo continua a ser o `courseId` - **security-sensitive**: mudar a convenção obriga a actualizar a policy `lesson_pdfs_select_visible` **e** o `validatePdfStoragePath`.

## Gotchas

- **Reset de form em React 19:** `<form action={fn}>` faz reset dos campos uncontrolled ao concluir a action - perderia o título/descrição se o upload falhasse. Por isso o `LessonForm` usa `onSubmit` + `useTransition` (não `action`), e o `SubmitButton` recebe o `pending` explicitamente (prop nova, com fallback para `useFormStatus`).
- **Remover o ficheiro do FormData antes de chamar a action:** se o `File` ficasse no FormData passado à Server Action, voltava a ser serializado no corpo → outra vez o limite da Vercel. O form faz `formData.delete('pdf')` e acrescenta `pdf_storage_path`.

## Ficheiros

- `src/app/admin/conteudos/lessons-actions.ts` - `createLessonPdfUploadUrlAction` + create/update/delete por path.
- `src/app/admin/conteudos/lesson-form.tsx` - orquestração no cliente.
- `src/app/admin/conteudos/_lib/validation.ts` - `MAX_PDF_BYTES`, `validatePdfStoragePath`.
- `src/lib/auth/browser-client.ts` - `uploadToSignedUrl`.
- `src/components/ui/submit-button.tsx` - prop `pending`.

Sem migration, sem env nova (reusa `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

## Leitura/download da sebenta - route handler `/sebenta` (mobile, 30-06-2026)

O **upload** (acima) vai browser → bucket. A **leitura** (visualizador + download) passou a ir toda por um route handler que assina a URL **fresca a cada pedido**, resolvendo dois bugs de mobile:

- **Download falhava em silêncio:** o botão fazia `window.open(url)` **depois** de um `await` à Server Action. Em iOS Safari (e outros) o bloqueador de popups só deixa abrir nova janela no **gesto síncrono** do toque - perdido após o await, o popup era bloqueado sem aviso. No desktop o bloqueador é permissivo, daí parecer só-mobile.
- **Visualizador dava "sem permissão" intermitente:** a página embebia no `<iframe>` uma signed URL de 5 min assinada no render. Em mobile os browsers recarregam iframes fora de vista; ao recarregar após 5 min, a URL expirada fazia o Supabase devolver o seu erro de acesso **dentro do iframe** (lia como falta de permissão). **Não é o sistema de etiquetas** - conteúdo restrito por etiqueta é invisível, nunca dá erro.

### Como funciona agora

- **`signLessonPdfUrl(lessonId)`** (`src/lib/courses/lesson-pdf.ts`) - núcleo de signing (auth + RLS de `lessons` + `createSignedUrl`, TTL 5 min). Devolve `{ url, fileName }`: a `url` é sempre **inline** (sem download param) e o `fileName` é **derivado do título da aula** (`pdfFileNameFromTitle`: tira caracteres ilegais, mantém acentos, limita a 80 chars). Partilhado pela Server Action `getLessonPdfSignedUrlAction` (mantida por compat/estabilidade) e pelo route handler.
- **`GET /conteudos/[courseId]/[lessonId]/sebenta`** (`.../sebenta/route.ts`, `force-dynamic`, `no-store`):
  - **sem query (inline, alvo do iframe):** faz **302** para a signed URL, o browser mostra o PDF.
  - **`?dl=1` (download):** **serve o ficheiro ele próprio** com `Content-Disposition: attachment` (fez `fetch` à signed URL e faz stream do corpo, sem bufferizar). Antes fazia 302 com o param `download` do Supabase, mas os browsers tratavam isso de forma inconsistente e abriam o PDF inline em vez de descarregar; servir com o nosso cabeçalho **garante o download**. Nome de ficheiro via `Content-Disposition` (RFC 6266: `filename` ASCII + `filename*` UTF-8 para acentos).
  - Em erro devolve uma página HTML mínima PT-PT (em vez de deixar o erro cru do Supabase aparecer no iframe).
- **`PdfDownloadButton`** deixou de ser client/`window.open` e passou a `<a href=".../sebenta?dl=1" download>` (navegação real + atributo `download` numa rota same-origin - sem o problema do gesto).
- **Iframe** (`page.tsx`) aponta para `.../sebenta` (inline). A signed URL deixa de viver no HTML; só se renderiza quando `lesson.pdf_storage_path` existe. Dica `sm:hidden` para mobile (muitos browsers não renderizam PDF em iframe → usar o botão).

**CSP:** `frame-src` ganhou `'self'` (`next.config.ts`) - o iframe aponta para a rota same-origin que faz 302 para `*.supabase.co`; a CSP valida **cada salto** do redirect, por isso são precisos ambos. Regressão fixada em `src/test/security-headers.test.ts`.

Sem migration, sem env nova. A fronteira de segurança continua a ser a RLS (`lessons_select_visible` + `lesson_pdfs_select_visible`); o handler só assina.

## Banners de curso (mesmo mecanismo)

O bucket `course-banners` tinha o mesmo bug latente (cap de 5 MB na Server Action, batido pelos ~4.5 MB da Vercel). Foi corrigido da mesma forma:

- `createCourseBannerUploadUrlAction(courseId)` assina o upload para `<courseId>/banner` (com `upsert`, porque o path é determinístico - sempre o mesmo por curso).
- `uploadToSignedUrl` (o mesmo wrapper genérico) envia o ficheiro directamente; o `CourseForm` (agora client component, `onSubmit` + `useTransition`) orquestra.
- `createCourseAction`/`updateCourseAction` recebem só `banner_storage_path` (validado por `validateBannerStoragePath`); tamanho/MIME impostos pelo bucket.

**Diferença vs. PDF - o `courseId` está no *prefixo* do path.** No create o curso ainda não existe, por isso o **id é gerado no cliente** (`crypto.randomUUID`) e enviado como `id` no FormData; `createCourseAction` insere o curso com esse id explícito (param `id` opcional). Assim o path `<id>/banner` existe antes do insert e a policy RLS (que extrai o courseId do prefixo) fica coerente. Se o insert falhar, o banner já enviado é removido best-effort.

