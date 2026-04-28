# feature-docs/

Documentação por feature. Cada ficheiro descreve **uma** feature concluída.

## Quando criar
Quando uma feature fica "feita" (merged em `main`, testada, em produção).

## Convenção de nome
`kebab-case.md` — descritivo da feature, não do ticket.

Exemplos:
- `auth-email-google.md`
- `course-catalog-public.md`
- `lesson-completion-binary.md`
- `tag-system-foundation.md`
- `tag-system-multi-level.md`
- `pdf-signed-urls.md`

## Template

```markdown
# <Nome da feature>

> **Versão:** V<n>  ·  **Concluída em:** DD-MM-YYYY  ·  **Autor(es):** <nome>

## Objetivo
Uma frase: que problema resolve.

## Comportamento
- Bullets do que o utilizador (ou admin) consegue fazer
- Casos de uso principais

## Decisões técnicas
- Escolhas relevantes e porquê
- Trade-offs aceites

## Modelo de dados / API
- Tabelas tocadas
- Server Actions ou endpoints expostos

## Limites conhecidos
- O que não faz (e quando passará a fazer, se aplicável)

## Testes
- O que está coberto
- Como correr

## Referências
- Issues / PRs
- Secção relevante de `SPEC_1.md`
```
