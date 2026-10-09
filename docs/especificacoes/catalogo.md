# Catálogo e matrícula (`WEB-CAT`)

## Objetivo

Mostrar os cursos disponíveis, deixar a pessoa ordenar, filtrar e navegar pelas páginas, ver o detalhe de um curso e, se for aluno, matricular-se.

## Regras

1. O catálogo (`/cursos`) e o detalhe (`/cursos/:id`) exigem login, mas servem a qualquer papel.
2. O estado da listagem (página, ordem e categoria) fica na URL: `?pagina=`, `?ordem=` e `?categoria=`. Copiar o link reproduz a mesma visão.
3. Valores inválidos na URL nunca chegam à API: página inválida vira `1`, ordem desconhecida vira a padrão.
4. A matrícula é feita no detalhe do curso e só aparece para `Student`.

## Cenários

### Listagem

**WEB-CAT-001: Catálogo paginado com 12 cursos por página**
*Quando* a pessoa abre `/cursos`
*Então* aparecem até 12 cursos, do mais recente para o mais antigo, cada um com título, categoria e carga horária (`"<n>h"`)
**Status:** implementado

**WEB-CAT-002: Ordenação pela lista "Ordenar por"**
*Quando* a pessoa escolhe uma opção em `data-teste="ordem"`: `"Mais recentes"`, `"Título A–Z"`, `"Título Z–A"` ou `"Categoria"`
*Então* a URL ganha `?ordem=recentes|titulo-asc|titulo-desc|categoria`, a listagem volta para a página 1 e os cursos são reordenados
**Status:** implementado

**WEB-CAT-003: Filtro por categoria a partir do card**
*Quando* a pessoa clica na categoria de um curso (`data-teste="categoria-<id>"`)
*Então* a URL ganha `?categoria=<categoria>`, a listagem volta para a página 1 e mostra só aquela categoria
*E* aparece o indicador `data-teste="chip-categoria"`, com `"Categoria: <categoria>"`
*Quando* a pessoa clica em `"Limpar filtro de categoria"`
*Então* o filtro sai da URL e a listagem completa volta
**Status:** implementado

**WEB-CAT-004: Paginação pela URL**
*Dado* mais de uma página de cursos
*Quando* a pessoa clica em `"Próxima"` (`data-teste="proxima"`) ou `"Anterior"` (`data-teste="anterior"`)
*Então* a URL troca `?pagina=` e a listagem mostra a página correspondente, mantendo ordem e categoria
*E* `"Anterior"` fica indisponível na primeira página, e `"Próxima"` na última
**Status:** implementado

**WEB-CAT-005: Valores inválidos na URL são corrigidos**
*Quando* a URL tem `?pagina=0`, `?pagina=abc` ou `?ordem=qualquer`
*Então* o catálogo usa a página 1 e a ordem padrão, sem erro e sem chamada inválida à API
**Status:** implementado

**WEB-CAT-006: Estados de carregamento, erro e vazio**
*Enquanto* a listagem carrega
*Então* aparecem placeholders (`data-teste="carregando"`)
*Quando* a API falha
*Então* aparece `"Não foi possível carregar os cursos."` e um botão de tentar de novo (`data-teste="recarregar"`)
*Quando* não há cursos
*Então* aparece `"Nenhum curso disponível no momento."`, ou `"Nenhum curso na categoria <categoria>."` com filtro ativo
**Status:** implementado

**WEB-CAT-007: Selo nos cursos em que o aluno está matriculado**
*Dado* um aluno matriculado em alguns cursos
*Quando* ele abre o catálogo
*Então* esses cursos mostram o selo `"Matriculado"` (`data-teste="selo-matriculado"`)
*E* para outros papéis nenhum selo aparece
**Status:** implementado

### Detalhe

**WEB-CAT-008: Detalhe do curso**
*Quando* a pessoa abre `/cursos/<id>` de um curso existente
*Então* aparecem título, descrição, categoria, carga horária e a data de criação no formato `"criado em dd/MM/aaaa"` (data em UTC), e o link `"← Voltar ao catálogo"`
**Status:** implementado

**WEB-CAT-009: Curso inexistente ou id inválido**
*Quando* o id não é um inteiro positivo, ou a API responde `404`
*Então* aparece `"Curso não encontrado"`, com o link `"Ver catálogo"`
*E* com id inválido, nenhuma requisição é feita
**Status:** implementado

**WEB-CAT-010: Erro ao carregar o detalhe**
*Quando* a API falha com outro erro
*Então* aparece `"Não foi possível carregar o curso."`
**Status:** implementado

### Matrícula

**WEB-CAT-011: Aluno se matricula pelo detalhe**
*Dado* um aluno com perfil ativo, num curso em que não está matriculado
*Quando* ele clica em `"Matricular-me"` (`data-teste="matricular"`)
*Então* o botão mostra `"Matriculando..."` e fica desabilitado até a resposta
*E* com sucesso, aparece a notificação `"Matrícula realizada"`, a área (`data-teste="area-matricula"`) passa a mostrar `"Você está matriculado"` e o link `"Ver meus cursos"`
*E* o curso passa a aparecer em "Meus cursos" e com o selo no catálogo
**Status:** implementado

**WEB-CAT-012: Curso em que o aluno já está matriculado**
*Dado* um aluno matriculado no curso
*Quando* ele abre o detalhe
*Então* aparece `"Você está matriculado"`, sem o botão de matrícula
**Status:** implementado

**WEB-CAT-013: Erro na matrícula vira notificação**
*Quando* a API recusa a matrícula (por exemplo `409`, `MAT-005`)
*Então* aparece uma notificação com o `detail` da resposta, e o botão volta a ficar disponível
**Status:** implementado

**WEB-CAT-014: Sem perfil ativo, a matrícula fica bloqueada**
*Dado* um aluno cujo perfil está carregando, com erro ou pendente
*Então* o botão `"Matricular-me"` fica desabilitado
*E* no estado pendente aparece o aviso definido em `WEB-ALU-002`
**Status:** implementado (o texto do aviso é divergente; ver `WEB-ALU-002`)

**WEB-CAT-015: Só aluno vê a área de matrícula**
*Dado* um `Admin` ou `Instructor` no detalhe de um curso
*Então* a área de matrícula não aparece
**Status:** implementado

## Fora de escopo

- Busca por texto e filtro por mais de uma categoria.
- Cancelar a matrícula (a API não oferece; ver `matriculas.md` da API).
