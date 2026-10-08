# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Base de código importada: autenticação (login, registro, refresh), catálogo de cursos, matrícula e área do aluno.
- README com o que é o projeto, como rodar e como verificar.
- `.gitattributes` fixando LF no checkout, para que `npm run format:check` dê o mesmo resultado no Windows e no Linux.

### Removido

- Configuração `ng test` do VS Code, que chamava um script `test` inexistente.
