---
tags: [classhub, rotas, ui]
---

# Rotas e telas

| Rota | Tela | Acesso de interface | Responsabilidade |
|---|---|---|---|
| `/login` | Login | Pública | Valida usuário/senha na tabela `usuarios`. |
| `/alterar-senha` | Senha | Usuário autenticado | Troca senha e remove o estado de primeiro acesso. |
| `/` | Dashboard | Autenticado | Contadores de aulas, docentes e estados das aulas. |
| `/agendamento` | Agenda | Autenticado | Calendário mensal de planejamentos, filtros, edição e exclusão. |
| `/laboratorio` | Laboratório | Admin | Agenda independente e CRUD de uso do laboratório. |
| `/solicitar-laboratorio` | Solicitar laboratório | Autenticado | Docente registra solicitação e acompanha as próprias solicitações. |
| `/aprovacoes-laboratorio` | Aprovações | Admin | Aprova/rejeita solicitações; aprovar cria agendamento. |
| `/relatorios` | Relatórios | Autenticado | Relatório geral, por docente/AC e de laboratório, com impressão. |
| `/docentes` | Docentes | Autenticado | CRUD e ativação. |
| `/componentes` | Componentes | Autenticado | CRUD, ativação e marcação de uso do laboratório. |
| `/turmas` | Turmas | Autenticado | CRUD e ativação. |
| `/horarios` | Horários | Autenticado | CRUD, ordenação e marcação de intervalo. |
| `/feriados` | Feriados | Autenticado | CRUD de feriados cadastrados; nacionais fixos são locais. |
| `/categorias-ac` | Categorias de AC | Admin | CRUD de catálogo de atividades complementares. |
| `/usuarios` | Usuários | Admin | Criar, editar, ativar, excluir e resetar senha via RPC. |
| `/configuracoes` | Backup e restauração | Admin | Exportar/importar JSON dos cadastros e planejamentos. |

## Casca da aplicação

`__root.tsx` envolve as páginas com `AuthProvider`, protege rotas pelo `AuthGate`, apresenta sidebar para telas autenticadas e páginas próprias para 404/erro. Em telas menores que 768 px, a sidebar dá lugar a um cabeçalho compacto e menu lateral deslizante. A navegação oculta itens administrativos, mas isso é apenas uma restrição visual; a proteção de dados deve existir no banco. Veja [[07-Autenticacao-e-seguranca]].
