---
tags: [classhub, rotas, ui]
---

# Rotas e telas

| Rota | Tela | Acesso de interface | Responsabilidade |
|---|---|---|---|
| `/login` | Login | Pública | Valida usuário/senha na tabela `usuarios`. |
| `/alterar-senha` | Senha | Usuário autenticado | Troca senha e remove o estado de primeiro acesso. |
| `/` | Mural escolar | Autenticado | Avisos, destaques, próximos eventos e três ícones discretos de saúde das consultas. |
| `/mural` | Gerenciar mural | Admin | CRUD de avisos, destaques e eventos publicados na Dashboard. |
| `/agendamento` | Agenda | Autenticado | Calendário mensal de planejamentos, filtros, edição e exclusão. |
| `/laboratorio` | Laboratório | Admin | Agenda independente e CRUD de uso do laboratório. |
| `/solicitar-laboratorio` | Solicitar laboratório | Autenticado | Docente registra solicitação e acompanha as próprias solicitações. |
| `/aprovacoes-laboratorio` | Aprovações | Admin | Aprova/rejeita solicitações; aprovar cria agendamento. |
| `/relatorios` | Central de relatórios | Autenticado | Consulta de planejamentos, grade docente com ACs e uso dos laboratórios, com filtros, indicadores e exportação em PDF. |
| `/docentes` | Docentes | Autenticado | CRUD e ativação. |
| `/componentes` | Componentes | Autenticado | CRUD, ativação e marcação de uso do laboratório. |
| `/turmas` | Turmas | Autenticado | CRUD e ativação. |
| `/horarios` | Horários | Autenticado | CRUD, ordenação e marcação de intervalo. |
| `/feriados` | Feriados | Autenticado | CRUD de feriados cadastrados; nacionais fixos são locais. |
| `/categorias-ac` | Categorias de AC | Admin | CRUD de catálogo de atividades complementares. |
| `/usuarios` | Usuários | Admin | Criar, editar, ativar, excluir e resetar senha via RPC. |
| `/configuracoes` | Backup e restauração | Admin | Exportar/importar JSON dos cadastros e planejamentos. |

## Casca da aplicação

`__root.tsx` envolve as páginas com `AuthProvider`, protege rotas pelo `AuthGate`, apresenta sidebar para telas autenticadas e páginas próprias para 404/erro. Em telas de desktop, a casca ocupa a altura da viewport: o menu lateral permanece fixo e somente o conteúdo principal recebe rolagem vertical. Em telas menores que 768 px, a sidebar dá lugar a um cabeçalho compacto e menu lateral deslizante. A navegação oculta itens administrativos, mas isso é apenas uma restrição visual; a proteção de dados deve existir no banco. Veja [[07-Autenticacao-e-seguranca]].

## Responsividade mobile-first

As telas começam em uma coluna, com espaçamento reduzido e ações que podem quebrar em mais de uma linha. Grades de formulário só passam a duas ou mais colunas a partir de `sm`/`lg`. Conteúdos que precisam manter largura mínima para leitura, como o calendário mensal, usam rolagem horizontal no próprio componente; a página e o menu não são alargados por eles. Nas áreas operacionais de maior densidade, a interface troca a grade por cartões no celular: a agenda administrativa do laboratório é agrupada por dia e horário. Nos três relatórios, o celular usa um seletor de dia e exibe somente os cartões do dia escolhido — planejamentos, aulas/ACs do docente ou ocupações do ambiente.
