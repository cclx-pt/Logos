---
description: Verifica que a tarefa pertence à versão atual antes de implementar
argument-hint: <descrição da tarefa>
---

Invoca o sub-agent `spec-guardian` para validar o âmbito de uma tarefa antes de a implementar.

**Argumento:** `$ARGUMENTS` — descrição livre da tarefa proposta. Se vazio, usa a última proposta/pedido do utilizador na conversa atual.

Tarefa para o agent:

1. Lê `status.md` para identificar a versão atual.
2. Lê `SPEC_1.md` §9 (Âmbito por Versão) e §10 (Prioridade↔Versão).
3. Lê `CLAUDE.md` para regras duras.
4. Cruza a tarefa com:
   - Âmbito da versão atual
   - Bloqueadores absolutos (gamificação antes da V7, pagamentos, IA, app nativa, multilingue, vídeo alojado, push para `main`, PT-BR/inglês na UI, `any` sem justificação...)
   - Regras não-negociáveis de `CLAUDE.md`
5. Devolve veredicto: ✅ aprovado | ⚠️ aprovado com avisos | ❌ violação — sempre com referência à secção da spec ou regra.
6. Termina com uma recomendação de uma frase (implementar agora / adiar para V<n> / abandonar).

**Não implementes nada.** Esta validação acontece **antes** de qualquer escrita de código.
