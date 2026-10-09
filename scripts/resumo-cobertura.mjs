import { existsSync, readFileSync } from 'node:fs';

const arquivo = 'coverage/tech-curse-web/coverage-summary.json';
if (!existsSync(arquivo)) {
  console.log('## Cobertura\n\nRelatório de cobertura não encontrado.');
  process.exit(0);
}

const total = JSON.parse(readFileSync(arquivo, 'utf8')).total;
const metricas = [
  ['Linhas', total.lines],
  ['Instruções', total.statements],
  ['Ramificações', total.branches],
  ['Funções', total.functions],
];

console.log(
  [
    '## Cobertura (testes unitários)',
    '',
    '| Métrica | Cobertas | Total | % |',
    '| --- | --- | --- | --- |',
    ...metricas.map(([nome, m]) => `| ${nome} | ${m.covered} | ${m.total} | ${m.pct}% |`),
  ].join('\n'),
);
