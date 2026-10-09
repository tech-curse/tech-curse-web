# CLAUDE.md

Front-end Angular da **Tech Curse** (plataforma de cursos). Consome a Tech Curse API ([`tech-curse/tech-curse-api`](https://github.com/tech-curse/tech-curse-api), clonada como irmã em `../tech-curse-api`, .NET 10).

> O projeto é documentado em **português brasileiro**: commits, docs, textos de UI e identificadores em pt-BR.

> **Não escreva comentários. Em nenhum arquivo.** Vale para `.ts`, `.html`, `.css`, arquivos de configuração (`.editorconfig`, `eslint.config.js`, `.vscode/*.json`) e para qualquer `Dockerfile`, compose ou workflow que venha a existir. A justificativa de uma escolha vai na mensagem de commit, na descrição do PR ou neste arquivo, nunca no arquivo-fonte. Isto vale também para instruções passadas a subagentes. Documentação em arquivos `.md` segue normalmente.
>
> Duas exceções, ambas por não serem código escrito aqui:
>
> - `src/app/shared/ui/**` — gerado pelo CLI do spartan (ver "Arquitetura").
> - `.gitignore` — template padrão do Angular CLI.

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

Não há base de testes nem build de imagem neste repositório: os dois foram removidos em 2026-10-08 e serão refeitos.

O CI (`.github/workflows/ci.yml`) roda em todo PR e em todo push na `main`: `npm ci`, `npm run lint`, `npm run format:check` e `npm run build`, com Node da versão do `.nvmrc`. O job se chama `ci`, e esse é o nome do check obrigatório na proteção da `main`; renomear o job quebra a proteção. Quando existir o script `test`, ele entra como mais um passo do mesmo job.

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
