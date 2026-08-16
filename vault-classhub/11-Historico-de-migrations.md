---
tags: [classhub, banco, migrations]
---

# Histórico de migrations

As migrations são incrementais. Aplique-as em ordem pelo prefixo de data/hora e não execute scripts posteriores isoladamente em um banco vazio.

| Migration | Alteração principal |
|---|---|
| `20260512225923_*` | Schema inicial: docentes, componentes, turmas, horários, planejamentos, RLS aberta e bucket `anexos`. |
| `20260512225943_*` | Recria/fixa a função de timestamp de atualização. |
| `20260512232327_*` | Cria o modelo legado `app_users` com hash e RLS bloqueada. |
| `20260515115051_*` | Cria `feriados` e sua política aberta. |
| `20260713225852_*` | Cria `usuarios`, RPCs com hash e admin inicial. |
| `20260713234654_*` | Troca `senha_hash` por `senha` em texto puro e abre acesso direto à tabela. |
| `20260714014141_*` | Adiciona `owner_id` a planejamentos (campo não presente no tipo atual). |
| `20260714115016_*` | Adiciona `criado_por`, view pública e RPCs de gerenciamento. |
| `20260716214545_*` | Remove temporariamente a trava única de docente; mantém a de turma. |
| `20260718120000_*` | Adiciona `usa_laboratorio` a componentes. |
| `20260718130000_*` | Recria a unicidade de docente/data/horário para planejamentos. |
| `20260718140000_*` | Corrige RPCs para `senha`, adiciona vínculo `usuarios.docente_id` e escopo docente. |
| `20260719100000_*` | Primeira versão de `laboratorio_agendamentos`, inicialmente com unicidade por slot. |
| `20260719120000_*` | Revisa a tabela de laboratório e popula históricos de componentes que usam laboratório. |
| `20260719140000_*` | Remove a unicidade do laboratório e permite múltiplos registros no slot. |
| `20260720120000_*` | Adiciona intervalo nos horários, categorias e atividades complementares. |
| `20260721120000_*` | Adiciona recursos do laboratório e solicitações de laboratório. |

## Observações de manutenção

- Há decisões substituídas ao longo do tempo (principalmente em autenticação e conflitos de laboratório); o estado final resulta da sequência completa.
- `owner_id` aparece em uma migration, mas não está em `src/lib/db.ts` nem no tipo gerado atual. Antes de depender dele, confirme o banco remoto.
- A migration de escopo docente é relevante para o comportamento de telas que filtram `criado_por`; revise-a junto com [[07-Autenticacao-e-seguranca]] em qualquer alteração de perfil.

