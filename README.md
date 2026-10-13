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
- A [Tech Curse API](https://github.com/tech-curse/tech-curse-api) rodando em `http://localhost:5130`. O jeito mais curto é o `docker compose up --build` do repositório da API; o README de lá explica o `.env`.

```bash
npm ci
cp public/config.example.json public/config.json
npm start
```

Abra http://localhost:4200, crie uma conta de aluno em `/registrar` e entre em `/entrar`.

O `npm start` encaminha `/tech-curse` para a API em `http://localhost:5130` (`proxy.conf.json`), então o navegador fala com a API na mesma origem do front, como em produção. O `public/config.json` fica fora do git.

### Em contêiner

A imagem serve o build de produção pelo Nginx, na porta `8080`, e gera o `config.json` a partir de variáveis de ambiente (lista no `.env.example`):

```bash
docker build -t tech-curse-web:dev .
docker run --rm -p 127.0.0.1:8081:8080 -e PAGAMENTOS_HABILITADOS=true tech-curse-web:dev
```

Abra http://localhost:8081. Sozinha, a imagem não alcança a API: em staging e em produção, o Nginx do host encaminha `/tech-curse` para ela. Para conferir a imagem como o CI confere: `./scripts/verificar-conteiner.sh`.

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

O app lê `/config.json` ao abrir, antes de iniciar: `apiUrl` (caminho base da API, `/tech-curse`) e `pagamentosHabilitados` (mostra a área de pagamentos; padrão `false`). O mesmo build serve qualquer ambiente; sem um `config.json` válido, o app mostra um erro em vez de abrir. Detalhes em [`docs/configuracao.md`](docs/configuracao.md).

## Contribuindo

Desenvolvimento trunk-based: branch curta a partir de `main`, pull request com título em [Conventional Commits](https://www.conventionalcommits.org/pt-br/) e squash merge. As mudanças notáveis estão no [CHANGELOG](CHANGELOG.md).
