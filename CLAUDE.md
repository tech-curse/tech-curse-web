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

- **Um build só para todos os ambientes.** O que muda por ambiente (endereço da API, funcionalidades ligadas como pagamentos) vem do `config.json` lido em runtime, nunca de `src/environments/` nem de flag de build. O `src/environments/` não existe mais (`WEB-NAV-010`).
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

- Endereço da API: `apiUrl` do `config.json` (`/tech-curse`), lido pelo `main.ts` antes do bootstrap e injetado pelo token `CONFIGURACAO` (`core/configuracao`). Em desenvolvimento, o proxy do `ng serve` (`proxy.conf.json`) leva `/tech-curse` para a API em `http://localhost:5130`.
- Claims do JWT: `nameid`, `email`, `role`. Erros em `ProblemDetails`; `422` traz `errors` com **códigos do Identity** (`PasswordRequiresDigit`, `DuplicateEmail`, ...), mapeados para campos em `RegistrarComponent` (`DuplicateEmail` e `InvalidEmail` no e-mail, `Password*` na senha, `Nome` no nome).
- O nome do registro é livre (1 a 100 caracteres, espaços e acentos); na API, o `UserName` do Identity é o e-mail. Erro `422` do nome chega em `errors.Nome`.

## Fases

1. Fundação — autenticação, layout e catálogo.
2. Portal do aluno — matrícula, `/me`, pagamentos.
3. Painel administrativo — **não iniciado.** O plano de fases foi encerrado em 2026-10-08: o desenvolvimento de features está pausado para o deploy do estado atual em produção.

## Imagem

`Dockerfile` na raiz, em dois estágios:

- **Build:** Node `24.21.0-alpine3.24` (a versão do `.nvmrc`), `npm ci` numa camada própria e depois `COPY . .` com `ng build`. O contexto é filtrado pelo `.dockerignore`, e não por uma lista de `COPY`: a primeira versão listava arquivos, esqueceu o `.postcssrc.json`, e a imagem saiu sem o Tailwind processado. Quem achou foram os testes end-to-end contra a imagem.
- **Runtime:** `nginx-unprivileged:1.30.4-alpine3.24` (linha estável do Nginx), usuário `101`, porta `8080`, `SIGQUIT` para encerrar e healthcheck em `/saude` (com `wget`, que a Alpine tem).

Configuração do Nginx em `nginx/`:

- `default.conf.template`: a imagem oficial passa o arquivo pelo `envsubst` na subida, só com as variáveis definidas, então `$uri` e companhia continuam intactos. Ele responde `/config.json` a partir de `API_URL` e `PAGAMENTOS_HABILITADOS`, com `Cache-Control: no-store`. Os bundles (`.js`, `.css`, fontes) têm hash no nome e cache imutável de um ano; o resto cai no `index.html` com `no-cache`, o fallback da SPA. `server_tokens off`.
- `seguranca.conf`: cabeçalhos de segurança. Precisa de `include` em cada `location` que tem `add_header`, porque um `add_header` no `location` anula todos os herdados do `server`.
- `05-validar-configuracao.sh`: roda antes do `envsubst` e impede a subida com `PAGAMENTOS_HABILITADOS` diferente de `true`/`false` ou `API_URL` fora de caminho ou `http(s)`. Como o valor vai cru para dentro do JSON, a validação também impede um `config.json` quebrado.

O job `e2e` do CI constrói a imagem, roda `scripts/verificar-conteiner.sh` e executa os testes end-to-end **contra o contêiner** (`E2E_URL`), não contra o `ng serve`. Localmente, `npm run e2e` continua subindo o `ng serve --configuration production`; com `E2E_URL` definido, o Playwright usa o endereço dado e não sobe servidor.

No Git Bash do Windows, `docker run -e API_URL=/tech-curse` vira `C:/Program Files/Git/tech-curse` pela conversão de caminhos do MSYS. O script de verificação exporta `MSYS_NO_PATHCONV=1`; faça o mesmo ao rodar a imagem à mão.

## Testes

- **Unitários:** Vitest pelo builder `@angular/build:unit-test` (`npm test`), em Node com jsdom, arquivos `*.spec.ts` ao lado do código em `src/`. Configuração em `angular.json` (alvo `test`) e `tsconfig.spec.json`; o `tsconfig.app.json` exclui os `*.spec.ts` do build do app.
- **End-to-end:** Playwright em `e2e/` (`npm run e2e`), só Chromium. O `playwright.config.ts` sobe o app com `ng serve --configuration production` na porta 4300: bundle de produção, o mais perto do que vai para o ar antes da imagem Nginx.
- **A API dos testes end-to-end é falsa.** O bundle de produção chama a API na mesma origem (`/tech-curse`), e `e2e/apoio/api-falsa.ts` intercepta essas chamadas com `page.route`: cada teste declara as respostas (`api.quando('GET', '/Student/me', { corpo: ... })`), e uma rota sem resposta declarada devolve `501`, para o teste falhar de forma visível. Os specs importam `test` e `expect` de `e2e/apoio/teste.ts`, cujo fixture serve o `/config.json` em toda página; `test.use({ configuracao: ... })` troca o conteúdo (`null` responde `404`). Página aberta num `browser.newContext()` precisa de `servirConfiguracao(pagina)`. A sessão entra pelo `localStorage` antes de a página abrir (`entrarComo(page, 'Student')`), com um JWT sem assinatura válida: o front só lê as claims. Assim os testes não dependem de banco nem de dados. O fluxo com a API real fica para a Fase 4, com o compose.
- **Todo teste começa o nome pelo ID do cenário** da especificação: `it('WEB-AUTH-016: ...')`, `test('WEB-NAV-001: ...')`. `scripts/rastreabilidade.mjs` lista os cenários implementados sem teste e falha se um teste citar ID inexistente. No CI ele roda com `--estrito`: **cenário marcado implementado sem teste reprova o PR**. Vale teste unitário ou end-to-end.
- **Cobertura só mede os unitários**, sobre todo o `src/app` (menos `shared/ui`, gerado pelo spartan, e os `*.spec.ts`), por `coverageInclude` no `angular.json`. Sem isso, só os arquivos importados por algum teste entravam na conta, e o número saía inflado. Componentes de tela são cobertos pelos testes end-to-end, que não entram nessa métrica.
- Seletores do Playwright: prefira papel e rótulo acessível (`getByRole`, `getByLabel`); `data-teste` quando não houver um rótulo estável.

O CI (`.github/workflows/ci.yml`) roda em todo PR e em todo push na `main`, com Node da versão do `.nvmrc`. O job `ci` faz `npm ci`, lint, `format:check`, build, testes unitários com cobertura e o relatório de rastreabilidade (cobertura e rastreabilidade vão para o resumo da execução). O job `e2e` constrói a imagem, verifica o contêiner e roda o Playwright contra ele, guardando o relatório como artefato quando falha. `ci` e `e2e` são os checks obrigatórios na proteção da `main` (ruleset `protecao-da-main`); renomear um dos jobs quebra a proteção.

**Atualização do Angular é sempre por `ng update`**, nunca por `npm install` avulso: os pacotes `@angular/*` precisam ficar na mesma versão, e o `ng update` resolve os peers em conjunto e roda as migrações. Por isso o Dependabot (`.github/dependabot.yml`) ignora majors do Angular, do `angular-eslint` e do TypeScript (a versão suportada do TypeScript é ditada pelo Angular) e agrupa os pacotes que sobem juntos (`angular`, `ng-icons`).

## Decisões registradas

- `erroInterceptor` também silencia `400` (além de `401`/`422`) — os formulários tratam esse status inline (ex.: credenciais inválidas no login).
- A ordem das rotas `''` em `app.routes.ts` é obrigatória: o bloco do `ShellComponent` vem ANTES do bloco do `PublicoLayoutComponent`. O recognizer do Angular casa a primeira rota `''` por prefixo; se o layout público viesse primeiro, `/` carregaria `AUTH_ROUTES` sem filho para o restante vazio e nunca chegaria ao redirect `'' → cursos` do shell.
- `roleGuard` roda em `canMatch` (preserva o lazy-skip) e, quando `auth.role() === null` (anônimo), redireciona direto para `/entrar` com `returnUrl` — em vez de cair em `/sem-permissao` e só depois ser redirecionado pelo `autenticadoGuard` (o que faria o usuário, após logar, parar em "Sem permissão" em vez da rota pretendida).
- Erros `422` no registro são distribuídos por um mapa em signal (código do Identity → campo), não por `setErrors` do Reactive Forms.
- Tema em HEX (exportação padrão do SimUI) — ver `src/styles.css`.
- A configuração é carregada **antes** do `bootstrapApplication`, com `fetch` e `cache: 'no-store'`, e vira um `InjectionToken`. Assim, todo serviço a lê de forma síncrona (`inject(CONFIGURACAO)`), sem `APP_INITIALIZER` nem estado de "configuração carregando". Sem `config.json` válido, `mostrarErroDeConfiguracao()` troca o `<app-root>` pela mensagem de erro.
- Funcionalidade desligada some do menu **e** da rota: `pagamentos` tem `canMatch` lendo `pagamentosHabilitados`, então `/aluno/pagamentos` cai em "Página não encontrada" (`WEB-ALU-011`).
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
