# CLAUDE.md — Logos

> **Lê primeiro `SPEC_1.md`.** É a fonte de verdade do projeto. Se a realidade divergir, atualiza a spec — não o silêncio.
>
> **Antes de cada sessão, verifica se existe algum `feature-docs/*-handoff.md`.** Esses ficheiros documentam trabalho em curso entre sessões — o estado WIP, decisões fechadas, e o que falta. Se existir um, lê-o antes de tocar em qualquer ficheiro. Quando o trabalho fechar, apaga o handoff (ou substitui-o pela entrada definitiva em `feature-docs/`).

## 🎯 Objetivo
Plataforma online de estudo bíblico da **CCLX** (igreja em Portugal). Cursos → Módulos → Aulas (vídeo YouTube embebido + PDF descarregável). Utilizadores autenticados marcam aulas como concluídas.

- **Idioma:** Português de Portugal (PT-PT) — nunca PT-BR
- **Custo para utilizadores:** Sempre gratuito
- **URL:** `logos.cclx.pt`
- **Prazo absoluto V3:** 1 de julho de 2026

## 🏗️ Arquitetura
- **Framework:** Next.js 16 + TypeScript (App Router)
- **DB / Auth / Storage:** Supabase (Postgres, Supabase Auth com **OAuth social: Google + Microsoft** - email/password fora de âmbito, Apple adiado por exigir conta paga; ver `SPEC_1.md` §17/§18, Supabase Storage para PDFs)
- **Estilização:** Tailwind CSS + shadcn/ui
- **Forms:** react-hook-form + Zod
- **Email transacional:** Resend
- **Deploy:** Vercel (auto-deploy de `main`)
- **Pacotes:** **pnpm** (não usar npm nem yarn)

Modelo de dados (3 níveis): `Curso → Módulo → Aula`. Aulas têm `template` (`pdf`, `video_pdf`, extensível). Etiquetas (`tags`) controlam acesso por **curso** (V3) e também por **módulo/aula** (V4+). Detalhes em `architecture.md`.

## 🎨 Estilo Visual
- **Paleta:** Creme + laranja vivo (hex exatos a confirmar na fase de Setup)
- **Tom:** Acolhedor, limpo, adequado a igreja — não corporativo, não frio
- **Componentes:** shadcn/ui adaptados à paleta CCLX
- **Mobile-first:** Cabeçalho colapsa em menu hambúrguer
- **Mockups:** Referência visual, **não vinculativos ao pixel**

## 🚫 Regras (não negociáveis)
- **Nunca fazer push direto para `main`.** Sempre via Pull Request.
- **V3 nunca mergea em `main` em parciais.** Entre 19-05-2026 e 01-07-2026 (lançamento), o repo vive em 3 camadas: `main` (V2 live), `v2.5-copy-ux` (V2.5 stored), `v3-cursos` (V3 em dev). PRs de V3 (PR1-PR9) ficam só em `v3-cursos`. Detalhes e workflow de teste cross-device em [`feature-docs/branch-strategy.md`](feature-docs/branch-strategy.md).
- **Migrations V3 nunca aplicadas a `logos-prod` antes de 01-07-2026.** Só `logos-dev`.
- **Sempre escrever testes** para: visibilidade por etiquetas, lógica de conclusão de curso, controlo de acesso por papel.
- **Verificar a versão (V1–V9) antes de implementar.** Nada de scope creep entre versões.
- **PT-PT em toda a UI e copy.** Sem PT-BR. Sem inglês na UI.
- **Sem em dashes (`—`) em copy/UI. Usar sempre hyphen (`-`).** Vale para texto visível ao utilizador (JSX, hints, mensagens, emails). Para separar dentro de uma frase, usar hyphen, vírgula ou dois pontos, nunca `—`. Erro recorrente: corrigir à nascença.
- **Não alojar vídeo no sistema.** Sempre YouTube embed via iframe.
- **Conteúdo restrito por etiqueta é invisível**, nunca aparece com cadeado ou "acesso negado".
- **IDs internos estáveis.** Renomear/reordenar nunca invalida conclusões existentes.
- **Sem barras de progresso, percentagens ou gamificação** até V7 (e mesmo aí só se justificado).
- **Nunca commit de `.env`.** Apenas `.env.example` versionado.
- **Sem `any` em TypeScript** sem justificação por comentário.
- **Identidade isolada em `src/lib/auth/`.** Importações de `@supabase/ssr` (e equivalentes de identidade) **só** dentro dessa pasta. O resto da app consome `getCurrentUser()` / `getServerClient()`. Esta fronteira é o que torna a futura migração para uma shell partilhada uma substituição de camada, e não uma reescrita.
- **FKs nunca apontam para `auth.users`.** Sempre para `profiles.id`. A única ligação ao sistema de identidade externo vive em `profiles.external_auth_id`.
- **Email não é duplicado em tabelas Logos.** Vive em `auth.users.email`. Se a UI precisar, pede à camada de identidade.
- **Privilegiar a opção aborrecida e bem-documentada.** Developer único, prazo curto.

## 🔄 Documentação Contínua
Após cada feature concluída, atualiza obrigatoriamente:
- `changelog.md` — entrada datada (formato `DD-MM-YYYY`)
- `status.md` — milestone atual + próximas tarefas
- `architecture.md` — se houve mudança estrutural
- `feature-docs/<nome>.md` — quando a feature ficar completa

Antes de cada commit relevante, perguntar: *"Que docs precisam de atualização?"*
