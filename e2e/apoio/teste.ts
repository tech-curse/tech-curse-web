import { Page, test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export const CONFIGURACAO_PADRAO = { apiUrl: '/tech-curse', pagamentosHabilitados: true };

export async function servirConfiguracao(
  page: Page,
  configuracao: unknown = CONFIGURACAO_PADRAO,
): Promise<void> {
  await page.route('**/config.json', (rota) =>
    configuracao === null
      ? rota.fulfill({ status: 404, body: '' })
      : rota.fulfill({ json: configuracao }),
  );
}

export const test = base.extend<{ configuracao: unknown }>({
  configuracao: [CONFIGURACAO_PADRAO, { option: true }],
  page: async ({ page, configuracao }, use) => {
    await servirConfiguracao(page, configuracao);
    await use(page);
  },
});
