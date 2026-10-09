# CLAUDE.md

Front-end Angular da **Tech Curse** (plataforma de cursos). Consome a Tech Curse API ([`tech-curse/tech-curse-api`](https://github.com/tech-curse/tech-curse-api), clonada como irmã em `../tech-curse-api`, .NET 10).

> O projeto é documentado em **português brasileiro**: commits, docs, textos de UI e identificadores em pt-BR.

> **Não escreva comentários. Em nenhum arquivo.** Vale para `.ts`, `.html`, `.css`, arquivos de configuração (`.editorconfig`, `eslint.config.js`, `.vscode/*.json`) e para qualquer `Dockerfile`, compose ou workflow que venha a existir. A justificativa de uma escolha vai na mensagem de commit, na descrição do PR ou neste arquivo, nunca no arquivo-fonte. Isto vale também para instruções passadas a subagentes. Documentação em arquivos `.md` segue normalmente.
>
> Duas exceções, ambas por não serem código escrito aqui:
>
> - `src/app/shared/ui/**` — gerado pelo CLI do spartan (ver "Arquitetura").
> - `.gitignore` — template padrão do Angular CLI.

**O comportamento esperado do front está em [`docs/especificacoes/`](docs/especificacoes/README.md)**, a fonte da verdade para telas, navegação e sessão, com cenários com ID (`WEB-AUTH-011`). O contrato HTTP é o da especificação da API. Os testes derivam de lá e trazem o ID no nome. Mudou comportamento: atualize especificação, código e teste no mesmo PR. Cenário marcado **divergente** descreve o comportamento desejado, não o atual.

## Twelve-Factor

O front segue o [Twelve-Factor App](https://12factor.net/pt_br/), adaptado a uma aplicação estática; o checklist está em [`docs/twelve-factor.md`](docs/twelve-factor.md). Regras práticas:

- **Um build só para todos os ambientes.** O que muda por ambiente (endereço da API, funcionalidades ligadas como pagamentos) vem do `config.json` lido em runtime, nunca de `src/environments/` nem de flag de build. Os arquivos de `src/environments/` saem na Fase 4 (`WEB-NAV-010`).
- **Funcionalidade é ligada por configuração**, com o padrão desligado, nunca por detectar o ambiente (hostname, `isDevMode()` etc.).
- **Nada de estado no servidor**: a sessão vive no navegador.
- **Nada de segredo no front**: tudo o que chega ao navegador é público. A API fica na mesma origem do front em todo ambiente (proxy do `ng serve` em dev, Nginx do host em staging e produção). Estrutura completa em [`docs/configuracao.md`](docs/configuracao.md).

## Comandos

```bash
npm start            # ng serve em http://localhost:4200
npm run build        # build de produção em dist/
npm run lint         # angular-eslint
npm run format       # prettier (ordena classes Tailwind)
npm run format:check # prettier sem alterar arquivos
npx ng g @spartan-ng/cli:ui <primitivo>  # components.json define o destino (src/app/shared/ui)
```

## Arquitetura

- Angular 22, standalone, signals, zoneless. Estado em services com signals; leitura remota via `httpResource`.
- `src/app/core/` — auth (`AutenticacaoService`, `tokenInterceptor`, guards), http (`erroInterceptor` → `ErroApi`), api (services + modelos dos DTOs), notificacao (toasts), tema (claro/escuro), layout (shell e público).
- `src/app/shared/ui/` — componentes helm do spartan copiados pelo CLI; importados por `@spartan-ng/helm/<primitivo>`. **Não edite à mão** o que o CLI gerou sem motivo; para trocar cores use `src/styles.css` (tema exportado do SimUI).
- `src/app/features/` — uma pasta por área (`auth`, `catalogo`, `aluno`, `admin`, `erros`), cada uma com suas rotas lazy.
- `core/aluno/` — `PerfilAlunoService` (perfil do `/Student/me` e matrículas em signals; estado `inativo | carregando | pendente | ativo | erro`), lido pelo catálogo, pelo detalhe e pela área `/aluno`.
- Ordem dos interceptors em `app.config.ts`: `[erroInterceptor, tokenInterceptor]` — o de token vê o 401 cru antes da conversão para `ErroApi`.

## Backend

- Base de desenvolvimento: `http://localhost:5130/tech-curse` (`environment.development.ts`).
- Claims do JWT: `nameid`, `email`, `role`. Erros em `ProblemDetails`; `422` traz `errors` com **códigos do Identity** (`PasswordRequiresDigit`, `DuplicateEmail`, ...), mapeados para campos em `RegistrarComponent`.
- `UserName` = nome informado no registro e não aceita espaços (regra padrão do Identity).

## Fases

1. Fundação — autenticação, layout e catálogo.
2. Portal do aluno — matrícula, `/me`, pagamentos.
3. Painel administrativo — **não iniciado.** O plano de fases foi encerrado em 2026-10-08: o desenvolvimento de features está pausado para o deploy do estado atual em produção.

Não há build de imagem neste repositório; ele entra na Fase 4.

## Testes

- **Unitários:** Vitest pelo builder `@angular/build:unit-test` (`npm test`), em Node com jsdom, arquivos `*.spec.ts` ao lado do código em `src/`. Configuração em `angular.json` (alvo `test`) e `tsconfig.spec.json`; o `tsconfig.app.json` exclui os `*.spec.ts` do build do app.
- **End-to-end:** Playwright em `e2e/` (`npm run e2e`), só Chromium. O `playwright.config.ts` sobe o app com `ng serve --configuration production` na porta 4300: bundle de produção, o mais perto do que vai para o ar antes da imagem Nginx. Fluxos que dependem da API entram com a API rodando no CI (Fase 3c).
- **Todo teste começa o nome pelo ID do cenário** da especificação: `it('WEB-AUTH-016: ...')`, `test('WEB-NAV-001: ...')`. `scripts/rastreabilidade.mjs` lista os cenários implementados sem teste e falha se um teste citar ID inexistente.
- Seletores do Playwright: prefira papel e rótulo acessível (`getByRole`, `getByLabel`); `data-teste` quando não houver um rótulo estável.

O CI (`.github/workflows/ci.yml`) roda em todo PR e em todo push na `main`, com Node da versão do `.nvmrc`. O job `ci` faz `npm ci`, lint, `format:check`, build, testes unitários com cobertura e o relatório de rastreabilidade (cobertura e rastreabilidade vão para o resumo da execução). O job `e2e` roda o Playwright e guarda o relatório como artefato quando falha. `ci` é o check obrigatório na proteção da `main`; renomear o job quebra a proteção. O `e2e` vira obrigatório depois de alguns dias estável.

**Atualização do Angular é sempre por `ng update`**, nunca por `npm install` avulso: os pacotes `@angular/*` precisam ficar na mesma versão, e o `ng update` resolve os peers em conjunto e roda as migrações. Por isso o Dependabot (`.github/dependabot.yml`) ignora majors do Angular, do `angular-eslint` e do TypeScript (a versão suportada do TypeScript é ditada pelo Angular) e agrupa os pacotes que sobem juntos (`angular`, `ng-icons`).

## Decisões registradas

- `erroInterceptor` também silencia `400` (além de `401`/`422`) — os formulários tratam esse status inline (ex.: credenciais inválidas no login).
- A ordem das rotas `''` em `app.routes.ts` é obrigatória: o bloco do `ShellComponent` vem ANTES do bloco do `PublicoLayoutComponent`. O recognizer do Angular casa a primeira rota `''` por prefixo; se o layout público viesse primeiro, `/` carregaria `AUTH_ROUTES` sem filho para o restante vazio e nunca chegaria ao redirect `'' → cursos` do shell.
- `roleGuard` roda em `canMatch` (preserva o lazy-skip) e, quando `auth.role() === null` (anônimo), redireciona direto para `/entrar` com `returnUrl` — em vez de cair em `/sem-permissao` e só depois ser redirecionado pelo `autenticadoGuard` (o que faria o usuário, após logar, parar em "Sem permissão" em vez da rota pretendida).
- Erros `422` no registro são distribuídos por um mapa em signal (código do Identity → campo), não por `setErrors` do Reactive Forms.
- Tema em HEX (exportação padrão do SimUI) — ver `src/styles.css`.
- Produção assume proxy reverso na mesma origem (`apiUrl: '/tech-curse'`); ajustar `environment.ts` no deploy.
- `SILENCIAR_ERRO` (`HttpContextToken` do `erroInterceptor`): a requisição converte o erro para `ErroApi` mas não mostra toast. Usado pelo `/Student/me`, cujo 404 é o estado "perfil pendente".
- Erros de `httpResource` podem chegar embrulhados (`cause`); leia com `extrairErroApi`.
- Estado de listas (página, ordem, categoria) fica na query string e chega aos componentes como inputs (`withComponentInputBinding`).
- Locale `pt-BR` e moeda `BRL` registrados no `app.config.ts`.
- `PerfilAlunoService.estado` checa `hasValue()` **antes** de `isLoading()`. Durante um reload o `httpResource` fica em `'reloading'` com `hasValue()` ainda `true`; na ordem inversa, `recarregarPerfil()` derrubaria o estado para `'carregando'` e destruiria o `<router-outlet>` do `AlunoLayoutComponent`.
- `catch` vazio é intencional em dois casos, e por isso o ESLint roda com `no-empty: allowEmptyCatch`: acesso ao `localStorage` (indisponível em navegação privada ou com storage bloqueado; sessão e tema caem no padrão) e erros HTTP de ações que o `erroInterceptor` já transformou em toast (ex.: `matricular()` no detalhe do curso).

## Git

Repositório `tech-curse/tech-curse-web`, desenvolvimento trunk-based: branch curta a partir de `main`, PR com título em Conventional Commits e **squash merge**. A `main` está sempre implantável; nada de push direto. Conventional Commits em pt-BR (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`). Sem linhas de atribuição de IA em commits ou PRs. Mudanças notáveis entram no `CHANGELOG.md`, seção `[Não lançado]`, no mesmo PR.

O `.gitattributes` fixa LF no checkout (`eol=lf`), independentemente do `core.autocrlf` da máquina. Sem isso, um clone no Windows com `autocrlf=true` recebe CRLF e o `npm run format:check` acusa todos os arquivos, porque o Prettier exige LF.

O plugin `superpowers` fica habilitado para o repositório em `.claude/settings.json`; o espaço de trabalho dele (`.superpowers/`) não é versionado.
