# Autenticação e sessão (`WEB-AUTH`)

## Objetivo

Deixar a pessoa criar a conta, entrar e continuar logada enquanto a sessão for válida, renovando-a sem pedir a senha de novo, e encerrar a sessão quando ela não puder mais ser renovada.

## Regras

1. A sessão tem duas partes: o access token, com o `expiresAt`, que o app guarda **só na memória da aba**, e o refresh token, que fica no cookie `HttpOnly` da API (`AUTH-034`) e que o JavaScript nunca vê.
2. Nenhum token vai para o `localStorage` nem para o `sessionStorage`. Ao recarregar a página, o app recupera o access token com um `POST /Auth/refresh`, que leva o cookie sozinho. A chave `tech-curse.sessao`, de versões anteriores, é apagada quando o app abre.
3. Identidade e papel vêm das claims do access token (`AUTH-015`); o front não consulta a API para saber quem está logado.
4. Toda requisição para a API leva `Authorization: Bearer <access token>`. Requisições para outros endereços não levam token.
5. Um `401` numa requisição autenticada provoca **uma** tentativa de renovação (`AUTH-023`). Se a renovação falhar, a sessão é encerrada. A renovação nunca mostra notificação de erro: quem não tem sessão vai para o login.
6. Depois de entrar, a pessoa vai para a página que tentava abrir (`returnUrl`) ou, sem ela, para a página inicial do papel: `/cursos` para `Student`; `/admin` para `Admin` e `Instructor`.

## Cenários

### Entrar

**WEB-AUTH-001: Entrar com credenciais válidas**
*Dado* um usuário cadastrado na tela `/entrar`
*Quando* ele preenche e-mail e senha corretos e envia
*Então* o access token fica na memória da aba, e o refresh token, no cookie da API
*E* ele vai para o `returnUrl`, se houver, ou para a página inicial do papel
**Status:** implementado

**WEB-AUTH-002: Credenciais erradas mostram o erro no formulário**
*Quando* a API recusa o login
*Então* o formulário mostra o `detail` da resposta (`"E-mail ou senha incorretos."`, ver `AUTH-016`), sem notificação flutuante, e a pessoa continua em `/entrar`
**Status:** implementado

**WEB-AUTH-003: O formulário de login valida antes de chamar a API**
*Quando* o e-mail está vazio ou inválido, ou a senha está vazia
*Então* o campo mostra o erro e nenhuma requisição é feita
**Status:** implementado

**WEB-AUTH-004: Envio duplo não gera dois logins**
*Quando* a pessoa clica em entrar de novo enquanto o primeiro envio não terminou
*Então* só uma requisição é feita
**Status:** implementado

### Criar conta

**WEB-AUTH-005: Registro válido leva para o login**
*Dado* a tela `/registrar`
*Quando* a pessoa preenche nome, e-mail, senha e confirmação válidos e envia
*Então* aparece a notificação `"Conta criada. Entre para continuar."` e ela vai para `/entrar`
*E* nenhum login automático acontece
**Status:** implementado

**WEB-AUTH-006: O formulário de registro valida antes de chamar a API**
*Quando* um campo obrigatório está vazio, o e-mail é inválido, a senha não atende à política (`"De 12 a 128 caracteres, com maiúscula, minúscula, número e símbolo."`) ou a confirmação é diferente (`"As senhas não coincidem."`)
*Então* o campo mostra o erro e nenhuma requisição é feita
**Status:** implementado

**WEB-AUTH-007: O nome é livre**
*Quando* a pessoa digita um nome com espaço ou acento (ex.: `"João da Silva"`)
*Então* o formulário aceita
*E* um nome com mais de 100 caracteres mostra `"Use no máximo 100 caracteres."`
**Status:** implementado

**WEB-AUTH-008: Erros de validação da API aparecem no campo certo**
*Quando* a API responde `422` com códigos do Identity
*Então* cada mensagem aparece no campo correspondente: `DuplicateEmail` e `InvalidEmail` no e-mail; códigos que começam com `Password` na senha
*E* mensagens sem campo correspondente aparecem como erro geral do formulário
**Status:** implementado

**WEB-AUTH-009: O registro não envia papel**
*Quando* o formulário de registro é enviado
*Então* o corpo tem `name`, `email`, `password` e `confirmPassword`, e nada mais
**Status:** implementado

### Token nas requisições e renovação

**WEB-AUTH-010: Requisições à API levam o token**
*Dado* uma sessão ativa
*Quando* o app faz uma requisição para a API
*Então* ela leva `Authorization: Bearer <access token>`
*Quando* o app faz uma requisição para outro endereço
*Então* ela não leva o cabeçalho
**Status:** implementado

**WEB-AUTH-011: 401 renova a sessão e repete a requisição**
*Dado* uma sessão cujo access token a API passou a recusar
*Quando* uma requisição recebe `401`
*Então* o app chama `POST /Auth/refresh` uma vez, grava a nova sessão e repete a requisição original com o token novo
*E* a tela recebe a resposta da repetição, sem perceber a renovação
**Status:** implementado

**WEB-AUTH-012: Vários 401 ao mesmo tempo geram uma única renovação**
*Quando* três requisições recebem `401` ao mesmo tempo
*Então* o app faz um único `POST /Auth/refresh`, e as três são repetidas com o token novo
**Status:** implementado

**WEB-AUTH-013: Renovação que falha encerra a sessão**
*Quando* o `POST /Auth/refresh` falha
*Então* a sessão é encerrada (`WEB-AUTH-019`) e a pessoa vai para `/entrar?returnUrl=<página atual>`
*E* na página inicial (`/`), vai para `/entrar` sem `returnUrl`
**Status:** implementado

**WEB-AUTH-014: Rotas de autenticação não disparam renovação**
*Quando* `POST /Auth/login`, `POST /Auth/register`, `POST /Auth/refresh` ou `POST /Auth/logout` recebem `401`
*Então* o erro vai direto para quem chamou, sem tentar renovar
**Status:** implementado

**WEB-AUTH-015: Abrir o app com sessão na API restaura o acesso antes de entrar**
*Dado* um cookie de sessão válido na API, sem access token na memória (página recarregada ou aba nova)
*Quando* a pessoa abre qualquer página
*Então* o app faz **um** `POST /Auth/refresh` antes de decidir a rota e mostra a página sem passar pelo login
*E* se a API responder que não há sessão, a pessoa vai para `/entrar?returnUrl=<página pedida>`, sem notificação, e o app não tenta de novo até o próximo login
**Status:** implementado

### Sessão no navegador

**WEB-AUTH-016: Sessão corrompida vale como ausência de sessão**
*Dado* um valor em `tech-curse.sessao` que não é JSON, ou sem `accessToken`, `refreshToken` ou `expiresAt`
*Quando* o app abre
*Então* ele se comporta como se ninguém estivesse logado
**Status:** removido na Fase 5. O app não lê mais sessão do `localStorage` (`WEB-AUTH-022`).

**WEB-AUTH-017: Token sem papel conhecido não vale como sessão**
*Dado* um access token sem `nameid`, sem `email` ou com um `role` diferente de `Admin`, `Instructor` e `Student`
*Então* o app trata a pessoa como não autenticada
*E* aceita as claims tanto nos nomes curtos (`nameid`, `email`, `role`) quanto nos nomes longos de URI do .NET
**Status:** implementado

**WEB-AUTH-018: Sem `localStorage`, o app funciona só na aba**
*Dado* um navegador que bloqueia o `localStorage` (navegação privada com armazenamento bloqueado)
*Quando* a pessoa entra
*Então* o login funciona e a sessão dura enquanto a aba estiver aberta
**Status:** removido na Fase 5. A sessão não depende mais do `localStorage`: o access token vive na memória e o refresh token, no cookie (`WEB-AUTH-022`).

### Sair e páginas públicas

**WEB-AUTH-019: Sair encerra a sessão**
*Quando* a pessoa clica em sair
*Então* o app chama o logout da API, apaga o access token da memória e leva a pessoa para `/entrar`
*E* abrir uma página protegida depois disso leva ao login
**Status:** implementado

**WEB-AUTH-020: Sair revoga a sessão também na API**
*Quando* a pessoa clica em sair
*Então* o app chama `POST /Auth/logout` (`AUTH-032`), que revoga a sessão e apaga o cookie, antes de apagar a sessão local
*E* se o logout falhar (API fora do ar), a sessão local é encerrada assim mesmo
**Status:** implementado

**WEB-AUTH-021: Quem está logado não vê login nem registro**
*Dado* uma sessão ativa
*Quando* a pessoa abre `/entrar` ou `/registrar`
*Então* ela vai para a página inicial do papel
**Status:** implementado

**WEB-AUTH-022: Refresh token fora do alcance do JavaScript**
*Então* o refresh token trafega só no cookie `HttpOnly` da API (`AUTH-034`), e o access token fica só na memória da aba
*E* nenhum token aparece no `localStorage` nem no `sessionStorage`, nem depois de recarregar a página
*E* a chave `tech-curse.sessao`, de versões anteriores, é apagada quando o app abre
**Status:** implementado

**WEB-AUTH-023: Abas abertas ao mesmo tempo não derrubam a sessão**
*Dado* duas abas do app que precisam renovar o access token ao mesmo tempo
*Então* a renovação passa pela trava `tech-curse.renovacao` da Web Locks API: a segunda aba espera a primeira terminar e usa o cookie já trocado
*E* por isso a API não vê o mesmo refresh token duas vezes, o que ela trataria como reuso e revogaria a sessão (`AUTH-033`)
*E* num navegador sem a Web Locks API, a renovação acontece sem a trava
**Status:** implementado


## Fora de escopo

- "Lembrar de mim", recuperação de senha e confirmação de e-mail.
- Sincronizar login e logout entre abas abertas.
