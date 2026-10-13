import { Page } from '@playwright/test';
import { expect, servirConfiguracao, test } from './apoio/teste';
import {
  ApiFalsa,
  CHAVE_SESSAO,
  PERFIL,
  cursoFalso,
  entrarComo,
  gravarSessaoAntesDeAbrir,
  paginaDe,
  problema,
  sessaoDe,
} from './apoio/api-falsa';

async function apiDoAluno(page: Page): Promise<ApiFalsa> {
  const api = await ApiFalsa.em(page);
  api
    .quando('GET', '/Student/me', { corpo: PERFIL })
    .quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: [] })
    .quando('GET', '/Course', { corpo: paginaDe([cursoFalso(3)]) })
    .quando('GET', '/Course/3', { corpo: cursoFalso(3) });
  return api;
}

async function preencherLogin(page: Page): Promise<void> {
  await page.getByLabel('E-mail').fill('student@teste.com');
  await page.getByLabel('Senha').fill('Senha@Forte1');
}

async function preencherRegistro(page: Page): Promise<void> {
  await page.getByLabel('Nome', { exact: true }).fill('João da Silva');
  await page.getByLabel('E-mail').fill('joao@teste.com');
  await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.getByLabel('Confirmar senha').fill('Senha@Forte1');
}

async function sessaoGravada(page: Page): Promise<unknown> {
  return JSON.parse(
    (await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_SESSAO)) ?? 'null',
  );
}

test('WEB-AUTH-001: login grava a sessão e leva à página inicial do papel ou ao returnUrl', async ({
  page,
}) => {
  const api = await apiDoAluno(page);
  api.quando('POST', '/Auth/login', { corpo: sessaoDe('Student') });

  await page.goto('/entrar');
  await preencherLogin(page);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/cursos$/);
  expect(api.chamadas('POST', '/Auth/login')[0].postDataJSON()).toEqual({
    email: 'student@teste.com',
    password: 'Senha@Forte1',
  });
  expect(await sessaoGravada(page)).toMatchObject({ refreshToken: 'refresh-student' });

  await page.evaluate(() => localStorage.clear());
  await page.goto('/cursos/3');
  await expect(page).toHaveURL(/\/entrar\?returnUrl=%2Fcursos%2F3$/);
  await preencherLogin(page);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/cursos\/3$/);
});

test('WEB-AUTH-001: Admin vai para o painel', async ({ page }) => {
  const api = await ApiFalsa.em(page);
  api.quando('POST', '/Auth/login', { corpo: sessaoDe('Admin') });

  await page.goto('/entrar');
  await preencherLogin(page);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/admin$/);
});

test('WEB-AUTH-002: credenciais erradas aparecem no formulário, sem notificação', async ({
  page,
}) => {
  const api = await ApiFalsa.em(page);
  api.quando('POST', '/Auth/login', problema(401, 'E-mail ou senha incorretos.'));

  await page.goto('/entrar');
  await preencherLogin(page);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/entrar$/);
  expect(api.chamadas('POST', '/Auth/refresh')).toHaveLength(0);
});

test('WEB-AUTH-004: envio duplo não gera dois logins', async ({ page }) => {
  const api = await apiDoAluno(page);
  api.quando('POST', '/Auth/login', { corpo: sessaoDe('Student'), atraso: 1000 });

  await page.goto('/entrar');
  await preencherLogin(page);
  await page.getByLabel('Senha').press('Enter');
  await expect(page.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
  await page.getByLabel('Senha').press('Enter');

  await expect(page).toHaveURL(/\/cursos$/);
  expect(api.chamadas('POST', '/Auth/login')).toHaveLength(1);
});

test('WEB-AUTH-005: registro válido notifica e leva ao login, sem entrar', async ({ page }) => {
  const api = await ApiFalsa.em(page);
  api.quando('POST', '/Auth/register', {
    status: 201,
    corpo: { mensagem: 'Usuário registrado com sucesso.' },
  });

  await page.goto('/registrar');
  await preencherRegistro(page);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page.getByText('Conta criada. Entre para continuar.')).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(api.chamadas('POST', '/Auth/login')).toHaveLength(0);
  expect(await sessaoGravada(page)).toBeNull();
});

test('WEB-AUTH-008: erros 422 da API aparecem no campo certo ou como erro geral', async ({
  page,
}) => {
  const api = await ApiFalsa.em(page);
  api.quando(
    'POST',
    '/Auth/register',
    problema(422, 'Erro de validação', {
      DuplicateEmail: ['Este e-mail já está em uso.'],
      PasswordRequiresUniqueChars: ['A senha precisa de 2 caracteres diferentes.'],
      ErroSemCampo: ['Algo deu errado no cadastro.'],
    }),
  );

  await page.goto('/registrar');
  await preencherRegistro(page);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page.getByLabel('E-mail').locator('..')).toContainText(
    'Este e-mail já está em uso.',
  );
  await expect(page.getByLabel('Senha', { exact: true }).locator('..')).toContainText(
    'A senha precisa de 2 caracteres diferentes.',
  );
  await expect(page.getByRole('alert')).toHaveText('Algo deu errado no cadastro.');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});

test('WEB-AUTH-015: access token vencido é renovado antes de abrir a página', async ({ page }) => {
  await gravarSessaoAntesDeAbrir(page, sessaoDe('Student', -60_000));
  const api = await apiDoAluno(page);
  api.quando('POST', '/Auth/refresh', { corpo: sessaoDe('Student') });

  await page.goto('/cursos/3');

  await expect(page.getByRole('heading', { name: 'Curso 3' })).toBeVisible();
  await expect(page).toHaveURL(/\/cursos\/3$/);
  expect(api.chamadas('POST', '/Auth/refresh')).toHaveLength(1);
});

test('WEB-AUTH-015: se a renovação falhar, apaga a sessão e vai ao login', async ({ page }) => {
  await gravarSessaoAntesDeAbrir(page, sessaoDe('Student', -60_000));
  const api = await ApiFalsa.em(page);
  api.quando('POST', '/Auth/refresh', problema(401, 'Refresh Token inválido ou expirado.'));

  await page.goto('/cursos/3');

  await expect(page).toHaveURL(/\/entrar\?returnUrl=%2Fcursos%2F3$/);
  expect(await sessaoGravada(page)).toBeNull();
});

test('WEB-AUTH-021: quem está logado não vê login nem registro', async ({ page, browser }) => {
  await entrarComo(page, 'Student');
  await apiDoAluno(page);

  await page.goto('/entrar');
  await expect(page).toHaveURL(/\/cursos$/);
  await page.goto('/registrar');
  await expect(page).toHaveURL(/\/cursos$/);

  const contexto = await browser.newContext();
  const admin = await contexto.newPage();
  await servirConfiguracao(admin);
  await entrarComo(admin, 'Admin');
  await ApiFalsa.em(admin);
  await admin.goto('/registrar');
  await expect(admin).toHaveURL(/\/admin$/);
  await contexto.close();
});

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

test('WEB-AUTH-007: o nome do registro é livre, até 100 caracteres', async ({ page }) => {
  await page.goto('/registrar');
  const nome = page.getByLabel('Nome', { exact: true });

  await nome.fill('João da Silva');
  await nome.blur();
  await expect(page.getByText('Use no máximo 100 caracteres.')).toHaveCount(0);
  await expect(page.getByText(/sem espaços/)).toHaveCount(0);

  await nome.fill('a'.repeat(101));
  await nome.blur();
  await expect(page.getByText('Use no máximo 100 caracteres.')).toBeVisible();
});
