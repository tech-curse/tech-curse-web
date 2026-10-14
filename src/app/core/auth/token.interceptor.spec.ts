import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CONFIGURACAO } from '../configuracao/configuracao';
import { erroInterceptor } from '../http/erro.interceptor';
import { AutenticacaoService } from './autenticacao.service';
import { tokenInterceptor } from './token.interceptor';

const API = '/tech-curse';

const sessaoAntiga = { accessToken: 'access-antigo', expiresAt: '2099-01-01T00:00:00Z' };
const sessaoNova = { accessToken: 'access-novo', expiresAt: '2099-01-02T00:00:00Z' };

const naoAutorizado = { status: 401, statusText: 'Unauthorized' };
const semConteudo = { status: 204, statusText: 'No Content' };

function proximoCiclo(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver));
}

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let router: Router;
  let auth: AutenticacaoService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([erroInterceptor, tokenInterceptor])),
        provideHttpClientTesting(),
        { provide: CONFIGURACAO, useValue: { apiUrl: API, pagamentosHabilitados: true } },
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AutenticacaoService);
    const entrada = auth.entrar('aluno@teste.com', 'Senha@Forte1');
    api.expectOne(`${API}/Auth/login`).flush(sessaoAntiga);
    await entrada;
  });

  afterEach(() => {
    api.verify();
    vi.restoreAllMocks();
  });

  async function renovacaoAceita(): Promise<void> {
    await proximoCiclo();
    const renovacao = api.expectOne(`${API}/Auth/refresh`);
    expect(renovacao.request.method).toBe('POST');
    expect(renovacao.request.body).toBeNull();
    renovacao.flush(sessaoNova);
    await proximoCiclo();
  }

  async function renovacaoRecusadaESaida(): Promise<void> {
    await proximoCiclo();
    api.expectOne(`${API}/Auth/refresh`).flush(null, naoAutorizado);
    await proximoCiclo();
    api.expectOne(`${API}/Auth/logout`).flush(null, semConteudo);
    await proximoCiclo();
  }

  it('WEB-AUTH-010: requisição à API leva o token; para outro endereço, não', async () => {
    const daApi = firstValueFrom(http.get(`${API}/Course`));
    const deFora = firstValueFrom(http.get('https://outro.exemplo.com/recurso'));

    const paraApi = api.expectOne(`${API}/Course`);
    const paraFora = api.expectOne('https://outro.exemplo.com/recurso');
    expect(paraApi.request.headers.get('Authorization')).toBe('Bearer access-antigo');
    expect(paraFora.request.headers.has('Authorization')).toBe(false);
    paraApi.flush({});
    paraFora.flush({});
    await Promise.all([daApi, deFora]);
  });

  it('WEB-AUTH-011: 401 renova a sessão pelo cookie e repete a requisição com o token novo', async () => {
    const resposta = firstValueFrom(http.get(`${API}/Student/me`));

    api.expectOne(`${API}/Student/me`).flush(null, naoAutorizado);
    await renovacaoAceita();
    const repeticao = api.expectOne(`${API}/Student/me`);
    expect(repeticao.request.headers.get('Authorization')).toBe('Bearer access-novo');
    repeticao.flush({ id: 7 });

    expect(await resposta).toEqual({ id: 7 });
    expect(auth.accessToken()).toBe('access-novo');
  });

  it('WEB-AUTH-012: três 401 ao mesmo tempo geram uma única renovação', async () => {
    const rotas = ['/Course', '/Student/me', '/Payment/student/7'];
    const respostas = rotas.map((rota) => firstValueFrom(http.get(`${API}${rota}`)));

    for (const rota of rotas) {
      api.expectOne(`${API}${rota}`).flush(null, naoAutorizado);
    }
    await renovacaoAceita();
    for (const rota of rotas) {
      const repeticao = api.expectOne(`${API}${rota}`);
      expect(repeticao.request.headers.get('Authorization')).toBe('Bearer access-novo');
      repeticao.flush({ rota });
    }

    expect(await Promise.all(respostas)).toEqual(rotas.map((rota) => ({ rota })));
  });

  it('WEB-AUTH-013: renovação que falha encerra a sessão e leva ao login com returnUrl', async () => {
    await router.navigateByUrl('/cursos/3');
    const navegar = vi.spyOn(router, 'navigate');
    const resposta = firstValueFrom(http.get(`${API}/Course/3`));

    api.expectOne(`${API}/Course/3`).flush(null, naoAutorizado);
    await renovacaoRecusadaESaida();

    await expect(resposta).rejects.toMatchObject({ status: 401 });
    expect(auth.accessToken()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/entrar'], { queryParams: { returnUrl: '/cursos/3' } });
  });

  it('WEB-AUTH-013: na página inicial, o login não leva returnUrl', async () => {
    await router.navigateByUrl('/');
    const navegar = vi.spyOn(router, 'navigate');
    const resposta = firstValueFrom(http.get(`${API}/Course`));

    api.expectOne(`${API}/Course`).flush(null, naoAutorizado);
    await renovacaoRecusadaESaida();

    await expect(resposta).rejects.toMatchObject({ status: 401 });
    expect(navegar).toHaveBeenCalledWith(['/entrar'], {});
  });

  it('WEB-AUTH-014: rotas de autenticação não disparam renovação', async () => {
    for (const rota of ['/Auth/login', '/Auth/register', '/Auth/refresh', '/Auth/logout']) {
      const resposta = firstValueFrom(http.post(`${API}${rota}`, {}));

      api.expectOne(`${API}${rota}`).flush(null, naoAutorizado);

      await expect(resposta).rejects.toMatchObject({ status: 401 });
      await proximoCiclo();
      api.expectNone(`${API}/Auth/refresh`);
    }
    expect(auth.accessToken()).toBe('access-antigo');
  });
});
