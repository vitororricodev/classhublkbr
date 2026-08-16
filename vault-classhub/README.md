---
tags: [classhub, indice, documentacao]
---

# Vault SGE

Documentação técnica e funcional do SGE (Sistema de Gerenciamento Escolar), produzida a partir do código e das migrations presentes neste repositório em 15/08/2026. Os links usam a sintaxe do Obsidian; abra esta pasta como um vault para navegar por eles.

## Mapa

- [[01-Visao-geral]] — objetivo, escopo e funcionalidades.
- [[02-Arquitetura-e-stack]] — componentes técnicos e fluxo de dados.
- [[03-Rotas-e-telas]] — cada URL, público e responsabilidades.
- [[04-Modelo-de-dados]] — tabelas, relacionamentos, índices e estados.
- [[05-API-e-servicos]] — Supabase/PostgREST, RPCs e camada TypeScript.
- [[06-Regras-e-fluxos]] — regras de negócio e processos críticos.
- [[07-Autenticacao-e-seguranca]] — autenticação atual, permissões e riscos.
- [[08-Operacao-deploy-e-backup]] — desenvolvimento, variáveis, deploy e recuperação.
- [[09-Componentes-e-codigo]] — organização do frontend e arquivos relevantes.
- [[10-Qualidade-e-dividas-tecnicas]] — inconsistências verificadas e recomendações.
- [[11-Historico-de-migrations]] — evolução do esquema e ordem dos scripts.
- [[12-Expansao-laboratorio-multidisciplinar]] — plano técnico para o segundo laboratório.

## Fonte de verdade

O código é a fonte de verdade da interface e dos acessos atualmente executados. O esquema esperado é descrito pelas migrations em `supabase/migrations/`; o arquivo gerado `src/integrations/supabase/types.ts` retrata o snapshot de tipos disponível no frontend e pode estar desatualizado em relação ao banco remoto.
