# ClassHub

Sistema web de planejamento e agendamento acadêmico desenvolvido para gerenciamento interno de aulas, horários, docentes e planejamentos escolares.

---

# Visão Geral

O ClassHub é uma plataforma moderna voltada para organização acadêmica, permitindo:

* gerenciamento de docentes;
* gerenciamento de turmas;
* controle de horários;
* planejamento de aulas;
* organização curricular;
* relatórios e impressão;
* calendário acadêmico interativo;
* upload de anexos;
* persistência de dados via Supabase.

O sistema foi estruturado com foco em:

* simplicidade;
* produtividade;
* organização visual;
* arquitetura escalável;
* compatibilidade com Vercel;
* integração com Supabase.

---

# Stack Utilizada

## Frontend

* React
* TypeScript
* Vite
* TanStack Router
* TailwindCSS
* shadcn/ui

## Backend / Banco

* Supabase
* PostgreSQL
* Supabase Storage

## Hospedagem

* Vercel

## Controle de versão

* Git
* GitHub

---

# Funcionalidades

## Dashboard

Painel inicial com visão geral do sistema.

Cards:

* aulas cadastradas;
* docentes ativos;
* planejamentos;
* estatísticas gerais.

---

## Gestão de Docentes

Permite:

* cadastrar docentes;
* editar docentes;
* ativar/desativar;
* definir cor identificadora.

---

## Gestão de Componentes Curriculares

Permite:

* cadastrar componentes;
* editar componentes;
* ativar/desativar.

---

## Gestão de Turmas

Permite:

* cadastrar turmas;
* definir série;
* editar turmas;
* ativar/desativar.

---

## Gestão de Horários

Permite:

* cadastrar horários padrão;
* ordenar horários;
* editar horários;
* ativar/desativar.

---

## Planejamento Acadêmico

Sistema de calendário interativo para gerenciamento de aulas.

Recursos:

* calendário estilo Google Calendar;
* filtros em tempo real;
* cadastro rápido;
* edição de planejamentos;
* controle de conflitos de horário;
* upload de anexos.

---

# Regras de Negócio

## Conflito de Horário

O sistema impede:

* mesmo docente em dois horários iguais;
* mesma turma em dois horários iguais;
* dois docentes na mesma turma no mesmo horário.

---

# Relatórios

O sistema possui:

* impressão A4;
* layout profissional;
* filtros por período;
* relatórios acadêmicos.

---

# Estrutura do Projeto

```txt
src/
 ├── components/
 ├── hooks/
 ├── layouts/
 ├── lib/
 ├── routes/
 ├── services/
 ├── types/
 ├── utils/
 ├── pages/
 └── contexts/
```

---

# Estrutura do Banco de Dados

## docentes

| Campo              | Tipo      |
| ------------------ | --------- |
| id                 | uuid      |
| nome               | text      |
| cor_identificadora | text      |
| ativo              | boolean   |
| created_at         | timestamp |

---

## componentes_curriculares

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| nome       | text      |
| ativo      | boolean   |
| created_at | timestamp |

---

## turmas

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| serie      | text      |
| nome       | text      |
| ativo      | boolean   |
| created_at | timestamp |

---

## horarios_padrao

| Campo       | Tipo      |
| ----------- | --------- |
| id          | uuid      |
| label       | text      |
| hora_inicio | time      |
| hora_fim    | time      |
| ordem       | integer   |
| ativo       | boolean   |
| created_at  | timestamp |

---

## planejamentos

| Campo         | Tipo      |
| ------------- | --------- |
| id            | uuid      |
| data          | date      |
| horario_id    | uuid      |
| docente_id    | uuid      |
| componente_id | uuid      |
| turma_id      | uuid      |
| conteudo      | text      |
| anexo_url     | text      |
| status        | text      |
| created_at    | timestamp |
| updated_at    | timestamp |

---

# Configuração Local

## Instalar dependências

```bash
npm install
```

---

## Rodar projeto

```bash
npm run dev
```

---

## Build de produção

```bash
npm run build
```

---

# Configuração do .env

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE

VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE
```

---

# Configuração Supabase

## SQL

Executar o arquivo:

```txt
supabase/SETUP_CLASSHUB.sql
```

No:

```txt
Supabase → SQL Editor
```

---

## Storage

Bucket utilizado:

```txt
anexos
```

---

# Configuração Vercel

## Variáveis de Ambiente

Adicionar na Vercel:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## Build

```txt
Build Command:
npm run build

Output Directory:
dist
```

---

# Git

## Atualizar projeto

```bash
git pull origin main
```

---

## Subir alterações

```bash
git add .
git commit -m "Atualizações no ClassHub"
git push origin main
```

---

# Identidade Visual

## Paleta

| Cor             | Código  |
| --------------- | ------- |
| Roxo Principal  | #6D28D9 |
| Roxo Secundário | #7C3AED |
| Branco          | #FFFFFF |
| Cinza Claro     | #F5F5F5 |

---

# Objetivo do Projeto

O ClassHub foi desenvolvido para:

* facilitar organização acadêmica;
* centralizar planejamentos;
* melhorar produtividade escolar;
* modernizar gestão acadêmica;
* oferecer experiência visual moderna e intuitiva.

---

# Roadmap Futuro

## Próximas melhorias

* autenticação completa;
* controle de permissões;
* RLS avançado;
* geração PDF avançada;
* notificações;
* dashboards analíticos;
* multiusuário;
* logs;
* backups;
* exportação Excel;
* calendário avançado.

---

# Status do Projeto

```txt
MVP Funcional
```

Atualmente o sistema já possui:

* frontend funcional;
* integração Supabase;
* deploy Vercel;
* CRUD principal;
* calendário;
* upload de anexos;
* relatórios.

---

# Autor

Projeto desenvolvido por:

Vítor Orrico e
Levi Ribeiro

GitHub:
[https://github.com/vitororricodev](https://github.com/vitororricodev)
