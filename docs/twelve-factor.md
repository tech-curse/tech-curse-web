# Twelve-Factor no Tech Curse Web

O front-end segue a metodologia [Twelve-Factor App](https://12factor.net/pt_br/), adaptada a uma aplicação estática: **um build só**, servido por um contêiner com o próprio Nginx, que recebe a configuração do ambiente sem ser recompilado. Este checklist mostra, fator por fator, o que já está atendido, o que falta e qual cenário da [especificação](especificacoes/README.md) ou fase do projeto resolve cada lacuna. Ele é atualizado no mesmo PR que muda a situação de um fator.

Legenda: ✅ atendido · ⚠️ atendido em parte · ❌ não atendido · — não se aplica.

| Fator | Situação | Como é atendido | O que falta | Onde se resolve |
| --- | --- | --- | --- | --- |
| **I. Base de código** | ✅ | Um repositório (`tech-curse/tech-curse-web`) e uma imagem por versão, usada em staging e em produção | | |
| **II. Dependências** | ✅ | `package-lock.json` instalado com `npm ci`; Node fixo no `.nvmrc` | | |
| **III. Configuração** | ✅ | O endereço da API e as funcionalidades ligadas vêm do `config.json`, lido em runtime; um build só para todos os ambientes (`WEB-NAV-010`). Estrutura em [`configuracao.md`](configuracao.md) | | |
| **IV. Serviços de apoio** | ✅ | A API é o único serviço de apoio, na mesma origem do front em todo ambiente (proxy do `ng serve` em desenvolvimento, Nginx do host nos ambientes reais); o caminho vem do `config.json` | | |
| **V. Build, release, run** | ⚠️ | Um build só, dentro da imagem; a release é a imagem mais as variáveis do ambiente, que viram o `config.json` na subida | A publicação da imagem e o deploy | Publicação ainda na Fase 4; deploy na Fase 7 |
| **VI. Processos** | ✅ | Arquivos estáticos; a sessão vive no navegador (`WEB-AUTH`), nada fica no servidor | | |
| **VII. Vínculo de porta** | ✅ | A imagem serve os arquivos pelo próprio Nginx na porta `8080`, sem privilégio, com o usuário `101`; o Nginx do host só roteia | | |
| **VIII. Concorrência** | ✅ | Sem estado, qualquer número de réplicas atende igual | | |
| **IX. Descartabilidade** | ✅ | O Nginx da imagem sobe em segundos, encerra com `SIGQUIT` (fim gracioso, código `0`) e tem healthcheck (`/saude`) | | |
| **X. Paridade dev/prod** | ✅ | O mesmo código e a API na mesma origem em todo ambiente: proxy do `ng serve` em desenvolvimento, Nginx nos ambientes reais. Os testes end-to-end rodam contra o build de produção | | |
| **XI. Logs** | ⚠️ | O Nginx da imagem escreve o log de acesso no stdout e o de erro no stderr | A coleta, que é do ambiente | Fase 8 |
| **XII. Processos administrativos** | — | Não há tarefa administrativa no front-end | | |

## Exceções aceitas

Nenhuma até agora. A diferença entre `ng serve` e o build de produção (fator X) é própria do desenvolvimento em Angular; ela é compensada pelos testes end-to-end contra o build de produção, não aceita como exceção.
