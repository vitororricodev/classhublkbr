---
tags: [sge, roadmap, evolucao, decisao]
aliases: [Roadmap SGE, Próximas decisões]
---

# Roadmap e próximas decisões

## Como ler este roadmap

Este documento não autoriza implementação automática. Ele organiza as melhorias identificadas para Levi Ribeiro e Vitor Orrico escolherem o próximo ciclo. A evidência e a coluna de decisão ficam em [[15-Revisao-Levi-e-Vitor]].

## Ciclo 1: proteção e confiabilidade

| Iniciativa | Resultado esperado | Dependência | Critério de conclusão |
|---|---|---|---|
| Segurança de acesso | Login e permissões protegidos no banco, sem expor validação sensível ao navegador. | Auditoria de RLS e decisão sobre Supabase Auth ou RPC segura. | Perfis testados e acesso indevido bloqueado. |
| Aprovação atômica do laboratório | Um pedido aprovado sempre gera uma reserva correspondente, sem estados parciais. | Nova RPC transacional e revisão de concorrência. | Teste de sucesso e falha sem inconsistência. |
| Recuperação confiável | Backup com escopo explícito e restauração segura. | Definição dos dados e arquivos que entram no backup. | Recuperação comprovada em ambiente isolado. |

## Ciclo 2: base para evolução

| Iniciativa | Resultado esperado | Dependência | Critério de conclusão |
|---|---|---|---|
| Banco e tipos sincronizados | Código, migrations e tipos representam a mesma estrutura. | Conferência do ambiente remoto. | Sem casts evitáveis nas áreas revisadas. |
| Testes de fluxos críticos | Proteção contra regressões em regras de negócio. | Escolha da ferramenta de testes e massa de dados. | Cobertura inicial de laboratório, permissões e planejamentos. |
| Formulários consistentes | Validações e mensagens reutilizáveis. | Esquemas centralizados. | Laboratório e planejamentos usando os esquemas acordados. |

## Ciclo 3: experiência e desempenho

| Iniciativa | Resultado esperado | Dependência | Critério de conclusão |
|---|---|---|---|
| Relatórios mais leves | Abertura fluida, sobretudo no celular. | Medição em aparelhos e redes reais. | Dependências pesadas carregadas sob demanda, se necessário. |
| Validação mobile contínua | Agenda, LabCS e relatórios confiáveis em aparelhos reais. | Roteiro de testes por cenário. | Cenários críticos aprovados em Android e iPhone. |
| Consistência de identidade | SGE e LabCS coerentes em telas, PDF e mensagens. | Revisão a cada nova funcionalidade. | Checklist visual aprovado antes da publicação. |

## Governança de versões

| Branch | Finalidade | Regra |
|---|---|---|
| `main` | Evolução ativa do SGE. | Recebe melhorias concluídas e validadas. |
| `comercial` | Versão aprovada para uso comercial. | Só recebe atualização por decisão explícita, em commit separado e com validação antes do rebase ou merge. |

## Próxima reunião sugerida

1. Decidir o modelo de autenticação e a prioridade de auditoria de RLS.
2. Aprovar ou adiar a RPC transacional de laboratório.
3. Definir o escopo aceitável de backup e restauração.
4. Escolher quais testes entram no primeiro conjunto automatizado.
5. Registrar decisões e responsáveis em [[15-Revisao-Levi-e-Vitor]].

Voltar ao [[00-INDICE-MESTRE-SGE]].
