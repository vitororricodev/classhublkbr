---
tags: [classhub, operacao, deploy]
---

# Operação, deploy e backup

## Pré-requisitos e comandos

Execute na pasta `classhublkbr`:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

O desenvolvimento sobe em `http://localhost:8080`. O build produz `dist/`.

## Variáveis de ambiente

O cliente efetivamente lê:

```env
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave-publica>
```

O README também menciona aliases antigos (`VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`), mas o arquivo do cliente atual usa a chave publicável. Variáveis iniciadas por `VITE_` entram no bundle do navegador; nunca inserir chave secreta nelas.

## Supabase

- Aplicar `supabase/SETUP_CLASSHUB.sql` em instalação inicial e as migrations em sequência no ambiente configurado.
- Confirmar a existência do bucket `anexos` e das tabelas/colunas mais recentes antes de publicar.
- Regenerar `src/integrations/supabase/types.ts` após alterações no banco para manter o TypeScript coerente.

## Vercel

`vercel.json` executa `npm run build`, publica `dist`, instala com `npm install --legacy-peer-deps` e aplica rewrite SPA de qualquer rota para `index.html`. Configure as variáveis necessárias no projeto Vercel.

## Backup e recuperação

Use a tela **Backup e Restauração** apenas com cópia confiável do ambiente e com todos os usuários avisados. A operação substitui dados, não tem rollback automático e possui cobertura limitada — veja [[06-Regras-e-fluxos]]. Mantenha uma cópia externa do JSON e uma exportação dos objetos do bucket `anexos`.

