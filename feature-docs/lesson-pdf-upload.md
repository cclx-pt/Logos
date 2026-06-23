# Upload de apostilas PDF — upload directo (V3.7)

> **Estado:** completo. Substitui o upload via Server Action de V3 PR4b.

## Problema

A UI prometia apostilas **até 20 MB** (bucket `lesson-pdfs` com `file_size_limit = 20 MB`, validação na Server Action a 20 MB, `bodySizeLimit` do Next a 25 MB), mas qualquer PDF acima de **~4.5 MB** falhava em produção (Vercel). Um PDF de 5 MB dava erro.

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
