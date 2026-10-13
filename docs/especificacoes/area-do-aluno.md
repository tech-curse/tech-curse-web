# Área do aluno (`WEB-ALU`)

## Objetivo

Dar ao aluno um lugar para ver os cursos em que está matriculado, os pagamentos e o próprio perfil.

## Regras

1. A área (`/aluno/...`) existe só para `Student` (ver `WEB-NAV-003`).
2. Tudo na área depende do perfil de estudante, carregado de `GET /Student/me` (`ALU-001`). Sem perfil ativo, as páginas da área não aparecem.
3. Valores em reais (`BRL`) e datas no formato `dd/MM/aaaa`, em UTC, com locale `pt-BR`.

## Cenários

### Perfil carregado

**WEB-ALU-001: Estados do perfil**
*Enquanto* o perfil carrega
*Então* a área mostra placeholders (`data-teste="carregando"`)
*Quando* a API falha com um erro que não é `404`
*Então* aparece `"Não foi possível carregar seu perfil."` e o botão `"Tentar novamente"` (`data-teste="recarregar"`)
*Quando* o perfil carrega
*Então* a página pedida aparece
**Status:** implementado

**WEB-ALU-002: Aluno sem perfil**
*Dado* um usuário `Student` para quem `GET /Student/me` responde `404` (`ALU-003`)
*Então* a área mostra `"Não encontramos seu perfil de aluno. Fale com o administrador."` e o link `"Ver catálogo"`
*E* nenhuma notificação de erro aparece
**Status:** implementado

**WEB-ALU-003: Recarregar o perfil não desmonta a página**
*Dado* o perfil já carregado
*Quando* o perfil é recarregado (por exemplo, depois de salvar o nome)
*Então* a página continua na tela durante a recarga, sem voltar aos placeholders
**Status:** implementado

### Meus cursos

**WEB-ALU-004: Lista das matrículas**
*Quando* o aluno abre `/aluno/matriculas` (`"Meus cursos"`)
*Então* aparece uma entrada por matrícula, com título, categoria, descrição e o selo `"Ativa"` ou `"Inativa"`
**Status:** implementado

**WEB-ALU-005: Sem matrículas**
*Dado* um aluno sem matrículas
*Então* aparece `"Você ainda não está matriculado em nenhum curso."` e o link `"Ver catálogo"`
**Status:** implementado

**WEB-ALU-006: Erro ao carregar os cursos**
*Quando* a API falha
*Então* aparece `"Não foi possível carregar seus cursos."` e o botão de tentar de novo
**Status:** implementado

**WEB-ALU-007: `/aluno` abre "Meus cursos"**
*Quando* o aluno abre `/aluno`
*Então* vai para `/aluno/matriculas`
**Status:** implementado

### Meus pagamentos

**WEB-ALU-008: Lista dos pagamentos**
*Quando* o aluno abre `/aluno/pagamentos`
*Então* aparecem até 10 pagamentos por página, do mais recente para o mais antigo, com curso, valor (`R$`), status, data de criação e data de pagamento (`"—"` se não pago)
*E* o status aparece em português: `"Pendente"`, `"Pago"`, `"Falhou"` ou `"Estornado"`
**Status:** implementado

**WEB-ALU-009: Paginação dos pagamentos**
*Dado* mais de 10 pagamentos
*Quando* o aluno usa `"Anterior"` e `"Próxima"`
*Então* a URL troca `?pagina=` e a lista mostra a página correspondente, com o indicador `"Página <n> de <total>"`
*E* página inválida na URL vira 1
**Status:** implementado

**WEB-ALU-010: Sem pagamentos ou com erro**
*Quando* não há pagamentos
*Então* aparece `"Nenhum pagamento registrado."`
*Quando* a API falha
*Então* aparece `"Não foi possível carregar seus pagamentos."` e o botão de tentar de novo
**Status:** implementado

**WEB-ALU-011: Pagamentos desligados por configuração**
*Dado* `pagamentosHabilitados` = `false` no `config.json`, o padrão e o valor de produção enquanto o módulo de pagamentos da API estiver desligado (`TRV-025`)
*Então* o item de menu `"Pagamentos"` não aparece, e `/aluno/pagamentos` leva a "Página não encontrada"
**Status:** implementado

### Perfil

**WEB-ALU-012: Dados do perfil**
*Quando* o aluno abre `/aluno/perfil`
*Então* aparecem o e-mail e a data de cadastro (`"Aluno desde"`), somente leitura, e o nome num campo editável, preenchido com o nome atual
**Status:** implementado

**WEB-ALU-013: Salvar o nome**
*Dado* um nome novo, diferente do atual, com 1 a 100 caracteres depois de remover espaços das pontas
*Quando* o aluno clica em `"Salvar"`
*Então* o botão mostra `"Salvando..."` até a resposta, aparece a notificação `"Perfil atualizado"` e o perfil recarregado mostra o nome novo
**Status:** implementado

**WEB-ALU-014: Salvar só quando faz sentido**
*Quando* o nome está vazio, passa de 100 caracteres ou é igual ao atual
*Então* o botão `"Salvar"` fica desabilitado
*E* o campo mostra `"Informe o nome."` ou `"Use no máximo 100 caracteres."` depois de tocado
**Status:** implementado

**WEB-ALU-015: Erro de validação da API aparece no campo**
*Quando* a API responde `422` ao salvar (`ALU-012`)
*Então* a mensagem de `errors.Nome` aparece no campo
**Status:** implementado

## Divergências

Nenhuma: o comportamento atual segue esta especificação.

## Fora de escopo

- Acompanhar o progresso dentro de um curso.
- Pagar pela própria área (o pagamento é operado pelo administrador).
