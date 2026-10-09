import { expect, test } from '@playwright/test';

test('WEB-AUTH-003: o formulário de login valida antes de chamar a API', async ({ page }) => {
  const requisicoes: string[] = [];
  page.on('request', (requisicao) => {
    if (requisicao.url().includes('/tech-curse/')) requisicoes.push(requisicao.url());
  });
  await page.goto('/entrar');

  await page.getByLabel('E-mail').fill('nao-e-um-email');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/entrar$/);
  expect(requisicoes).toEqual([]);
});

test('WEB-AUTH-006: o formulário de registro mostra os erros sem chamar a API', async ({
  page,
}) => {
  const requisicoes: string[] = [];
  page.on('request', (requisicao) => {
    if (requisicao.url().includes('/tech-curse/')) requisicoes.push(requisicao.url());
  });
  await page.goto('/registrar');

  await page.getByLabel('Senha', { exact: true }).fill('fraca');
  await page.getByLabel('Confirmar senha').fill('diferente');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(
    page.getByText('Mínimo de 8 caracteres com maiúscula, minúscula, número e símbolo.'),
  ).toBeVisible();
  await expect(page.getByText('As senhas não coincidem.')).toBeVisible();
  expect(requisicoes).toEqual([]);
});
