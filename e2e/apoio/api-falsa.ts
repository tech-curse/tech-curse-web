import { Page, Request, Route } from '@playwright/test';

export type Papel = 'Admin' | 'Instructor' | 'Student';

export interface RespostaFalsa {
  status?: number;
  corpo?: unknown;
  atraso?: number;
  falhaDeRede?: boolean;
}

type Atendimento = RespostaFalsa | ((requisicao: Request) => RespostaFalsa);

interface RotaFalsa {
  metodo: string;
  caminho: string | RegExp;
  atendimento: Atendimento;
}

const PREFIXO = '/tech-curse';

function base64url(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}

export function tokenDe(papel: Papel, email = `${papel.toLowerCase()}@teste.com`): string {
  const claims = { nameid: `usuario-${papel.toLowerCase()}`, email, role: papel };
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(claims)}.assinatura`;
}

export function sessaoDe(papel: Papel, expiraEmMs = 60 * 60 * 1000) {
  return {
    accessToken: tokenDe(papel),
    expiresAt: new Date(Date.now() + expiraEmMs).toISOString(),
  };
}

const papeisDasPaginas = new WeakMap<Page, Papel>();

export async function entrarComo(page: Page, papel: Papel): Promise<void> {
  papeisDasPaginas.set(page, papel);
}

export function problema(
  status: number,
  detail: string,
  errors?: Record<string, string[]>,
): RespostaFalsa {
  return { status, corpo: { status, title: 'Erro', detail, ...(errors ? { errors } : {}) } };
}

export function paginaDe<T>(items: T[], { numero = 1, tamanho = 10, total = items.length } = {}) {
  const totalPages = Math.max(1, Math.ceil(total / tamanho));
  return {
    items,
    pageNumber: numero,
    pageSize: tamanho,
    totalCount: total,
    totalPages,
    hasPreviousPage: numero > 1,
    hasNextPage: numero < totalPages,
  };
}

export class ApiFalsa {
  readonly requisicoes: Request[] = [];
  private readonly rotas: RotaFalsa[] = [];

  private constructor() {}

  static async em(page: Page): Promise<ApiFalsa> {
    const api = new ApiFalsa();
    const papel = papeisDasPaginas.get(page);
    api
      .quando(
        'POST',
        '/Auth/refresh',
        papel ? { corpo: sessaoDe(papel) } : problema(401, 'Refresh Token inválido ou expirado.'),
      )
      .quando('POST', '/Auth/logout', () => {
        api.quando('POST', '/Auth/refresh', problema(401, 'Refresh Token inválido ou expirado.'));
        return { status: 204 };
      });
    await page.route(`**${PREFIXO}/**`, (rota) => api.atender(rota));
    return api;
  }

  quando(metodo: string, caminho: string | RegExp, atendimento: Atendimento): this {
    this.rotas.unshift({ metodo, caminho, atendimento });
    return this;
  }

  chamadas(metodo: string, caminho: string | RegExp): Request[] {
    return this.requisicoes.filter(
      (requisicao) =>
        requisicao.method() === metodo && ApiFalsa.casa(caminho, ApiFalsa.caminhoDe(requisicao)),
    );
  }

  private static caminhoDe(requisicao: Request): string {
    return new URL(requisicao.url()).pathname.slice(PREFIXO.length);
  }

  private static casa(caminho: string | RegExp, real: string): boolean {
    return typeof caminho === 'string' ? caminho === real : caminho.test(real);
  }

  private async atender(rota: Route): Promise<void> {
    const requisicao = rota.request();
    this.requisicoes.push(requisicao);
    const caminho = ApiFalsa.caminhoDe(requisicao);
    const encontrada = this.rotas.find(
      (r) => r.metodo === requisicao.method() && ApiFalsa.casa(r.caminho, caminho),
    );
    const resposta: RespostaFalsa = encontrada
      ? typeof encontrada.atendimento === 'function'
        ? encontrada.atendimento(requisicao)
        : encontrada.atendimento
      : problema(501, `Sem resposta falsa para ${requisicao.method()} ${caminho}`);

    if (resposta.atraso) await new Promise((resolver) => setTimeout(resolver, resposta.atraso));
    if (resposta.falhaDeRede) return rota.abort('failed');
    const status = resposta.status ?? 200;
    await rota.fulfill({
      status,
      contentType: 'application/json',
      body: status === 204 || resposta.corpo === undefined ? '' : JSON.stringify(resposta.corpo),
    });
  }
}

export const PERFIL = {
  id: 7,
  nome: 'Ana Souza',
  email: 'student@teste.com',
  dataCadastro: '2026-03-15T23:30:00Z',
};

export function cursoFalso(id: number, sobrescrever: Record<string, unknown> = {}) {
  return {
    id,
    titulo: `Curso ${id}`,
    descricao: `Descrição do curso ${id}`,
    categoria: 'Backend',
    cargaHoraria: 10 + id,
    dataCriacao: '2026-05-01T12:00:00Z',
    ...sobrescrever,
  };
}

export function matriculaFalsa(courseId: number, sobrescrever: Record<string, unknown> = {}) {
  return {
    courseId,
    titulo: `Curso ${courseId}`,
    descricao: `Descrição do curso ${courseId}`,
    categoria: 'Backend',
    matriculaAtiva: true,
    enrollmentId: 100 + courseId,
    ...sobrescrever,
  };
}

export async function alunoComPerfil(page: Page, matriculas: unknown[] = []): Promise<ApiFalsa> {
  await entrarComo(page, 'Student');
  const api = await ApiFalsa.em(page);
  api
    .quando('GET', '/Student/me', { corpo: PERFIL })
    .quando('GET', `/Student/${PERFIL.id}/enrollments`, { corpo: matriculas });
  return api;
}
