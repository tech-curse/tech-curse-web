import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CENARIO = /^\*\*(WEB-[A-Z]+-\d{3}):/;
const STATUS = /^\*\*Status:\*\*\s*(.*)/;
const CITACAO = /\b(?:it|test)\(\s*['"`](WEB-[A-Z]+-\d{3}):/g;

function arquivos(pasta, filtro) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho, filtro);
    return filtro(caminho) ? [caminho] : [];
  });
}

function lerCenarios() {
  const cenarios = new Map();
  for (const arquivo of arquivos(join(raiz, 'docs', 'especificacoes'), (c) => c.endsWith('.md'))) {
    let atual = null;
    for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
      const cenario = linha.match(CENARIO);
      if (cenario) {
        atual = cenario[1];
        continue;
      }
      const status = linha.match(STATUS);
      if (status && atual) {
        cenarios.set(atual, status[1].trim());
        atual = null;
      }
    }
  }
  return cenarios;
}

function lerCobertos() {
  const cobertos = new Set();
  const pastas = ['src', 'e2e'].map((pasta) => join(raiz, pasta));
  for (const arquivo of pastas.flatMap((p) => arquivos(p, (c) => c.endsWith('.spec.ts')))) {
    for (const citacao of readFileSync(arquivo, 'utf8').matchAll(CITACAO)) cobertos.add(citacao[1]);
  }
  return cobertos;
}

const estrito = process.argv.includes('--estrito');
const cenarios = lerCenarios();
const cobertos = lerCobertos();
const implementados = [...cenarios]
  .filter(([, status]) => status.startsWith('implementado'))
  .map(([id]) => id)
  .sort();
const semTeste = implementados.filter((id) => !cobertos.has(id));
const desconhecidos = [...cobertos].filter((id) => !cenarios.has(id)).sort();

const linhas = [
  '## Rastreabilidade especificação → testes',
  '',
  `- Cenários na especificação: ${cenarios.size}`,
  `- Implementados: ${implementados.length}`,
  `- Implementados com teste: ${implementados.length - semTeste.length}`,
  `- Implementados sem teste: ${semTeste.length}`,
];
if (desconhecidos.length) {
  linhas.push(
    `- IDs citados em testes que não existem na especificação: ${desconhecidos.join(', ')}`,
  );
}
if (semTeste.length) {
  linhas.push(
    '',
    '<details><summary>Cenários implementados sem teste</summary>',
    '',
    semTeste.join(', '),
    '',
    '</details>',
  );
}
console.log(linhas.join('\n'));

if (desconhecidos.length || (estrito && semTeste.length)) process.exitCode = 1;
