---
tags: [classhub, relatorios, pdf, labcs]
status: implementado
created: 2026-09-08
---

# Reformulação da Central de Relatórios

## Objetivo

Substituir a apresentação herdada do padrão antigo do SGE por uma **Central de Relatórios** alinhada à interface atual do ClassHub. A reformulação mantém as consultas existentes, os controles de acesso e as exportações, mas torna a finalidade de cada relatório mais clara antes da emissão do PDF.

## O que mudou

| Área | Antes | Agora |
|---|---|---|
| Entrada | Título genérico e abas compactas | Cabeçalho da Central de Relatórios, com descrição e atalhos visuais para cada consulta. |
| Relatório de planejamentos | Apenas filtros e tabela | Resumo de registros por status, filtros responsivos e pré-visualização com estado vazio explícito. |
| Grade docente | Fluxo voltado à impressão | Consulta orientada por docente, período e formato, com total de aulas, ACs e dias letivos. |
| Ambientes | Foco apenas em disponibilidade | Leitura de ocupação dos laboratórios com totais de horários livres, ocupados e que exigem revisão. |
| PDF | Cabeçalho e rodapé SGE legados | Identidade **ClassHub · Gestão escolar**, preservando conteúdo, período, responsável e paginação. |

## Relatórios disponíveis

### Planejamentos

Permite filtrar aulas por período, docente, componente, turma e status. Administradores consultam o conjunto da escola; usuários vinculados a docentes permanecem limitados ao próprio escopo. A exportação contém todos os registros filtrados, enquanto a tela mostra uma pré-visualização de até 50 itens.

### Grade docente e atividades complementares

Exibe aulas não canceladas e atividades complementares no mesmo período. Pode ser consultado como grade semanal ou lista. O lançamento, edição e exclusão de AC continuam restritos à administração.

### Uso dos laboratórios

Cada emissão é vinculada a um laboratório selecionado. A tela apresenta a grade de disponibilidade ou a lista detalhada de ocupações. A lista e seu PDF preservam, para o **LabCS — Laboratório de Conexões e Saberes**, os dados pedagógicos de tipo de atividade, participantes, recursos, habilidades e objeto do conhecimento quando registrados.

## Regras preservadas

- Intervalos em `horarios_padrao` não são tratados como horários livres.
- Conflitos continuam sinalizados como **A revisar** quando houver mais de uma ocupação para a mesma data e horário.
- Nenhuma exportação substitui registros no banco; o PDF é gerado localmente a partir do resultado filtrado.
- O nome e o conteúdo do ambiente vêm do cadastro, evitando mistura entre LabCS e Laboratório de Informática.

## Arquivos envolvidos

- `src/routes/relatorios.tsx` — interface, filtros, indicadores e geração dos três PDFs.
- `vault-classhub/13-Especificacao-LabCS.md` — requisitos pedagógicos refletidos no relatório de ambientes.
- `vault-classhub/03-Rotas-e-telas.md` — inventário atualizado da rota `/relatorios`.

## Verificação recomendada

1. Emitir um PDF de cada uma das três áreas e conferir cabeçalho, rodapé, filtros e paginação.
2. Conferir que um usuário docente só visualiza sua própria grade e seus planejamentos.
3. No relatório de ambientes, selecionar LabCS em formato de lista e validar os dados pedagógicos de uma oficina e de uma aula prática.
4. Conferir um período sem registros para validar a mensagem de estado vazio.
