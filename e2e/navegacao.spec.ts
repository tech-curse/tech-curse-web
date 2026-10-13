import { expect, test } from './apoio/teste';
import {
  ApiFalsa,
  CHAVE_SESSAO,
  PERFIL,
  Papel,
  alunoComPerfil,
  cursoFalso,
  entrarComo,
  paginaDe,
  sessaoDe,
} from './apoio/api-falsa';

const CHAVE_TEMA = 'tech-curse.tema';

test('WEB-NAV-001: depois de entrar, volta para a página pedida', async ({ page }) => {
  const api = await ApiFalsa.em(page);
  api
    .quando('POST', '/Auth/login', { corpo: sessaoDe('Student') })
    .quando('GET', '/Student/me', { corpo: PERFIL })
    .quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: [] })
    .quando('GET', `/Payment/student/${PERFIL.id}`, { corpo: paginaDe([]) });

  await page.goto('/aluno/pagamentos');
  await page.getByLabel('E-mail').fill('student@teste.com');
  await page.getByLabel('Senha').fill('Senha@Forte1');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/aluno\/pagamentos$/);
  await expect(page.getByText('Nenhum pagamento registrado.')).toBeVisible();
});

for (const [papel, rota] of [
  ['Student', '/admin'],
  ['Admin', '/aluno/perfil'],
  ['Instructor', '/aluno/matriculas'],
] as [Papel, string][]) {
  test(`WEB-NAV-002: ${papel} em ${rota} vai para "Sem permissão"`, async ({ page }) => {
    await entrarComo(page, papel);
    const api = await ApiFalsa.em(page);
    api.quando('GET', '/Student/me', { corpo: PERFIL });

    await page.goto(rota);

    await expect(page).toHaveURL(/\/sem-permissao$/);
    await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible();
    await expect(page.getByText('Você não tem acesso a esta página.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible();
  });
}

for (const papel of ['Admin', 'Instructor'] as Papel[]) {
  test(`WEB-NAV-005: ${papel} vê o painel administrativo ainda vazio`, async ({ page }) => {
    await entrarComo(page, papel);
    await ApiFalsa.em(page);

    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Painel administrativo' })).toBeVisible();
    await expect(page.getByText('Em breve.')).toBeVisible();
  });
}

for (const [papel, destinos] of [
  ['Student', ['Cursos', 'Meus cursos', 'Pagamentos', 'Perfil']],
  ['Admin', ['Cursos', 'Admin']],
  ['Instructor', ['Cursos', 'Admin']],
] as [Papel, string[]][]) {
  test(`WEB-NAV-006: menu de ${papel}`, async ({ page }) => {
    await entrarComo(page, papel);
    const api = await ApiFalsa.em(page);
    api
      .quando('GET', '/Student/me', { corpo: PERFIL })
      .quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: [] })
      .quando('GET', '/Course', { corpo: paginaDe([cursoFalso(1)]) });

    await page.goto('/cursos');

    const menu = page.getByRole('navigation', { name: 'Principal', exact: true });
    await expect(menu.getByRole('link')).toHaveText(destinos);
    await expect(page.getByText(`${papel.toLowerCase()}@teste.com`)).toBeVisible();
    await expect(page.locator('[data-teste="sair"]')).toHaveText('Sair');
  });
}

test('WEB-AUTH-019: sair apaga a sessão e leva ao login', async ({ page }) => {
  const api = await alunoComPerfil(page);
  api.quando('GET', '/Course', { corpo: paginaDe([cursoFalso(1)]) });
  await page.goto('/cursos');
  await expect(page.locator('article')).toHaveCount(1);

  await page.locator('[data-teste="sair"]').click();

  await expect(page).toHaveURL(/\/entrar$/);
  expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_SESSAO)).toBeNull();
});

test.describe('tela estreita', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('WEB-NAV-007: menu móvel com os mesmos destinos, que fecha ao escolher', async ({
    page,
  }) => {
    const api = await alunoComPerfil(page);
    api
      .quando('GET', '/Course', { corpo: paginaDe([cursoFalso(1)]) })
      .quando('GET', `/Payment/student/${PERFIL.id}`, { corpo: paginaDe([]) });
    await page.goto('/cursos');
    await expect(page.getByRole('navigation', { name: 'Principal', exact: true })).toBeHidden();

    await page.getByRole('button', { name: 'Abrir menu' }).click();

    const menu = page.getByRole('navigation', { name: 'Principal (mobile)' });
    await expect(menu.getByRole('link')).toHaveText([
      'Cursos',
      'Meus cursos',
      'Pagamentos',
      'Perfil',
    ]);
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeVisible();

    await menu.getByRole('link', { name: 'Pagamentos' }).click();

    await expect(page).toHaveURL(/\/aluno\/pagamentos$/);
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible();
  });
});

test('WEB-NAV-009: API fora do ar vira a notificação de conexão', async ({ page }) => {
  const api = await alunoComPerfil(page);
  api.quando('GET', '/Course', { falhaDeRede: true });

  await page.goto('/cursos');

  await expect(page.getByText('Não foi possível conectar ao servidor.')).toBeVisible();
  await expect(page.getByText('Não foi possível carregar os cursos.')).toBeVisible();
});

test.describe('tema', () => {
  test.use({ colorScheme: 'dark' });

  test('WEB-NAV-011: sem escolha, segue o sistema; a escolha fica gravada', async ({ page }) => {
    await entrarComo(page, 'Admin');
    await ApiFalsa.em(page);
    const html = page.locator('html');
    const temaGravado = () => page.evaluate((chave) => localStorage.getItem(chave), CHAVE_TEMA);

    await page.goto('/admin');
    await expect(html).toHaveClass(/\bdark\b/);
    expect(await temaGravado()).toBeNull();

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(html).not.toHaveClass(/\bdark\b/);
    expect(await temaGravado()).toBeNull();

    await page.getByRole('button', { name: 'Alternar tema' }).click();
    await expect(html).toHaveClass(/\bdark\b/);
    expect(await temaGravado()).toBe('escuro');

    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);
    await page.getByRole('button', { name: 'Alternar tema' }).click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    expect(await temaGravado()).toBe('claro');
  });
});

test.describe('idioma', () => {
  test.use({ timezoneId: 'UTC', locale: 'en-US' });

  test('WEB-NAV-012: números, moeda e datas em pt-BR, mesmo com o navegador em inglês', async ({
    page,
  }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', `/Payment/student/${PERFIL.id}`, {
      corpo: paginaDe([
        {
          paymentId: 1,
          enrollmentId: 100,
          studentId: PERFIL.id,
          amount: 1234567.891,
          status: 'Paid',
          isActive: true,
          createdAt: '2026-12-31T12:00:00Z',
          paidAt: '2026-12-31T12:00:00Z',
          externalTransactionId: 'sim_1',
          courseId: 1,
          courseTitulo: 'Curso',
        },
      ]),
    });

    await page.goto('/aluno/pagamentos');

    const linha = page.locator('tbody tr');
    await expect(linha).toContainText('R$ 1.234.567,89');
    await expect(linha).toContainText('31/12/2026');
  });
});

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

test.describe('configuração em runtime', () => {
  test.describe('com outro endereço de API', () => {
    test.use({ configuracao: { apiUrl: '/outra-api', pagamentosHabilitados: true } });

    test('WEB-NAV-010: o endereço da API vem do config.json', async ({ page }) => {
      const caminhos: string[] = [];
      await page.route('**/outra-api/**', (rota) => {
        caminhos.push(new URL(rota.request().url()).pathname);
        return rota.fulfill({ status: 401, json: { detail: 'E-mail ou senha incorretos.' } });
      });

      await page.goto('/entrar');
      await page.getByLabel('E-mail').fill('student@teste.com');
      await page.getByLabel('Senha').fill('Senha@Forte1');
      await page.getByRole('button', { name: 'Entrar' }).click();

      await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
      expect(caminhos).toEqual(['/outra-api/Auth/login']);
    });
  });

  for (const [caso, configuracao] of [
    ['ausente', null],
    ['inválido', { pagamentosHabilitados: true }],
  ] as const) {
    test.describe(`com config.json ${caso}`, () => {
      test.use({ configuracao });

      test(`WEB-NAV-010: config.json ${caso} mostra o erro em vez de abrir o app`, async ({
        page,
      }) => {
        await page.goto('/entrar');

        await expect(page.getByRole('alert')).toHaveText(
          'Não foi possível carregar a configuração do aplicativo. Tente novamente mais tarde.',
        );
        await expect(page.getByRole('button', { name: 'Entrar' })).toHaveCount(0);
      });
    });
  }
});
