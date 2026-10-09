# Especificação técnica do Tech Curse Web

Esta pasta descreve **como o front-end deve se comportar**: telas, navegação, sessão e a forma de reagir às respostas da API. É a fonte da verdade para o comportamento: os testes (unitários com Vitest e end-to-end com Playwright) derivam daqui, e uma mudança de comportamento altera a especificação, o código e os testes no mesmo pull request.

O contrato da API (rotas, corpos, status e mensagens) é especificado no repositório da API, em [`tech-curse-api/docs/especificacoes`](https://github.com/tech-curse/tech-curse-api/tree/main/docs/especificacoes). Aqui os cenários citam os IDs de lá (`AUTH-014`) quando dependem de um comportamento da API.

## Áreas

| Área | Arquivo | Prefixo |
| --- | --- | --- |
| Autenticação e sessão | [autenticacao.md](autenticacao.md) | `WEB-AUTH` |
| Catálogo e matrícula | [catalogo.md](catalogo.md) | `WEB-CAT` |
| Área do aluno | [area-do-aluno.md](area-do-aluno.md) | `WEB-ALU` |
| Navegação, erros e tema | [navegacao.md](navegacao.md) | `WEB-NAV` |

Cada área entra num pull request próprio; um link pode apontar para um arquivo ainda em revisão.

## Como ler um cenário

Cada área tem regras e uma lista de **cenários** no formato *Dado / Quando / Então*. Todo cenário tem um ID e um status:

| Status | Significado | O que acontece com o teste |
| --- | --- | --- |
| **implementado** | O código faz exatamente o que o cenário descreve | Tem (ou vai ter) teste automatizado agora |
| **divergente** | O código faz outra coisa; o cenário descreve o comportamento **desejado** | O cenário diz quando a correção entra; o teste nasce com a correção |
| **planejado (Fase N)** | O comportamento ainda não existe | O teste nasce junto com a funcionalidade |

Um cenário divergente sempre traz a linha **Hoje:**, com o que o código faz de fato.

## Convenções

- IDs nunca são reaproveitados nem renumerados. Um cenário que deixa de valer é marcado como **removido**, com o motivo.
- Textos de tela citados entre aspas são contrato: o teste confere exatamente esse texto.
- Elementos usados pelos testes têm o atributo `data-teste`; o valor citado num cenário (`data-teste="matricular"`) é contrato.
- Chaves do `localStorage` citadas entre crases (`tech-curse.sessao`) são contrato.

## Rastreabilidade com os testes

Cada teste traz o ID do cenário no nome: `it('WEB-AUTH-010: renova a sessão e repete a requisição', ...)` no Vitest e `test('WEB-CAT-008: ...', ...)` no Playwright. Um passo do CI vai conferir que todo cenário **implementado** tem pelo menos um teste.
