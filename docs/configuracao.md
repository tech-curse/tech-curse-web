# Configuração do Tech Curse Web

Como o front-end recebe configuração em cada contexto. É a aplicação do fator III do [Twelve-Factor](twelve-factor.md) e o detalhe do cenário `WEB-NAV-010` da [especificação](especificacoes/navegacao.md). A estrutura da API está em [`tech-curse-api/docs/configuracao.md`](https://github.com/tech-curse/tech-curse-api/blob/main/docs/configuracao.md).

## O princípio

**O front-end não tem segredos e não pode ter.** Tudo o que chega ao navegador é público: qualquer pessoa lê o JavaScript e as requisições. Token de API de terceiros, chave privada ou senha nunca entram no front.

**Um build só para todos os ambientes.** O que muda entre ambientes vem de um `config.json` lido pelo app quando ele abre, não do build. Os arquivos de `src/environments/` saem na Fase 4.

**A API fica na mesma origem do front, em todo ambiente.** O front chama `/tech-curse/...` no mesmo endereço em que foi carregado:

- em staging e produção, o Nginx do host encaminha `/tech-curse` para a API e o resto para o front;
- em desenvolvimento, o proxy do `ng serve` faz o mesmo papel, encaminhando `/tech-curse` para a API em `http://localhost:5130`.

Com isso, o endereço da API é igual em todo lugar (paridade dev/prod, fator X), e o navegador não faz requisição entre origens: o CORS deixa de ser necessário em produção, e o `Cors__AllowedOrigins` da API pode ficar vazio lá.

## O `config.json`

| Chave | Significado | Padrão |
| --- | --- | --- |
| `apiUrl` | Caminho base da API | `/tech-curse` |
| `pagamentosHabilitados` | Mostra a área de pagamentos (`WEB-ALU-011`); acompanha o `Payments__Enabled` da API | `false` |

Os nomes finais das chaves são definidos na implementação (Fase 4); esta tabela registra o que precisa ser configurável.

## De onde a configuração vem em cada contexto

| Contexto | Fonte |
| --- | --- |
| **Desenvolvimento** (`ng serve`) | `public/config.json`, fora do git, copiado de um `public/config.example.json` versionado. O proxy de desenvolvimento (`proxy.conf.json`, versionado) encaminha `/tech-curse` para a API no host |
| **Testes unitários** (Vitest) | A configuração é injetada no teste; nenhum arquivo |
| **Testes end-to-end** (Playwright) | O build de produção servido com um `config.json` gerado no próprio job |
| **Staging e produção** | O contêiner do front gera o `config.json` ao subir, a partir de variáveis de ambiente do `.env` de cada ambiente na VPS (a imagem oficial do Nginx já processa templates com variáveis de ambiente) |

Nada disso é segredo; o `.env` da VPS só concentra num lugar a configuração de cada ambiente. A lista das variáveis do contêiner do front entra no `.env.example` deste repositório na Fase 4.

## Regras

- **Funcionalidade é ligada por configuração**, com o padrão desligado, nunca por detectar o ambiente (hostname, `isDevMode()`).
- **O app não sobe sem o `config.json`.** Em produção o contêiner sempre o gera; um arquivo ausente ou inválido mostra um erro claro, em vez de cair em valores embutidos que esconderiam um ambiente mal configurado.
