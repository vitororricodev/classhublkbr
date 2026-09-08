---
tags: [sge, indice, documentacao]
aliases: [Comece aqui, Índice do SGE, Manual do SGE]
---

# SGE: índice mestre da documentação

> **Ponto de partida do vault.** Este é o mapa de leitura do SGE, feito para orientar decisões de produto, manutenção técnica e evolução do sistema.

**Produto:** SGE, Sistema de Gerenciamento Escolar  
**Público:** Levi Ribeiro, Vitor Orrico e pessoas responsáveis por produto, desenvolvimento ou operação.  
**Fonte de verdade:** o código descreve o comportamento atual da interface; `supabase/migrations/` descreve a evolução esperada do banco. O ambiente remoto deve ser confirmado antes de qualquer alteração estrutural.

## Escolha seu caminho

| Se você quer... | Comece por... | Depois consulte... |
|---|---|---|
| Entender o produto e seus módulos | [[01-Visao-geral]] | [[03-Rotas-e-telas]] e [[06-Regras-e-fluxos]] |
| Alterar uma tela, formulário ou comportamento visual | [[16-Guia-Frontend]] | [[03-Rotas-e-telas]] e [[09-Componentes-e-codigo]] |
| Alterar dados, banco, permissões ou integrações | [[17-Guia-Backend-e-Supabase]] | [[04-Modelo-de-dados]], [[05-API-e-servicos]] e [[11-Historico-de-migrations]] |
| Evoluir o LabCS | [[13-Especificacao-LabCS]] | [[12-Evolucao-do-LabCS]] e [[06-Regras-e-fluxos]] |
| Consultar ou alterar relatórios | [[14-Reformulacao-dos-relatorios]] | [[16-Guia-Frontend]] |
| Preparar uma publicação, backup ou restauração | [[08-Operacao-deploy-e-backup]] | [[17-Guia-Backend-e-Supabase]] |
| Decidir prioridades e riscos | [[15-Revisao-Levi-e-Vitor]] | [[18-Roadmap-e-Proximas-Decisoes]] |

## Mapa da documentação

### Produto e regras de negócio

- [[01-Visao-geral]]: objetivo, perfis, módulos e conceitos.
- [[03-Rotas-e-telas]]: cada rota, público, responsabilidade e estratégia mobile.
- [[06-Regras-e-fluxos]]: regras de agenda, planejamento, laboratório, aprovação e backup.
- [[13-Especificacao-LabCS]]: dados pedagógicos e experiência específica do LabCS.
- [[14-Reformulacao-dos-relatorios]]: central de relatórios, filtros, cards mobile e PDFs.

### Frontend

- [[16-Guia-Frontend]]: ponto de entrada, organização, componentes-chave, responsividade e checklist de alteração.
- [[02-Arquitetura-e-stack]]: tecnologias, cache e comunicação com o banco.
- [[09-Componentes-e-codigo]]: componentes e convenções de implementação.

### Backend, dados e segurança

- [[17-Guia-Backend-e-Supabase]]: modelo de acesso, mudanças no banco, permissões e operação.
- [[04-Modelo-de-dados]]: tabelas, relações, estados e índices esperados.
- [[05-API-e-servicos]]: serviços, consultas compostas, RPCs e arquivos.
- [[07-Autenticacao-e-seguranca]]: autenticação atual, perfis e pontos de atenção.
- [[11-Historico-de-migrations]]: ordem e contexto das migrations.

### Operação e evolução

- [[08-Operacao-deploy-e-backup]]: ambiente, Vercel, variáveis e recuperação.
- [[15-Revisao-Levi-e-Vitor]]: pauta objetiva de riscos e decisões conjuntas.
- [[18-Roadmap-e-Proximas-Decisoes]]: prioridades propostas, dependências e critérios de conclusão.
- [[10-Qualidade-e-dividas-tecnicas]]: evidências técnicas que sustentam a pauta de revisão.

## Convenções deste vault

1. Os arquivos numerados expressam a ordem recomendada de leitura, não prioridade absoluta.
2. Um documento de especificação descreve o comportamento desejado ou entregue; um documento de revisão aponta itens que ainda precisam de decisão.
3. Antes de alterar banco ou regras de permissão, consulte as migrations e confirme o ambiente remoto.
4. Antes de uma entrega comercial, registre a decisão em [[15-Revisao-Levi-e-Vitor]] e valide o checklist de operação.

## Situação atual

- A identidade adotada é **SGE**. O nome ClassHub pode permanecer apenas em referências técnicas legadas, como diretório, repositório ou nomes históricos de arquivos.
- A `main` concentra a evolução do produto. A branch `comercial` é uma versão controlada e só deve receber atualizações por decisão explícita e commit próprio.
- O LabCS possui especificação própria de agendamento e dados pedagógicos. Consulte [[13-Especificacao-LabCS]] antes de modificar seu fluxo.

---

**Leitura recomendada para uma primeira reunião:** [[01-Visao-geral]] → [[16-Guia-Frontend]] → [[17-Guia-Backend-e-Supabase]] → [[15-Revisao-Levi-e-Vitor]].
