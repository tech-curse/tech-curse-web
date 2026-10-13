import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { erroInterceptor } from '../http/erro.interceptor';
import { CHAVE_SESSAO, Sessao, gravarSessao, lerSessao } from './sessao';
import { tokenInterceptor } from './token.interceptor';

const sessaoAntiga: Sessao = {
  accessToken: 'access-antigo',
  refreshToken: 'refresh-antigo',
  expiresAt: '2099-01-01T00:00:00Z',
};

const sessaoNova: Sessao = {
  accessToken: 'access-novo',
  refreshToken: 'refresh-novo',
  expiresAt: '2099-01-02T00:00:00Z',
};

const naoAutorizado = { status: 401, statusText: 'Unauthorized' };

function proximoCiclo(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver));
}

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    gravarSessao(sessaoAntiga);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([erroInterceptor, tokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    api.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  async function renovacaoAceita(): Promise<void> {
    await proximoCiclo();
    const renovacao = api.expectOne(`${environment.apiUrl}/Auth/refresh`);
    expect(renovacao.request.body).toEqual({
      accessToken: sessaoAntiga.accessToken,
      refreshToken: sessaoAntiga.refreshToken,
    });
    renovacao.flush(sessaoNova);
    await proximoCiclo();
  }

  it('WEB-AUTH-010: requisição à API leva o token; para outro endereço, não', async () => {
    const daApi = firstValueFrom(http.get(`${environment.apiUrl}/Course`));
    const deFora = firstValueFrom(http.get('https://outro.exemplo.com/recurso'));

    const paraApi = api.expectOne(`${environment.apiUrl}/Course`);
    const paraFora = api.expectOne('https://outro.exemplo.com/recurso');
    expect(paraApi.request.headers.get('Authorization')).toBe('Bearer access-antigo');
    expect(paraFora.request.headers.has('Authorization')).toBe(false);
    paraApi.flush({});
    paraFora.flush({});
    await Promise.all([daApi, deFora]);
  });

  it('WEB-AUTH-011: 401 renova a sessão uma vez e repete a requisição com o token novo', async () => {
    const resposta = firstValueFrom(http.get(`${environment.apiUrl}/Student/me`));

    api.expectOne(`${environment.apiUrl}/Student/me`).flush(null, naoAutorizado);
    await renovacaoAceita();
    const repeticao = api.expectOne(`${environment.apiUrl}/Student/me`);
    expect(repeticao.request.headers.get('Authorization')).toBe('Bearer access-novo');
    repeticao.flush({ id: 7 });

    expect(await resposta).toEqual({ id: 7 });
    expect(lerSessao()).toEqual(sessaoNova);
  });

  it('WEB-AUTH-012: três 401 ao mesmo tempo geram uma única renovação', async () => {
    const rotas = ['/Course', '/Student/me', '/Payment/student/7'];
    const respostas = rotas.map((rota) => firstValueFrom(http.get(`${environment.apiUrl}${rota}`)));

    for (const rota of rotas) {
      api.expectOne(`${environment.apiUrl}${rota}`).flush(null, naoAutorizado);
    }
    await renovacaoAceita();
    for (const rota of rotas) {
      const repeticao = api.expectOne(`${environment.apiUrl}${rota}`);
      expect(repeticao.request.headers.get('Authorization')).toBe('Bearer access-novo');
      repeticao.flush({ rota });
    }

    expect(await Promise.all(respostas)).toEqual(rotas.map((rota) => ({ rota })));
  });

  it('WEB-AUTH-013: renovação que falha apaga a sessão e leva ao login com returnUrl', async () => {
    await router.navigateByUrl('/cursos/3');
    const navegar = vi.spyOn(router, 'navigate');
    const resposta = firstValueFrom(http.get(`${environment.apiUrl}/Course/3`));

    api.expectOne(`${environment.apiUrl}/Course/3`).flush(null, naoAutorizado);
    await proximoCiclo();
    api.expectOne(`${environment.apiUrl}/Auth/refresh`).flush(null, naoAutorizado);

    await expect(resposta).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/entrar'], { queryParams: { returnUrl: '/cursos/3' } });
  });

  it('WEB-AUTH-013: na página inicial, o login não leva returnUrl', async () => {
    await router.navigateByUrl('/');
    const navegar = vi.spyOn(router, 'navigate');
    const resposta = firstValueFrom(http.get(`${environment.apiUrl}/Course`));

    api.expectOne(`${environment.apiUrl}/Course`).flush(null, naoAutorizado);
    await proximoCiclo();
    api.expectOne(`${environment.apiUrl}/Auth/refresh`).flush(null, naoAutorizado);

    await expect(resposta).rejects.toMatchObject({ status: 401 });
    expect(navegar).toHaveBeenCalledWith(['/entrar'], {});
  });

  it('WEB-AUTH-014: rotas de autenticação não disparam renovação', async () => {
    for (const rota of ['/Auth/login', '/Auth/register', '/Auth/refresh']) {
      const resposta = firstValueFrom(http.post(`${environment.apiUrl}${rota}`, {}));

      api.expectOne(`${environment.apiUrl}${rota}`).flush(null, naoAutorizado);

      await expect(resposta).rejects.toMatchObject({ status: 401 });
      await proximoCiclo();
      api.expectNone(`${environment.apiUrl}/Auth/refresh`);
    }
    expect(lerSessao()).toEqual(sessaoAntiga);
  });
});
