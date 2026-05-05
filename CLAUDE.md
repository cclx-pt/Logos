# CLAUDE.md — Logos

> **Lê primeiro `SPEC_1.md`.** É a fonte de verdade do projeto. Se a realidade divergir, atualiza a spec — não o silêncio.

## 🎯 Objetivo
Plataforma online de estudo bíblico da **CCLX** (igreja em Portugal). Cursos → Módulos → Aulas (vídeo YouTube embebido + PDF descarregável). Utilizadores autenticados marcam aulas como concluídas.

- **Idioma:** Português de Portugal (PT-PT) — nunca PT-BR
- **Custo para utilizadores:** Sempre gratuito
- **URL:** `logos.cclx.pt`
- **Prazo absoluto V3:** 1 de julho de 2026

## 🏗️ Arquitetura
- **Framework:** Next.js 16 + TypeScript (App Router)
- **DB / Auth / Storage:** Supabase (Postgres, Supabase Auth com email + Google OAuth, Supabase Storage para PDFs)
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
- **Sempre escrever testes** para: visibilidade por etiquetas, lógica de conclusão de curso, controlo de acesso por papel.
- **Verificar a versão (V1–V9) antes de implementar.** Nada de scope creep entre versões.
- **PT-PT em toda a UI e copy.** Sem PT-BR. Sem inglês na UI.
- **Não alojar vídeo no sistema.** Sempre YouTube embed via iframe.
- **Conteúdo restrito por etiqueta é invisível**, nunca aparece com cadeado ou "acesso negado".
- **IDs internos estáveis.** Renomear/reordenar nunca invalida conclusões existentes.
- **Sem barras de progresso, percentagens ou gamificação** até V7 (e mesmo aí só se justificado).
- **Nunca commit de `.env`.** Apenas `.env.example` versionado.
- **Sem `any` em TypeScript** sem justificação por comentário.
- **Privilegiar a opção aborrecida e bem-documentada.** Developer único, prazo curto.

## 🔄 Documentação Contínua
Após cada feature concluída, atualiza obrigatoriamente:
- `changelog.md` — entrada datada (formato `DD-MM-YYYY`)
- `status.md` — milestone atual + próximas tarefas
- `architecture.md` — se houve mudança estrutural
- `feature-docs/<nome>.md` — quando a feature ficar completa

Antes de cada commit relevante, perguntar: *"Que docs precisam de atualização?"*
