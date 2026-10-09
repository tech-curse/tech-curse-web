import { expect, test } from '@playwright/test';

test('WEB-NAV-001: página protegida sem login leva ao login com returnUrl', async ({ page }) => {
  await page.goto('/cursos/3');

  await expect(page).toHaveURL(/\/entrar\?returnUrl=%2Fcursos%2F3$/);
});

test('WEB-NAV-003: área restrita sem login vai direto para o login', async ({ page }) => {
  await page.goto('/aluno/pagamentos');

  await expect(page).toHaveURL(/\/entrar\?returnUrl=%2Faluno%2Fpagamentos$/);
});

test('WEB-NAV-004: rota inexistente mostra "Página não encontrada"', async ({ page }) => {
  await page.goto('/endereco-que-nao-existe');

  await expect(page.getByText('Página não encontrada')).toBeVisible();
  await expect(page.getByText('O endereço acessado não existe.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible();
});
