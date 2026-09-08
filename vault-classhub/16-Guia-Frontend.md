---
tags: [sge, frontend, interface, responsividade]
aliases: [Guia de Frontend, Interface SGE]
---

# Guia do Frontend

## Objetivo

Este guia indica onde uma alteração visual ou de fluxo deve ser feita, quais padrões da interface preservar e como validar antes de publicar.

## Visão rápida

| Camada | Local principal | Responsabilidade |
|---|---|---|
| Inicialização | `src/main.tsx` | Monta a aplicação React e providers globais. |
| Casca e acesso | `src/routes/__root.tsx` | Proteção de rotas, layout autenticado, cabeçalho e menu. |
| Telas | `src/routes/` | Cada arquivo é uma página e concentra a maior parte das consultas e ações do respectivo módulo. |
| Componentes reutilizáveis | `src/components/` | Sidebar, formulários, diálogos e componentes de experiência compartilhada. |
| Componentes base | `src/components/ui/` | Primitivas visuais baseadas em Radix/shadcn. |
| Dados no cliente | `src/services/` e `src/lib/` | Serviços CRUD, tipos, queries reutilizadas e utilitários. |
| Estilo global | `src/styles.css` | Tokens, impressão e estilos globais que não cabem nos componentes. |

Consulte [[03-Rotas-e-telas]] para localizar uma página pelo endereço e [[09-Componentes-e-codigo]] para detalhes de componentes relevantes.

## Padrões de experiência que devem ser preservados

### Mobile-first

- A tela nasce em uma coluna e ganha colunas apenas em breakpoints maiores.
- Ações importantes devem continuar visíveis sem exigir rolagem horizontal da página.
- Grades densas de agenda e relatórios usam cartões com seletor de dia no celular.
- Campos, botões e textos precisam manter área de toque adequada e leitura sem zoom.

### Navegação

- Em desktop, o menu lateral fica fixo e apenas o conteúdo principal rola.
- Em telas baixas, o menu pode rolar internamente. A classe `sidebar-scroll` mantém esse indicador discreto e só o revela quando necessário.
- Em celular, a navegação é apresentada por cabeçalho compacto e menu lateral deslizante.

### Linguagem e identidade

- O nome de produto exibido é **SGE, Sistema de Gerenciamento Escolar**.
- Para o laboratório multidisciplinar, use **LabCS, Laboratório de Conexões e Saberes**.
- Prefira frases curtas, rótulos diretos e pontuação natural. Travessões não devem ser usados como separador visual recorrente.
- Cor reforça o significado, mas não pode ser a única forma de comunicar status. A solicitação de laboratório usa cartões textuais para Disponível, Ocupado, Em análise e Intervalo.

## Pontos de entrada por módulo

| Módulo | Tela ou componente principal | Referência funcional |
|---|---|---|
| Agenda e planejamentos | `src/routes/agendamento.tsx`, `src/components/PlanejamentoForm.tsx` | [[06-Regras-e-fluxos]] |
| Laboratórios administrativos | `src/routes/laboratorio.tsx` | [[13-Especificacao-LabCS]] |
| Solicitação de laboratório | `src/routes/solicitar-laboratorio.tsx` | [[13-Especificacao-LabCS]] |
| Aprovação | `src/routes/aprovacoes-laboratorio.tsx` | [[06-Regras-e-fluxos]] |
| Relatórios e PDF | `src/routes/relatorios.tsx` | [[14-Reformulacao-dos-relatorios]] |
| Menu e shell | `src/components/AppSidebar.tsx`, `src/routes/__root.tsx` | [[03-Rotas-e-telas]] |

## Checklist antes de concluir uma alteração visual

- [ ] Conferir celular estreito, celular largo e desktop.
- [ ] Conferir estados vazio, carregando, erro e dados longos.
- [ ] Conferir se o conteúdo rola, sem fazer menu ou cabeçalho rolarem indevidamente.
- [ ] Conferir acessibilidade básica: rótulo associado ao campo, ação compreensível e status não dependente somente de cor.
- [ ] Conferir nomenclatura SGE e LabCS em títulos, mensagens e PDF.
- [ ] Executar `npm run lint` e `npm run build` antes de publicar.

## Limites importantes

- `src/routeTree.gen.ts` é gerado automaticamente. Não deve ser editado manualmente.
- A interface esconde itens administrativos, mas autorização não pode depender apenas disso. Regras reais pertencem ao Supabase; veja [[17-Guia-Backend-e-Supabase]].
- O frontend chama o Supabase diretamente. Uma mudança de campo exige cuidado conjunto com migration, tipos e políticas.

Voltar ao [[00-INDICE-MESTRE-SGE]].
