---
tags: [sge, revisao, riscos, decisao]
---

# Revisão de melhorias e riscos

**Participantes:** Levi Ribeiro e Vitor Orrico  
**Atualizado em:** 08/09/2026  
**Objetivo:** decidir quais melhorias entram no próximo ciclo do SGE. Esta é uma pauta de decisão; não representa falhas confirmadas em produção.

## Como usar esta página

Cada item foi identificado a partir do código, das migrations e da validação de build atual. A coluna **Decisão** deve ser atualizada na reunião com uma das opções: `aprovar`, `adiar`, `aceitar risco` ou `descartar`, acompanhada de responsável e prazo.

## Prioridade alta

| Tema | O que foi identificado | Impacto se não for tratado | Recomendação | Decisão |
|---|---|---|---|---|
| Autenticação e senhas | O login consulta a tabela `usuarios` pelo frontend e compara a senha no navegador. A sessão também é mantida no `localStorage`. | Se as políticas do banco permitirem leitura indevida, dados de acesso podem ficar expostos. A segurança depende fortemente do RLS atual. | Auditar RLS imediatamente e migrar a validação para Supabase Auth ou RPC segura com senha protegida. | [ ] |
| Aprovação de laboratório | Aprovar uma solicitação cria o agendamento e atualiza a solicitação em duas operações separadas. | Uma falha entre as operações pode deixar pedido aprovado sem reserva, ou reserva criada sem aprovação. | Criar uma RPC transacional no banco para executar toda a aprovação de uma só vez. | [ ] |
| Backup e restauração | A restauração altera várias entidades e o backup não cobre necessariamente todos os dados e arquivos. | Uma restauração interrompida pode gerar dados parciais; itens fora do escopo podem não voltar. | Delimitar o escopo exibido na tela, criar restauração transacional e testar a recuperação em base isolada. | [ ] |

## Prioridade média

| Tema | O que foi identificado | Impacto se não for tratado | Recomendação | Decisão |
|---|---|---|---|---|
| Migrations e tipos do banco | Há histórico de tipos fora de sincronia e a migration do LabCS foi aplicada manualmente. Partes do frontend usam `any` para contornar essa diferença. | Uma tela pode compilar, mas falhar ao consultar uma coluna ou função ausente no banco remoto. | Conferir migrations aplicadas, regenerar os tipos Supabase e retirar os casts que já não forem necessários. | [ ] |
| Testes automatizados | O projeto não possui script de testes. Fluxos importantes hoje dependem de conferência manual. | Regressões em permissões, conflitos de horário, aprovação e relatórios podem chegar ao usuário. | Começar pelos testes dos fluxos críticos e manter um roteiro manual para celular antes de cada versão comercial. | [ ] |
| Validação de formulários | O projeto possui Zod e React Hook Form, mas vários formulários ainda validam regras diretamente na tela. | Regras podem ficar diferentes entre telas e mensagens de erro podem ser inconsistentes. | Centralizar esquemas e regras reutilizáveis, iniciando por laboratório e planejamentos. | [ ] |
| Desempenho dos relatórios | O build aponta que o pacote principal ultrapassa 500 kB após minificação; relatórios e geração de PDF concentram boa parte desse peso. | Em celulares com rede lenta, a primeira abertura pode demorar mais do que o esperado. | Medir em aparelho real e separar dependências pesadas por carregamento sob demanda se a experiência justificar. | [ ] |

## Atenção contínua

| Tema | Ponto de observação | Ação sugerida | Decisão |
|---|---|---|---|
| Navegação mobile | As telas de agenda e relatórios receberam versões em cards para celular. | Validar em Android e iPhone, com semanas cheias, agenda vazia, intervalos e pedidos pendentes. | [ ] |
| Versão comercial | A branch `comercial` é uma fotografia controlada e não acompanha a `main` automaticamente. | Para cada entrega comercial, registrar a versão de origem, validar e levar em commit próprio, preservando possibilidade de rebase. | [ ] |
| Identidade SGE | A padronização de nome foi aplicada nas telas revisadas. | Ao criar novas telas, conferir títulos, PDFs, mensagens e metadados para evitar o retorno do nome ClassHub. | [ ] |

## Ordem sugerida para decisão

1. **Segurança:** autenticação, RLS e senhas.
2. **Confiabilidade:** aprovação de laboratório e restauração de backup.
3. **Estabilidade de evolução:** migrations, tipos e testes.
4. **Experiência:** desempenho dos relatórios e validação em aparelhos reais.

## Registro da reunião

| Data | Decisões tomadas | Responsável | Prazo |
|---|---|---|---|
|  |  |  |  |

## Referências

- [[07-Autenticacao-e-seguranca]]
- [[08-Operacao-deploy-e-backup]]
- [[10-Qualidade-e-dividas-tecnicas]]
- [[11-Historico-de-migrations]]
- [[13-Especificacao-LabCS]]
