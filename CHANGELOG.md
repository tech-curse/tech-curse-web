# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/). A primeira versão publicada será a `1.0.0`, no primeiro deploy em produção, junto com a API.

## [Não lançado]

### Adicionado

- Base de código importada: autenticação (login, registro, refresh), catálogo de cursos, matrícula e área do aluno.
- README com o que é o projeto, como rodar e como verificar.
- `.gitattributes` fixando LF no checkout, para que `npm run format:check` dê o mesmo resultado no Windows e no Linux.
- CI no GitHub Actions em todo pull request e push na `main`: `npm ci`, lint, verificação de formatação e build de produção.
- `.nvmrc` fixando o Node 24, usado pelo CI e pelo `nvm use`.
- Testes unitários com Vitest (builder `@angular/build:unit-test`, jsdom) e testes end-to-end com Playwright contra o bundle de produção. Primeiros testes: sessão gravada e leitura do JWT (`WEB-AUTH-016` a `WEB-AUTH-019`), navegação sem login (`WEB-NAV-001`, `WEB-NAV-003`, `WEB-NAV-004`) e validação dos formulários (`WEB-AUTH-003`, `WEB-AUTH-006`).
- Cobertura e relatório de rastreabilidade entre especificação e testes no resumo de cada execução do CI.

### Removido

- Configuração `ng test` do VS Code, que chamava um script `test` inexistente.

### Segurança

- Angular atualizado de 22.1 para 22.2 (`ng update`): corrige o alerta alto do `@angular/router` (DoS em SSR, recurso que o projeto não usa) e o crítico do `piscina`, dependência do `@angular/build`.
- Dependências transitivas de desenvolvimento corrigidas: `source-map-js`, `smol-toml` e `brace-expansion` atualizados; `axios` e `@modelcontextprotocol/sdk` saíram da árvore.
