# Tech Curse Web

Front-end da plataforma de cursos **Tech Curse**: catálogo de cursos, cadastro e login de alunos, matrícula e área do aluno (meus cursos, meus pagamentos e perfil). Consome a [Tech Curse API](https://github.com/tech-curse/tech-curse-api).

## O que é

| Área | Rotas | Acesso |
| --- | --- | --- |
| Autenticação | `/entrar`, `/registrar` | anônimo |
| Catálogo | `/cursos`, `/cursos/:id` | qualquer usuário autenticado |
| Área do aluno | `/aluno/matriculas`, `/aluno/pagamentos`, `/aluno/perfil` | `Student` |
| Painel administrativo | `/admin` | `Admin` e `Instructor` (ainda não implementado) |

Stack: Angular 22 (standalone, signals, zoneless) · Tailwind CSS 4 · spartan/ui · tema SimUI.

## Como rodar

Pré-requisitos:

- Node.js 24.15 ou superior (npm 11).
- A [Tech Curse API](https://github.com/tech-curse/tech-curse-api) rodando em `http://localhost:5130`. Siga o README de lá; o CORS de desenvolvimento da API já libera `http://localhost:4200`.

```bash
npm ci
npm start
```

Abra http://localhost:4200, crie uma conta de aluno em `/registrar` e entre em `/entrar`.

O endereço da API em desenvolvimento fica em `src/environments/environment.development.ts`. O build de produção (`npm run build`) assume a API na mesma origem, em `/tech-curse`, atrás de um proxy reverso.

## Como testar

Ainda não há testes automatizados: testes unitários dos serviços e guards de autenticação e testes end-to-end com Playwright estão planejados. Até lá, as verificações disponíveis são:

```bash
npm run lint
npm run format:check
npm run build
```

## Configuração

O front-end não lê variáveis de ambiente. A única configuração é o endereço da API, hoje definido em tempo de build pelos arquivos de `src/environments/`.

## Contribuindo

Desenvolvimento trunk-based: branch curta a partir de `main`, pull request com título em [Conventional Commits](https://www.conventionalcommits.org/pt-br/) e squash merge. As mudanças notáveis estão no [CHANGELOG](CHANGELOG.md).
