import { expect, test } from '@playwright/test';
import {
  ApiFalsa,
  PERFIL,
  alunoComPerfil,
  entrarComo,
  matriculaFalsa,
  paginaDe,
  problema,
} from './apoio/api-falsa';

test.use({ timezoneId: 'America/Sao_Paulo' });

const notificacoes = '[data-sonner-toast]';

function pagamentoFalso(paymentId: number, sobrescrever: Record<string, unknown> = {}) {
  return {
    paymentId,
    enrollmentId: 100,
    studentId: PERFIL.id,
    amount: 150.5,
    status: 'Pending',
    isActive: true,
    createdAt: '2026-06-02T01:00:00Z',
    paidAt: null,
    externalTransactionId: null,
    courseId: 1,
    courseTitulo: `Curso do pagamento ${paymentId}`,
    ...sobrescrever,
  };
}

test.describe('perfil carregado', () => {
  test('WEB-ALU-001: placeholders enquanto carrega, erro com nova tentativa e página ao carregar', async ({
    page,
  }) => {
    await entrarComo(page, 'Student');
    const api = await ApiFalsa.em(page);
    api
      .quando('GET', '/Student/me', { ...problema(500, 'Falha interna'), atraso: 800 })
      .quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: [] });

    await page.goto('/aluno/matriculas');

    await expect(page.locator('[data-teste="carregando"]')).toBeVisible();
    await expect(page.getByText('Não foi possível carregar seu perfil.')).toBeVisible();
    await expect(page.locator(notificacoes)).toHaveCount(0);

    api.quando('GET', '/Student/me', { corpo: PERFIL });
    await page.locator('[data-teste="recarregar"]').click();

    await expect(page.getByRole('heading', { name: 'Meus cursos' })).toBeVisible();
  });

  test('WEB-ALU-002: aluno sem perfil vê o aviso e o link para o catálogo, sem notificação', async ({
    page,
  }) => {
    await entrarComo(page, 'Student');
    const api = await ApiFalsa.em(page);
    api.quando('GET', '/Student/me', problema(404, 'Perfil de estudante não encontrado.'));

    await page.goto('/aluno/perfil');

    await expect(
      page.getByText('Não encontramos seu perfil de aluno. Fale com o administrador.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver catálogo' })).toHaveAttribute(
      'href',
      '/cursos',
    );
    await expect(page.locator(notificacoes)).toHaveCount(0);
  });

  test('WEB-ALU-003: recarregar o perfil não desmonta a página', async ({ page }) => {
    const api = await alunoComPerfil(page);
    let consultas = 0;
    api
      .quando('GET', '/Student/me', () =>
        ++consultas === 1
          ? { corpo: PERFIL }
          : { corpo: { ...PERFIL, nome: 'Ana Lima' }, atraso: 1000 },
      )
      .quando('PUT', `/Student/${PERFIL.id}`, { status: 204 });
    await page.goto('/aluno/perfil');
    const nome = page.getByLabel('Nome');
    await expect(nome).toHaveValue(PERFIL.nome);

    await nome.fill('Ana Lima');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Perfil atualizado')).toBeVisible();
    await expect(page.locator('[data-teste="carregando"]')).toHaveCount(0);
    await expect(nome).toBeVisible();
    await expect.poll(() => consultas).toBe(2);
    await expect(page.locator('[data-teste="carregando"]')).toHaveCount(0);
  });
});

test.describe('meus cursos', () => {
  test('WEB-ALU-004: uma entrada por matrícula, com selo de ativa ou inativa', async ({ page }) => {
    await alunoComPerfil(page, [
      matriculaFalsa(1, { titulo: 'API com .NET', categoria: 'Backend', descricao: 'REST e EF' }),
      matriculaFalsa(2, { titulo: 'Angular', categoria: 'Frontend', matriculaAtiva: false }),
    ]);

    await page.goto('/aluno/matriculas');

    const cards = page.locator('article');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('API com .NET');
    await expect(cards.nth(0)).toContainText('Backend');
    await expect(cards.nth(0)).toContainText('REST e EF');
    await expect(cards.nth(0)).toContainText('Ativa');
    await expect(cards.nth(1)).toContainText('Angular');
    await expect(cards.nth(1)).toContainText('Inativa');
  });

  test('WEB-ALU-005: sem matrículas, mostra o aviso e o link para o catálogo', async ({ page }) => {
    await alunoComPerfil(page, []);

    await page.goto('/aluno/matriculas');

    await expect(page.getByText('Você ainda não está matriculado em nenhum curso.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver catálogo' })).toBeVisible();
  });

  test('WEB-ALU-006: erro ao carregar os cursos, com nova tentativa', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', `/Student/${PERFIL.id}/enrollments`, problema(500, 'Falha interna'));

    await page.goto('/aluno/matriculas');

    await expect(page.getByText('Não foi possível carregar seus cursos.')).toBeVisible();
    api.quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: [matriculaFalsa(1)] });
    await page.locator('[data-teste="recarregar"]').click();
    await expect(page.locator('article')).toHaveCount(1);
  });

  test('WEB-ALU-007: /aluno abre "Meus cursos"', async ({ page }) => {
    await alunoComPerfil(page);

    await page.goto('/aluno');

    await expect(page).toHaveURL(/\/aluno\/matriculas$/);
    await expect(page.getByRole('heading', { name: 'Meus cursos' })).toBeVisible();
  });
});

test.describe('meus pagamentos', () => {
  test('WEB-ALU-008: pagamentos com valor em reais, status em português e datas em UTC', async ({
    page,
  }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', `/Payment/student/${PERFIL.id}`, {
      corpo: paginaDe([
        pagamentoFalso(2, {
          status: 'Paid',
          amount: 1234.5,
          paidAt: '2026-06-03T01:30:00Z',
          courseTitulo: 'Angular',
        }),
        pagamentoFalso(1, { courseTitulo: 'API com .NET' }),
        pagamentoFalso(3, { status: 'Failed', courseTitulo: 'Docker' }),
        pagamentoFalso(4, { status: 'Refunded', courseTitulo: 'Kubernetes' }),
      ]),
    });

    await page.goto('/aluno/pagamentos');

    const linhas = page.locator('tbody tr');
    await expect(linhas).toHaveCount(4);
    await expect(linhas.nth(0)).toContainText('Angular');
    await expect(linhas.nth(0)).toContainText('R$ 1.234,50');
    await expect(linhas.nth(0)).toContainText('Pago');
    await expect(linhas.nth(0)).toContainText('02/06/2026');
    await expect(linhas.nth(0)).toContainText('03/06/2026');
    await expect(linhas.nth(1)).toContainText('Pendente');
    await expect(linhas.nth(1).locator('td').nth(4)).toHaveText('—');
    await expect(linhas.nth(2)).toContainText('Falhou');
    await expect(linhas.nth(3)).toContainText('Estornado');
    const consulta = new URL(api.chamadas('GET', `/Payment/student/${PERFIL.id}`)[0].url());
    expect(consulta.searchParams.get('PageNumber')).toBe('1');
    expect(consulta.searchParams.get('PageSize')).toBe('10');
  });

  test('WEB-ALU-009: paginação pela URL, com página inválida virando 1', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', `/Payment/student/${PERFIL.id}`, (requisicao) => {
      const numero = Number(new URL(requisicao.url()).searchParams.get('PageNumber'));
      return {
        corpo: paginaDe([pagamentoFalso(numero, { courseTitulo: `Página ${numero}` })], {
          numero,
          total: 25,
        }),
      };
    });

    await page.goto('/aluno/pagamentos?pagina=abc');

    await expect(page.getByText('Página 1 de 3')).toBeVisible();
    await expect(page.locator('[data-teste="anterior"]')).toBeDisabled();
    await page.locator('[data-teste="proxima"]').click();
    await expect(page).toHaveURL(/\?pagina=2$/);
    await expect(page.getByText('Página 2 de 3')).toBeVisible();
    await expect(page.locator('tbody tr')).toContainText('Página 2');
    await page.locator('[data-teste="proxima"]').click();
    await expect(page.getByText('Página 3 de 3')).toBeVisible();
    await expect(page.locator('[data-teste="proxima"]')).toBeDisabled();
    await page.locator('[data-teste="anterior"]').click();
    await expect(page).toHaveURL(/\?pagina=2$/);
  });

  test('WEB-ALU-010: sem pagamentos ou com erro', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', `/Payment/student/${PERFIL.id}`, { corpo: paginaDe([]) });

    await page.goto('/aluno/pagamentos');
    await expect(page.getByText('Nenhum pagamento registrado.')).toBeVisible();

    api.quando('GET', `/Payment/student/${PERFIL.id}`, problema(500, 'Falha interna'));
    await page.reload();
    await expect(page.getByText('Não foi possível carregar seus pagamentos.')).toBeVisible();
    await expect(page.locator('[data-teste="recarregar"]')).toBeVisible();
  });
});

test.describe('perfil', () => {
  test('WEB-ALU-012: e-mail e data de cadastro só leitura, nome editável', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', '/Student/me', {
      corpo: { ...PERFIL, dataCadastro: '2026-03-16T01:30:00Z' },
    });

    await page.goto('/aluno/perfil');

    await expect(page.getByText(PERFIL.email)).toBeVisible();
    await expect(page.locator('dd').nth(1)).toHaveText('16/03/2026');
    await expect(page.getByText('Aluno desde')).toBeVisible();
    await expect(page.getByLabel('Nome')).toHaveValue(PERFIL.nome);
    await expect(page.getByLabel('Nome')).toBeEditable();
  });

  test('WEB-ALU-013: salvar o nome mostra o progresso, notifica e recarrega o perfil', async ({
    page,
  }) => {
    const api = await alunoComPerfil(page);
    let nomeAtual = PERFIL.nome;
    api
      .quando('GET', '/Student/me', () => ({ corpo: { ...PERFIL, nome: nomeAtual } }))
      .quando('PUT', `/Student/${PERFIL.id}`, (requisicao) => {
        nomeAtual = requisicao.postDataJSON().nome;
        return { status: 204, atraso: 500 };
      });
    await page.goto('/aluno/perfil');
    const nome = page.getByLabel('Nome');
    await expect(nome).toHaveValue(PERFIL.nome);

    await nome.fill('  Ana Lima  ');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
    await expect(page.getByText('Perfil atualizado')).toBeVisible();
    expect(api.chamadas('PUT', `/Student/${PERFIL.id}`)[0].postDataJSON()).toEqual({
      nome: 'Ana Lima',
    });
    await expect(nome).toHaveValue('Ana Lima');
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  test('WEB-ALU-014: salvar só fica disponível com um nome novo e válido', async ({ page }) => {
    await alunoComPerfil(page);
    await page.goto('/aluno/perfil');
    const nome = page.getByLabel('Nome');
    const salvar = page.getByRole('button', { name: 'Salvar' });
    await expect(nome).toHaveValue(PERFIL.nome);

    await expect(salvar).toBeDisabled();
    await nome.fill('   ');
    await nome.blur();
    await expect(salvar).toBeDisabled();
    await expect(page.getByText('Informe o nome.')).toBeVisible();
    await nome.fill('Outro nome');
    await expect(salvar).toBeEnabled();
    await expect(nome).toHaveAttribute('maxlength', '100');
  });

  test('WEB-ALU-015: erro de validação da API aparece no campo', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando(
      'PUT',
      `/Student/${PERFIL.id}`,
      problema(422, 'Erro de validação', { Nome: ['O nome é inválido.'] }),
    );
    await page.goto('/aluno/perfil');
    await expect(page.getByLabel('Nome')).toHaveValue(PERFIL.nome);

    await page.getByLabel('Nome').fill('Nome recusado');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByRole('alert')).toHaveText('O nome é inválido.');
    await expect(page.locator(notificacoes)).toHaveCount(0);
  });
});
