# resend.md — email transacional (setup da conta e DNS)

> **Última atualização:** 11-06-2026
> **Estado:** conta criada e domínio ligado; **integração na app adiada para V5** (notificações de Q&A — ver `SPEC_1.md` §17 e `status.md`).

## 1. O que está feito

- Conta Resend criada sob `joaocanelasribeiro@gmail.com` (ver `accounts.md` §2).
- Domínio de envio **`logos.cclx.pt`** adicionado no painel Resend, região **`eu-west-1`** (Irlanda — infraestrutura Amazon SES).
- Registos DNS criados no painel Hostinger (zona `cclx.pt`) e confirmados por consulta DNS pública a 11-06-2026:

| Tipo | Nome | Valor (resumo) | Função |
|---|---|---|---|
| TXT | `resend._domainkey.logos.cclx.pt` | `p=MIGfMA0GCSqGSIb3DQEB…` | DKIM (assinatura dos emails) |
| TXT | `send.logos.cclx.pt` | `v=spf1 include:amazonses.com ~all` | SPF do subdomínio de envio |
| MX | `send.logos.cclx.pt` | `feedback-smtp.eu-west-1.amazonses.com` (prio 10) | Bounces / feedback loop |

- DMARC: não existe `_dmarc.logos.cclx.pt`, mas o domínio organizacional tem `_dmarc.cclx.pt` → `v=DMARC1; p=none`, que cobre os subdomínios. Suficiente por agora; endurecer (`p=quarantine`) só depois de volume real de envio em V5.

## 2. O que falta (pré-condições V5)

- [ ] Confirmar no painel Resend que o domínio aparece como **Verified** (deve acontecer automaticamente com os registos acima a resolver).
- [ ] Criar API key e fazer **um teste de envio real** para uma caixa Gmail (verificar que chega ao inbox e que DKIM/SPF passam nos headers).
- [ ] Guardar `RESEND_API_KEY` + `RESEND_FROM_EMAIL` em `.env.local` (gitignored) e, quando V5 arrancar, no scope Production do Vercel. Formato em `.env.example`.
- [ ] Aceitar o DPA do Resend (pendência RGPD — ver `legal-pendencias.md` §DPAs).

### Teste de envio (curl, correr localmente com a key)

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Logos <no-reply@logos.cclx.pt>",
    "to": ["joaocanelasribeiro@gmail.com"],
    "subject": "Teste Logos — Resend ligado",
    "text": "Se este email chegou, o domínio está verificado e o envio funciona."
  }'
```

## 3. Decisões

- **Remetente:** `no-reply@logos.cclx.pt` (display name `Logos`). O alias `logos@cclx.pt` continua a ser o contacto humano/privacidade — não confundir (ver `accounts.md` §3).
- **Subdomínio dedicado `logos.cclx.pt`** em vez do apex `cclx.pt`: isola a reputação de envio do Logos do resto do domínio da igreja.
- **Sem uso na app até V5.** O login é Google OAuth puro (sem magic links) e o formulário de contacto V1 é `mailto:`, por isso nada no código atual envia email. Este setup só elimina a dependência DNS/propagação do caminho crítico de V5.

## 4. Referências

- Painel: <https://resend.com> (API keys em <https://resend.com/api-keys>)
- `accounts.md` §2 — ownership da conta
- `legal-pendencias.md` — DPA pendente
- `.env.example` — formato das variáveis
