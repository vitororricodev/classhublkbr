---
tags: [classhub, frontend, codigo]
---

# Componentes e código

## Arquivos principais

| Arquivo | Papel |
|---|---|
| `src/main.tsx` | Cria o `QueryClient`, instancia router e monta React. |
| `src/router.tsx` | Configuração do TanStack Router. |
| `src/routes/__root.tsx` | Layout, proteção de rota, 404 e boundary de erro. |
| `src/components/AppSidebar.tsx` | Navegação por perfil, contador de solicitações pendentes e menu lateral deslizante em dispositivos móveis. |
| `src/components/PlanejamentoForm.tsx` | Formulário de aula, anexos, filtros de laboratório e mutation de salvar. |
| `src/components/ReplicarAulasDialog.tsx` | Geração recorrente com prevenção de conflitos. |
| `src/components/ExcluirAulasMassaDialog.tsx` | Prévia e exclusão filtrada de aulas. |
| `src/lib/auth-context.tsx` | Sessão local e login atual. |
| `src/lib/db.ts` | Tipos de domínio e selects relacionais. |
| `src/lib/backupService.ts` | Formato, download, validação e restauração de backup. |
| `src/lib/feriados.ts` | Feriados nacionais fixos, helpers e query de feriados. |

## Convenções úteis

- Imports usam alias `@/` apontando para `src/`.
- Rotas seguem convenção file-based do TanStack Router com `createFileRoute`.
- Mutations mostram `toast` e invalidam query keys relacionadas.
- Objetos de formulário costumam ser mantidos com `useState`; não há camada de validação Zod centralizada apesar da dependência estar instalada.
- A UI reutilizável fica em `src/components/ui/`, baseada em shadcn/Radix; normalmente não contém regra de negócio.

## Estilos

`src/styles.css` contém tokens e estilo global Tailwind. A identidade visual do SGE usa o azul institucional `#007BB8`, azul-ciano `#00A3D7` e dourado `#F2C94C`, extraídos do emblema da escola.
