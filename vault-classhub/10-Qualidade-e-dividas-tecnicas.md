---
tags: [classhub, qualidade, divida-tecnica]
---

# Qualidade e dívidas técnicas

## Divergências verificadas

| Tema | Evidência | Impacto |
|---|---|---|
| Autenticação | `src/lib/auth.functions.ts` é um stub dizendo que auth está desabilitada, enquanto `auth-context.tsx` implementa login direto pela tabela `usuarios`. | Código morto/confuso e risco de uso da camada errada. |
| Tipos gerados | `feriados` usa cast `any` porque o comentário diz que não está no schema, embora `types.ts` atual já o contenha. | Sinal de snapshot/implementação fora de sincronia. |
| Migrations de auth | Migrations antigas alternam hash bcrypt, funções seguras e, depois, coluna de senha em texto puro. | Histórico difícil de manter; banco remoto precisa ser auditado. |
| `app_users` | Tabela/enum legados coexistem com `usuarios` e não são usados pela interface. | Ambiguidade de fonte de verdade para usuários. |
| Aprovação laboratório | Inserção de agendamento e atualização de solicitação são duas chamadas do cliente. | Falha parcial pode aprovar sem reserva ou reservar sem aprovar. |
| Backup | Cobertura restrita e restore destrutivo em várias chamadas. | Perda de dados não incluídos e estado parcialmente restaurado em falha. |

## Plano de estabilização sugerido

1. Definir um único modelo de autenticação (`usuarios` + RPC segura ou Supabase Auth) e remover artefatos legados.
2. Fechar RLS e substituir verificações visuais por políticas reais.
3. Criar RPC transacional para aprovar solicitação de laboratório e outra para restauração controlada.
4. Ampliar backup para todas as entidades relevantes e objetos do Storage, ou documentar explicitamente seu escopo na tela.
5. Extrair consultas diretas das rotas para serviços/hooks e centralizar validação de formulários.
6. Adicionar testes para conflitos, autorização, replicação, aprovação e restauração; o `package.json` atual não define script de testes.

## Checklist antes de produção

- [ ] Banco possui todas as migrations aplicadas e sem conflitos nos índices únicos.
- [ ] Tipos Supabase foram regenerados.
- [ ] Variáveis Vercel usam chave pública correta e nenhuma chave secreta está em `VITE_*`.
- [ ] Políticas RLS e Storage foram revisadas por perfil.
- [ ] Backup foi testado em ambiente isolado.
- [ ] Fluxo de aprovação foi testado para erros de inserção e concorrência.

