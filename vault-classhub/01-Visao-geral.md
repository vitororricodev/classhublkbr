---
tags: [classhub, produto]
---

# Visão geral

O SGE (Sistema de Gerenciamento Escolar) é uma aplicação interna de planejamento acadêmico. Centraliza o cadastro de docentes, turmas, componentes e horários; a agenda de aulas; o uso do laboratório; relatórios; feriados; atividades complementares; usuários; e cópia de segurança dos dados.

## Identidade visual

Em 16/08/2026, a interface passou a usar a identidade da escola: azul institucional como cor principal, azul-ciano nos destaques e dourado em estados de ênfase. O nome visível do produto é **SGE — Sistema de Gerenciamento Escolar**. Chaves técnicas legadas, como sessão e nomes de backup, foram preservadas para não invalidar acessos ou arquivos existentes.

## Perfis

| Perfil | Capacidades na interface |
|---|---|
| `admin` | Acesso a toda a navegação, inclusive laboratório, aprovações, categorias de AC, usuários e backup/restauração. |
| `usuario` | Dashboard, agenda, solicitação de laboratório, relatórios e cadastros gerais visíveis. Quando vinculado a um docente, a agenda e dashboard são filtrados pelas aulas criadas pelo próprio usuário (`criado_por`). |

## Domínios funcionais

1. **Cadastros base:** docentes, componentes curriculares, turmas, horários e feriados.
2. **Planejamento:** calendário mensal, criação/edição de aula, status, conteúdo, anexos, replicação e exclusão em massa.
3. **Laboratório:** agenda independente, solicitação pelo docente e aprovação administrativa.
4. **Relatórios:** geral de aulas, por docente com atividades complementares e mapa do laboratório; impressão/PDF na interface.
5. **Administração:** usuários, categorias de AC e backup/restauração em JSON.

## Conceitos centrais

- **Planejamento** é a aula formal de uma turma, docente, componente, data e horário.
- **Agendamento de laboratório** é um registro de uso do espaço físico. Ele é independente do planejamento e pode coexistir com a aula normal.
- **Solicitação de laboratório** é uma intenção pendente. Quando aprovada, o cliente cria o respectivo agendamento.
- **Atividade complementar (AC)** ocupa um horário do docente apenas no relatório de docente; não bloqueia a agenda normal de aulas.

Veja também: [[06-Regras-e-fluxos]] e [[03-Rotas-e-telas]].
