---
tags: [classhub, seguranca, autenticacao]
---

# Autenticação e segurança

## Implementação atual

O contexto `auth-context.tsx` não usa Supabase Auth. No login, o navegador consulta `usuarios`, trazendo inclusive `senha`, compara a senha em JavaScript e grava o objeto de sessão no `localStorage` sob `classhub.session.v1`. Sair apenas remove essa chave local.

O `AuthGate` redireciona sem sessão para `/login` e obriga alteração de senha quando `primeiro_login` é verdadeiro. A sidebar e algumas rotas escondem recursos administrativos por `tipo === "admin"`.

## Estado das políticas

As migrations configuram RLS, porém grande parte usa política `open_all` para `anon` e `authenticated`, inclusive `usuarios`, `planejamentos`, laboratório e solicitações. Portanto, as restrições de interface não constituem autorização efetiva no banco.

O bucket `anexos` também é público e suas políticas permitem leitura, inserção, alteração e exclusão para o bucket.

## Riscos críticos documentados

- Senhas estão em texto puro na coluna `usuarios.senha`, são lidas pelo browser e comparadas no cliente.
- Um visitante com a chave pública e acesso à API pode potencialmente executar operações que a interface só esconde.
- A sessão em localStorage pode ser forjada no navegador; não há token verificável no servidor.
- Funções `SECURITY DEFINER` legadas coexistem com acesso aberto; a estratégia de autenticação mudou ao longo das migrations.
- O backup/restauração feito no cliente pode apagar e regravar dados de diversas tabelas sem transação global.

## Direção recomendada

1. Migrar para Supabase Auth ou backend autenticado; nunca retornar senha ao cliente.
2. Armazenar hash forte de senha apenas se autenticação própria for indispensável.
3. Reescrever RLS por papel/identidade e remover `open_all` em produção.
4. Mover aprovação do laboratório e restauração de backup para funções transacionais privilegiadas.
5. Tornar anexos privados ou usar URLs assinadas; validar tipo/tamanho de upload.

Essas observações descrevem a implementação encontrada e não alteram o comportamento atual.

