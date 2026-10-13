import { Request } from '@playwright/test';
import { expect, servirConfiguracao, test } from './apoio/teste';
import {
  ApiFalsa,
  PERFIL,
  alunoComPerfil,
  cursoFalso,
  entrarComo,
  matriculaFalsa,
  paginaDe,
  problema,
} from './apoio/api-falsa';

test.use({ timezoneId: 'America/Sao_Paulo' });

type CursoFalso = ReturnType<typeof cursoFalso>;

const CATEGORIAS = ['Backend', 'Frontend', 'Dados'];

function catalogoCom(quantidade: number): CursoFalso[] {
  return Array.from({ length: quantidade }, (_, i) =>
    cursoFalso(i + 1, {
      titulo: `Curso ${String.fromCharCode(65 + ((i * 7) % 26))}${i + 1}`,
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      dataCriacao: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    }),
  );
}

function servirCatalogo(cursos: CursoFalso[]) {
  return (requisicao: Request) => {
    const params = new URL(requisicao.url()).searchParams;
    const numero = Number(params.get('PageNumber'));
    const tamanho = Number(params.get('PageSize'));
    const campo = params.get('SortBy') as 'datacriacao' | 'titulo' | 'categoria';
    const sentido = params.get('SortDirection') === 'desc' ? -1 : 1;
    const chave = { datacriacao: 'dataCriacao', titulo: 'titulo', categoria: 'categoria' }[
      campo
    ] as keyof CursoFalso;
    const filtrados = cursos
      .filter((curso) => !params.get('Categoria') || curso.categoria === params.get('Categoria'))
      .sort((a, b) => String(a[chave]).localeCompare(String(b[chave])) * sentido || a.id - b.id);
    return {
      corpo: paginaDe(filtrados.slice((numero - 1) * tamanho, numero * tamanho), {
        numero,
        tamanho,
        total: filtrados.length,
      }),
    };
  };
}

function parametrosDe(requisicao: Request): Record<string, string> {
  return Object.fromEntries(new URL(requisicao.url()).searchParams);
}

async function catalogo(page: import('@playwright/test').Page, cursos: CursoFalso[]) {
  const api = await alunoComPerfil(page);
  api.quando('GET', '/Course', servirCatalogo(cursos));
  return api;
}

const cards = '[data-teste^="categoria-"]';

test.describe('listagem', () => {
  test('WEB-CAT-001: até 12 cursos, do mais recente, com título, categoria e carga horária', async ({
    page,
  }) => {
    const cursos = catalogoCom(14);
    const api = await catalogo(page, cursos);

    await page.goto('/cursos');

    const artigos = page.locator('article');
    await expect(artigos).toHaveCount(12);
    await expect(artigos.first()).toContainText(cursos[13].titulo);
    await expect(artigos.first()).toContainText(cursos[13].categoria);
    await expect(artigos.first()).toContainText(`${cursos[13].cargaHoraria}h`);
    expect(parametrosDe(api.chamadas('GET', '/Course')[0])).toEqual({
      PageNumber: '1',
      PageSize: '12',
      SortBy: 'datacriacao',
      SortDirection: 'desc',
    });
  });

  test('WEB-CAT-002: a ordem escolhida vai para a URL e volta para a página 1', async ({
    page,
  }) => {
    const cursos = catalogoCom(14);
    const api = await catalogo(page, cursos);
    await page.goto('/cursos?pagina=2');
    await expect(page.getByText('Página 2 de 2')).toBeVisible();

    await page.locator('[data-teste="ordem"]').selectOption({ label: 'Título A–Z' });

    await expect(page).toHaveURL(/\/cursos\?ordem=titulo-asc$/);
    const ordenados = [...cursos].sort((a, b) => a.titulo.localeCompare(b.titulo));
    await expect(page.locator('article').first()).toContainText(ordenados[0].titulo);
    expect(parametrosDe(api.chamadas('GET', '/Course').at(-1)!)).toMatchObject({
      PageNumber: '1',
      SortBy: 'titulo',
      SortDirection: 'asc',
    });

    for (const [rotulo, ordem, sortBy, direcao] of [
      ['Título Z–A', 'titulo-desc', 'titulo', 'desc'],
      ['Categoria', 'categoria', 'categoria', 'asc'],
      ['Mais recentes', 'recentes', 'datacriacao', 'desc'],
    ]) {
      await page.locator('[data-teste="ordem"]').selectOption({ label: rotulo });
      await expect(page).toHaveURL(new RegExp(`ordem=${ordem}$`));
      await expect
        .poll(() => parametrosDe(api.chamadas('GET', '/Course').at(-1)!))
        .toMatchObject({ SortBy: sortBy, SortDirection: direcao });
    }
  });

  test('WEB-CAT-003: filtro pela categoria do card, com indicador e limpeza', async ({ page }) => {
    const cursos = catalogoCom(14);
    await catalogo(page, cursos);
    await page.goto('/cursos?pagina=2');
    await expect(page.locator('article')).toHaveCount(2);

    await page.locator(cards).first().click();

    const categoria = cursos[1].categoria;
    await expect(page).toHaveURL(new RegExp(`\\?categoria=${categoria}$`));
    await expect(page.locator('[data-teste="chip-categoria"]')).toContainText(
      `Categoria: ${categoria}`,
    );
    await expect(page.locator('article')).toHaveCount(
      cursos.filter((curso) => curso.categoria === categoria).length,
    );
    for (const card of await page.locator(cards).all()) {
      await expect(card).toHaveText(categoria);
    }

    await page.getByRole('button', { name: 'Limpar filtro de categoria' }).click();

    await expect(page).toHaveURL(/\/cursos$/);
    await expect(page.locator('[data-teste="chip-categoria"]')).toHaveCount(0);
    await expect(page.locator('article')).toHaveCount(12);
  });

  test('WEB-CAT-004: paginação pela URL mantém ordem e categoria', async ({ page }) => {
    const cursos = catalogoCom(40);
    const api = await catalogo(page, cursos);
    await page.goto('/cursos?ordem=titulo-asc&categoria=Backend');

    const anterior = page.locator('[data-teste="anterior"]');
    const proxima = page.locator('[data-teste="proxima"]');
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await expect(anterior).toBeDisabled();

    await proxima.click();

    await expect(page).toHaveURL(/pagina=2/);
    await expect(page).toHaveURL(/ordem=titulo-asc/);
    await expect(page).toHaveURL(/categoria=Backend/);
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    await expect(proxima).toBeDisabled();
    expect(parametrosDe(api.chamadas('GET', '/Course').at(-1)!)).toMatchObject({
      PageNumber: '2',
      SortBy: 'titulo',
      Categoria: 'Backend',
    });

    await anterior.click();
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
  });

  test('WEB-CAT-005: página e ordem inválidas na URL viram os padrões', async ({ page }) => {
    const api = await catalogo(page, catalogoCom(3));

    for (const consulta of ['?pagina=0', '?pagina=abc', '?ordem=qualquer', '?pagina=-2']) {
      await page.goto(`/cursos${consulta}`);
      await expect(page.locator('article')).toHaveCount(3);
    }

    for (const requisicao of api.chamadas('GET', '/Course')) {
      expect(parametrosDe(requisicao)).toMatchObject({
        PageNumber: '1',
        SortBy: 'datacriacao',
        SortDirection: 'desc',
      });
    }
  });

  test('WEB-CAT-006: carregando, erro com nova tentativa e listas vazias', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', '/Course', { ...problema(500, 'Falha interna'), atraso: 800 });

    await page.goto('/cursos');
    await expect(page.locator('[data-teste="carregando"]')).toBeVisible();
    await expect(page.getByText('Não foi possível carregar os cursos.')).toBeVisible();

    api.quando('GET', '/Course', { corpo: paginaDe([]) });
    await page.locator('[data-teste="recarregar"]').click();
    await expect(page.getByText('Nenhum curso disponível no momento.')).toBeVisible();

    await page.goto('/cursos?categoria=Dados');
    await expect(page.getByText('Nenhum curso na categoria Dados.')).toBeVisible();
  });

  test('WEB-CAT-007: selo "Matriculado" só para o aluno, nos cursos dele', async ({
    page,
    browser,
  }) => {
    const cursos = catalogoCom(3);
    const api = await alunoComPerfil(page, [matriculaFalsa(2)]);
    api.quando('GET', '/Course', servirCatalogo(cursos));

    await page.goto('/cursos');

    const selos = page.locator('[data-teste="selo-matriculado"]');
    await expect(selos).toHaveCount(1);
    await expect(page.locator('article').filter({ has: selos })).toContainText(cursos[1].titulo);

    const contexto = await browser.newContext();
    const admin = await contexto.newPage();
    await servirConfiguracao(admin);
    await entrarComo(admin, 'Admin');
    (await ApiFalsa.em(admin)).quando('GET', '/Course', servirCatalogo(cursos));
    await admin.goto('/cursos');
    await expect(admin.locator('article')).toHaveCount(3);
    await expect(admin.locator('[data-teste="selo-matriculado"]')).toHaveCount(0);
    await contexto.close();
  });
});

test.describe('detalhe', () => {
  test('WEB-CAT-008: detalhe com dados do curso, data em UTC e volta ao catálogo', async ({
    page,
  }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', '/Course/5', {
      corpo: cursoFalso(5, {
        titulo: 'Arquitetura limpa',
        descricao: 'Camadas e dependências',
        categoria: 'Backend',
        cargaHoraria: 32,
        dataCriacao: '2026-04-11T01:15:00Z',
      }),
    });

    await page.goto('/cursos/5');

    await expect(page.getByRole('heading', { name: 'Arquitetura limpa' })).toBeVisible();
    await expect(page.getByText('Camadas e dependências')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backend' })).toBeVisible();
    await expect(page.getByText('· 32h')).toBeVisible();
    await expect(page.getByText('· criado em 11/04/2026')).toBeVisible();
    await page.getByRole('link', { name: '← Voltar ao catálogo' }).click();
    await expect(page).toHaveURL(/\/cursos$/);
  });

  test('WEB-CAT-009: id inválido ou curso inexistente mostram "Curso não encontrado"', async ({
    page,
  }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', '/Course/999', problema(404, 'Curso não encontrado.'));

    for (const id of ['abc', '0', '1.5']) {
      await page.goto(`/cursos/${id}`);
      await expect(page.getByRole('heading', { name: 'Curso não encontrado' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver catálogo' })).toBeVisible();
    }
    expect(api.chamadas('GET', /^\/Course\//)).toHaveLength(0);

    await page.goto('/cursos/999');
    await expect(page.getByRole('heading', { name: 'Curso não encontrado' })).toBeVisible();
  });

  test('WEB-CAT-010: outro erro ao carregar o detalhe', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api.quando('GET', '/Course/5', problema(500, 'Falha interna'));

    await page.goto('/cursos/5');

    await expect(page.getByText('Não foi possível carregar o curso.')).toBeVisible();
  });
});

test.describe('matrícula', () => {
  test('WEB-CAT-011: aluno se matricula pelo detalhe', async ({ page }) => {
    let matriculas: unknown[] = [];
    const api = await alunoComPerfil(page);
    api
      .quando('GET', `/Student/${PERFIL.id}/enrollments`, () => ({ corpo: matriculas }))
      .quando('GET', '/Course/3', { corpo: cursoFalso(3) })
      .quando('GET', '/Course', servirCatalogo(catalogoCom(3)))
      .quando('POST', '/Enrollment', () => {
        matriculas = [matriculaFalsa(3)];
        return { status: 201, corpo: { mensagem: 'Aluno matriculado com sucesso.' }, atraso: 600 };
      });
    await page.goto('/cursos/3');
    const botao = page.locator('[data-teste="matricular"]');
    await expect(botao).toBeEnabled();

    await botao.click();

    await expect(botao).toHaveText('Matriculando...');
    await expect(botao).toBeDisabled();
    await expect(page.getByText('Matrícula realizada')).toBeVisible();
    const area = page.locator('[data-teste="area-matricula"]');
    await expect(area).toContainText('Você está matriculado');
    await expect(area.getByRole('link', { name: 'Ver meus cursos' })).toBeVisible();
    expect(api.chamadas('POST', '/Enrollment')[0].postDataJSON()).toEqual({
      courseId: 3,
      studentId: PERFIL.id,
    });

    await page.getByRole('link', { name: '← Voltar ao catálogo' }).click();
    await expect(page.locator('[data-teste="selo-matriculado"]')).toHaveCount(1);
    await page.goto('/aluno/matriculas');
    await expect(page.locator('article')).toContainText('Curso 3');
  });

  test('WEB-CAT-012: curso em que o aluno já está matriculado', async ({ page }) => {
    const api = await alunoComPerfil(page, [matriculaFalsa(3)]);
    api.quando('GET', '/Course/3', { corpo: cursoFalso(3) });

    await page.goto('/cursos/3');

    await expect(page.locator('[data-teste="area-matricula"]')).toContainText(
      'Você está matriculado',
    );
    await expect(page.locator('[data-teste="matricular"]')).toHaveCount(0);
  });

  test('WEB-CAT-013: erro na matrícula vira notificação e libera o botão', async ({ page }) => {
    const api = await alunoComPerfil(page);
    api
      .quando('GET', '/Course/3', { corpo: cursoFalso(3) })
      .quando('POST', '/Enrollment', problema(409, 'Estudante já está matriculado neste curso!'));
    await page.goto('/cursos/3');

    await page.locator('[data-teste="matricular"]').click();

    await expect(page.getByText('Estudante já está matriculado neste curso!')).toBeVisible();
    await expect(page.locator('[data-teste="matricular"]')).toBeEnabled();
    await expect(page.locator('[data-teste="matricular"]')).toHaveText('Matricular-me');
  });

  test('WEB-CAT-014: sem perfil ativo, a matrícula fica bloqueada', async ({ page }) => {
    await entrarComo(page, 'Student');
    const api = await ApiFalsa.em(page);
    api
      .quando('GET', '/Course/3', { corpo: cursoFalso(3) })
      .quando('GET', '/Student/me', { corpo: PERFIL, atraso: 1500 })
      .quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: [] });
    const botao = page.locator('[data-teste="matricular"]');

    await page.goto('/cursos/3');
    await expect(botao).toBeDisabled();
    await expect(botao).toBeEnabled();

    api.quando('GET', '/Student/me', problema(500, 'Falha interna'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Curso 3' })).toBeVisible();
    await expect(botao).toBeDisabled();
    await expect(page.locator('[data-teste="sem-perfil"]')).toHaveCount(0);

    api.quando('GET', '/Student/me', problema(404, 'Perfil de estudante não encontrado.'));
    await page.reload();
    await expect(page.locator('[data-teste="sem-perfil"]')).toHaveText(
      'Não encontramos seu perfil de aluno. Fale com o administrador.',
    );
    await expect(botao).toBeDisabled();
  });

  for (const papel of ['Admin', 'Instructor'] as const) {
    test(`WEB-CAT-015: ${papel} não vê a área de matrícula`, async ({ page }) => {
      await entrarComo(page, papel);
      const api = await ApiFalsa.em(page);
      api.quando('GET', '/Course/3', { corpo: cursoFalso(3) });

      await page.goto('/cursos/3');

      await expect(page.getByRole('heading', { name: 'Curso 3' })).toBeVisible();
      await expect(page.locator('[data-teste="area-matricula"]')).toHaveCount(0);
      expect(api.chamadas('GET', '/Student/me')).toHaveLength(0);
    });
  }
});
