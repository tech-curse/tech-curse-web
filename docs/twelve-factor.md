# Twelve-Factor no Tech Curse Web

O front-end segue a metodologia [Twelve-Factor App](https://12factor.net/pt_br/), adaptada a uma aplicação estática: **um build só**, servido por um contêiner com o próprio Nginx, que recebe a configuração do ambiente sem ser recompilado. Este checklist mostra, fator por fator, o que já está atendido, o que falta e qual cenário da [especificação](especificacoes/README.md) ou fase do projeto resolve cada lacuna. Ele é atualizado no mesmo PR que muda a situação de um fator.

Legenda: ✅ atendido · ⚠️ atendido em parte · ❌ não atendido · — não se aplica.

| Fator | Situação | Como é atendido | O que falta | Onde se resolve |
| --- | --- | --- | --- | --- |
| **I. Base de código** | ✅ | Um repositório (`tech-curse/tech-curse-web`) e uma imagem por versão, usada em staging e em produção | | |
| **II. Dependências** | ✅ | `package-lock.json` instalado com `npm ci`; Node fixo no `.nvmrc` | | |
| **III. Configuração** | ❌ | | O endereço da API é fixado no build (`src/environments/`), então cada ambiente exige um build diferente | `WEB-NAV-010` (Fase 4) |
| **IV. Serviços de apoio** | ⚠️ | A API é o único serviço de apoio, acessada por URL | A URL vem do build, não da configuração | `WEB-NAV-010` (Fase 4) |
| **V. Build, release, run** | ❌ | | Um build por ambiente. O alvo: build único na imagem; a release junta a imagem com o `config.json` do ambiente | `WEB-NAV-010` (Fase 4); deploy na Fase 7 |
| **VI. Processos** | ✅ | Arquivos estáticos; a sessão vive no navegador (`WEB-AUTH`), nada fica no servidor | | |
| **VII. Vínculo de porta** | ⚠️ | | A imagem precisa servir os arquivos pelo próprio Nginx, numa porta sem privilégio, com usuário não root; o Nginx do host só roteia | Fase 4 |
| **VIII. Concorrência** | ✅ | Sem estado, qualquer número de réplicas atende igual | | |
| **IX. Descartabilidade** | ⚠️ | | O Nginx da imagem precisa encerrar com `SIGQUIT` (fim gracioso) e ter healthcheck | Fase 4 |
| **X. Paridade dev/prod** | ⚠️ | O mesmo código nos dois ambientes | Em desenvolvimento roda `ng serve`, e em produção os arquivos de `ng build`. Os testes end-to-end rodam contra o build de produção para reduzir a diferença | Fase 3 (Playwright); Fase 4 |
| **XI. Logs** | ⚠️ | | O Nginx da imagem deve escrever o log de acesso e o de erro no stdout e no stderr; a coleta é do ambiente | Fase 4 (contêiner); Fase 8 (coleta) |
| **XII. Processos administrativos** | — | Não há tarefa administrativa no front-end | | |

## Exceções aceitas

Nenhuma até agora. A diferença entre `ng serve` e o build de produção (fator X) é própria do desenvolvimento em Angular; ela é compensada pelos testes end-to-end contra o build de produção, não aceita como exceção.
