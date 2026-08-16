---
tags: [classhub, api, supabase]
---

# API e métodos

Não existe uma API HTTP própria. O frontend usa o cliente Supabase, que chama a API PostgREST e RPCs do PostgreSQL diretamente.

## Serviços TypeScript

`src/services/` oferece os métodos abaixo; todos lançam o erro retornado pelo Supabase.

| Serviço | Métodos | Tabela |
|---|---|---|
| `docentesService` | `list`, `create`, `update`, `remove` | `docentes` |
| `componentesService` | `list`, `create`, `update`, `remove` | `componentes_curriculares` |
| `turmasService` | `list`, `create`, `update`, `remove` | `turmas` |
| `horariosService` | `list`, `create`, `update`, `remove` | `horarios_padrao` |
| `planejamentosService` | `list`, `byRange`, `create`, `update`, `remove` | `planejamentos` |

As páginas fazem também operações diretas (`select`, `insert`, `update`, `delete`) para laboratório, solicitações, usuários, feriados e AC.

## Consultas relacionais reutilizadas

Em `src/lib/db.ts`, `PLAN_SELECT`, `LAB_SELECT`, `SOLIC_SELECT` e `AC_SELECT` executam `select` com joins de dados descritivos: docente, componente, turma, horário e/ou categoria. Os tipos `*Full` representam esse retorno composto.

## RPCs esperadas

| Função | Parâmetros | Uso |
|---|---|---|
| `criar_usuario` | login, nome, senha, tipo, ativo, docente opcional | Criação administrativa. |
| `atualizar_usuario` | id, nome, tipo, ativo, docente opcional | Edição administrativa. |
| `resetar_senha_usuario` | id, nova senha | Força redefinição; marca primeiro login. |
| `excluir_usuario` | id | Exclui, preservando ao menos um admin ativo. |
| `aprovar_solicitacao_laboratorio` | solicitação, administrador | Cria reserva e aprova o pedido atomicamente. |
| `rejeitar_solicitacao_laboratorio` | solicitação, administrador, motivo opcional | Rejeita apenas solicitação ainda pendente. |
| `alterar_senha_usuario` | usuário, senha atual, nova senha | Tela de mudança de senha. |
| `listar_usuarios`, `login_usuario` | conforme migration | Existem no banco esperado, mas a interface atual usa acesso direto a `usuarios` no login/listagem. |

## Arquivos

`PlanejamentoForm` usa `storage.from("anexos").upload(path, file)`, obtém URL pública com `getPublicUrl(path)` e remove objeto com `remove([key])`. O caminho segue o prefixo de planejamento/arquivo; veja o componente para detalhes de nomeação.
