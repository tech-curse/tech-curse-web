# Navegação, erros e tema (`WEB-NAV`)

## Objetivo

Definir para onde cada pessoa pode ir, o que acontece quando ela tenta ir aonde não pode, como os erros da API chegam até ela e como o tema da interface se comporta.

## Regras

1. Todas as páginas, exceto `/entrar`, `/registrar` e "Página não encontrada", exigem login.
2. O menu mostra só os destinos permitidos para o papel.
3. Uma pessoa sem permissão para uma área vai para `/sem-permissao`. Uma pessoa sem login vai para `/entrar`, levando o `returnUrl`.
4. Erros da API que não são tratados pela própria tela viram uma notificação flutuante, com o `detail` da resposta.

## Mapa de rotas

| Rota | Quem acessa | Conteúdo |
| --- | --- | --- |
| `/` | autenticado | redireciona para `/cursos` |
| `/cursos`, `/cursos/:id` | autenticado | catálogo (`catalogo.md`) |
| `/aluno/matriculas`, `/aluno/pagamentos`, `/aluno/perfil` | `Student` | área do aluno (`area-do-aluno.md`) |
| `/admin` | `Admin`, `Instructor` | painel administrativo |
| `/sem-permissao` | autenticado | aviso de acesso negado |
| `/entrar`, `/registrar` | só sem login | autenticação (`autenticacao.md`) |
| qualquer outra | todos | "Página não encontrada" |

## Cenários

### Acesso às rotas

**WEB-NAV-001: Página protegida sem login leva ao login**
*Dado* ninguém logado
*Quando* a pessoa abre `/cursos/3`
*Então* ela vai para `/entrar?returnUrl=%2Fcursos%2F3`
*E* depois de entrar, volta para `/cursos/3`
**Status:** implementado

**WEB-NAV-002: Área de outro papel leva a "Sem permissão"**
*Quando* um `Student` abre `/admin`, ou um `Admin` abre `/aluno/perfil`
*Então* ele vai para `/sem-permissao`, que mostra `"Sem permissão"`, `"Você não tem acesso a esta página."` e o link `"Voltar ao início"`
**Status:** implementado

**WEB-NAV-003: Área restrita sem login vai direto para o login, não para "Sem permissão"**
*Dado* ninguém logado
*Quando* a pessoa abre `/aluno/pagamentos`
*Então* ela vai para `/entrar?returnUrl=%2Faluno%2Fpagamentos`, e não para `/sem-permissao`
*E* depois de entrar como aluno, chega a `/aluno/pagamentos`
**Status:** implementado

**WEB-NAV-004: Rota inexistente**
*Quando* a pessoa abre um endereço que não existe, logada ou não
*Então* aparece `"Página não encontrada"`, `"O endereço acessado não existe."` e o link `"Voltar ao início"`
**Status:** implementado

**WEB-NAV-005: Painel administrativo ainda vazio**
*Quando* um `Admin` ou `Instructor` abre `/admin`
*Então* aparece `"Painel administrativo"` com `"Em breve."`
**Status:** implementado (o painel é uma fase futura de produto, fora deste plano)

### Menu

**WEB-NAV-006: Menu conforme o papel**
*Dado* uma pessoa logada
*Então* o menu mostra `"Cursos"` para todos
*E* para `Student`, também `"Meus cursos"`, `"Pagamentos"` e `"Perfil"`
*E* para `Admin` e `Instructor`, também `"Admin"`
*E* o e-mail da pessoa e o botão `"Sair"` (`data-teste="sair"`)
**Status:** implementado

**WEB-NAV-007: Menu em telas pequenas**
*Dado* uma tela estreita
*Quando* a pessoa toca em `"Abrir menu"`
*Então* aparece o menu móvel, com os mesmos destinos, e o botão passa a se chamar `"Fechar menu"`
*E* escolher um destino fecha o menu
**Status:** implementado

### Erros da API

**WEB-NAV-008: Erros não tratados viram notificação**
*Quando* uma requisição falha com `403`, `404`, `409`, `429`, `5xx` ou `504`, e a tela não trata o erro
*Então* aparece uma notificação com o `detail` da resposta (`TRV-001`)
*E* `400`, `401` e `422` nunca geram notificação automática: quem chamou trata
**Status:** implementado

**WEB-NAV-009: API fora do ar**
*Quando* uma requisição não chega à API (sem conexão, servidor fora do ar)
*Então* aparece a notificação `"Não foi possível conectar ao servidor."`
**Status:** implementado

**WEB-NAV-010: Endereço da API vem da configuração em runtime**
*Dado* a mesma imagem do front em staging e em produção
*Quando* o app abre
*Então* ele lê o endereço da API e as funcionalidades ligadas (como pagamentos, `WEB-ALU-011`) de `/config.json`, servido junto com o app, sem rebuild por ambiente
**Status:** planejado (Fase 4). Hoje o endereço é fixado no build, em `src/environments/`.

### Tema e idioma

**WEB-NAV-011: Tema claro e escuro**
*Dado* uma pessoa que nunca escolheu tema
*Então* o app segue o tema do sistema operacional
*Quando* ela clica em `"Alternar tema"`
*Então* o tema troca, e a escolha fica gravada em `tech-curse.tema` (`claro` ou `escuro`) para as próximas visitas
**Status:** implementado

**WEB-NAV-012: Português do Brasil**
*Então* números, moeda (`R$`) e datas seguem o formato `pt-BR`
**Status:** implementado

## Fora de escopo

- Outros idiomas.
- Painel administrativo (gestão de cursos, alunos e pagamentos pela interface).
