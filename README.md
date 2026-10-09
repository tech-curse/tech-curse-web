# Tech Curse Web

[![CI](https://github.com/tech-curse/tech-curse-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tech-curse/tech-curse-web/actions/workflows/ci.yml)

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

- Node.js 24 (versão em `.nvmrc`; com nvm, rode `nvm use`) e npm 11.
- A [Tech Curse API](https://github.com/tech-curse/tech-curse-api) rodando em `http://localhost:5130`. Siga o README de lá; o CORS de desenvolvimento da API já libera `http://localhost:4200`.

```bash
npm ci
npm start
```

Abra http://localhost:4200, crie uma conta de aluno em `/registrar` e entre em `/entrar`.

O endereço da API em desenvolvimento fica em `src/environments/environment.development.ts`. O build de produção (`npm run build`) assume a API na mesma origem, em `/tech-curse`, atrás de um proxy reverso.

## Como testar

```bash
npm test                 # testes unitários (Vitest, em Node com jsdom)
npm run test:cobertura   # o mesmo, com relatório de cobertura em coverage/
npm run e2e              # testes end-to-end (Playwright, Chromium)
```

Antes do primeiro `npm run e2e`, instale o navegador com `npx playwright install chromium`. Os testes end-to-end sobem sozinhos o app com a configuração de produção (`ng serve --configuration production`, porta 4300).

Cada teste traz no nome o cenário da [especificação](docs/especificacoes/README.md) que cobre. Para ver quais cenários implementados ainda não têm teste: `node scripts/rastreabilidade.mjs`.

Verificações de qualidade:

```bash
npm run lint
npm run format:check
npm run build
```

O CI roda tudo isso em todo pull request e em todo push na `main`: lint, formatação, build, testes unitários com cobertura e rastreabilidade no job `ci`, e os testes end-to-end no job `e2e`.

## Configuração

O front-end não lê variáveis de ambiente. A única configuração é o endereço da API, hoje definido em tempo de build pelos arquivos de `src/environments/`.

## Contribuindo

Desenvolvimento trunk-based: branch curta a partir de `main`, pull request com título em [Conventional Commits](https://www.conventionalcommits.org/pt-br/) e squash merge. As mudanças notáveis estão no [CHANGELOG](CHANGELOG.md).
