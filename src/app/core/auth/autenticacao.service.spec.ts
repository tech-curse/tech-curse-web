import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONFIGURACAO } from '../configuracao/configuracao';
import {
  AutenticacaoService,
  CHAVE_ANTIGA_DA_SESSAO,
  TRAVA_DA_RENOVACAO,
} from './autenticacao.service';

const API = '/tech-curse';

function base64url(valor: object): string {
  return btoa(JSON.stringify(valor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const ACCESS_TOKEN = `${base64url({ alg: 'HS256' })}.${base64url({
  nameid: 'usuario-1',
  email: 'aluno@teste.com',
  role: 'Student',
})}.assinatura`;

const SESSAO = { accessToken: ACCESS_TOKEN, expiresAt: '2099-01-01T00:00:00Z' };

function proximoCiclo(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver));
}

describe('AutenticacaoService', () => {
  let servico: AutenticacaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CONFIGURACAO, useValue: { apiUrl: API, pagamentosHabilitados: true } },
      ],
    });
    servico = TestBed.inject(AutenticacaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('WEB-AUTH-009: o registro envia só nome, e-mail, senha e confirmação, sem papel', async () => {
    const registro = servico.registrar({
      nome: '  João da Silva  ',
      email: 'joao@exemplo.com',
      senha: 'Senha@Forte1',
      confirmacaoSenha: 'Senha@Forte1',
    });

    const requisicao = http.expectOne(`${API}/Auth/register`);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      name: 'João da Silva',
      email: 'joao@exemplo.com',
      password: 'Senha@Forte1',
      confirmPassword: 'Senha@Forte1',
    });
    requisicao.flush(
      { mensagem: 'Usuário registrado com sucesso.' },
      { status: 201, statusText: 'Created' },
    );
    await registro;
  });

  it('WEB-AUTH-015: abrir o app restaura a sessão pelo cookie, uma vez só', async () => {
    const restauracao = servico.garantirSessao();
    await proximoCiclo();
    const renovacao = http.expectOne(`${API}/Auth/refresh`);
    expect(renovacao.request.body).toBeNull();
    renovacao.flush(SESSAO);

    expect(await restauracao).toBe(true);
    expect(servico.role()).toBe('Student');
    expect(await servico.garantirSessao()).toBe(true);
    http.expectNone(`${API}/Auth/refresh`);
  });

  it('WEB-AUTH-015: sem sessão no servidor, o app não insiste na renovação', async () => {
    const restauracao = servico.garantirSessao();
    await proximoCiclo();
    http.expectOne(`${API}/Auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await restauracao).toBe(false);
    expect(await servico.garantirSessao()).toBe(false);
    http.expectNone(`${API}/Auth/refresh`);
  });

  it('WEB-AUTH-020: sair chama o logout da API antes de apagar a sessão', async () => {
    const entrada = servico.entrar('aluno@teste.com', 'Senha@Forte1');
    http.expectOne(`${API}/Auth/login`).flush(SESSAO);
    await entrada;

    const saida = servico.sair();
    const logout = http.expectOne(`${API}/Auth/logout`);
    expect(logout.request.method).toBe('POST');
    expect(servico.estaAutenticado()).toBe(true);
    logout.flush(null, { status: 204, statusText: 'No Content' });
    await saida;

    expect(servico.estaAutenticado()).toBe(false);
  });

  it('WEB-AUTH-020: se o logout da API falhar, a sessão local é encerrada assim mesmo', async () => {
    const entrada = servico.entrar('aluno@teste.com', 'Senha@Forte1');
    http.expectOne(`${API}/Auth/login`).flush(SESSAO);
    await entrada;

    const saida = servico.sair();
    http.expectOne(`${API}/Auth/logout`).error(new ProgressEvent('error'));
    await saida;

    expect(servico.estaAutenticado()).toBe(false);
  });

  it('WEB-AUTH-022: nenhum token vai para o localStorage nem para o sessionStorage', async () => {
    const entrada = servico.entrar('aluno@teste.com', 'Senha@Forte1');
    http.expectOne(`${API}/Auth/login`).flush(SESSAO);
    await entrada;

    const guardado = [localStorage, sessionStorage]
      .flatMap((armazenamento) =>
        Object.keys(armazenamento).map((chave) => armazenamento.getItem(chave)),
      )
      .join(' ');
    expect(guardado).not.toContain(ACCESS_TOKEN);
    expect(servico.accessToken()).toBe(ACCESS_TOKEN);
  });

  it('WEB-AUTH-023: a renovação usa a trava entre abas quando o navegador oferece', async () => {
    const request = vi.fn((_nome: string, acao: () => Promise<unknown>) => acao());
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    try {
      const renovacao = servico.renovar();
      await proximoCiclo();
      http.expectOne(`${API}/Auth/refresh`).flush(SESSAO);
      await renovacao;

      expect(request).toHaveBeenCalledExactlyOnceWith(TRAVA_DA_RENOVACAO, expect.any(Function));
    } finally {
      delete (navigator as { locks?: unknown }).locks;
    }
  });
});

describe('AutenticacaoService sem tokens antigos', () => {
  afterEach(() => localStorage.clear());

  it('WEB-AUTH-022: apaga a sessão que versões antigas gravavam no localStorage', () => {
    localStorage.setItem(CHAVE_ANTIGA_DA_SESSAO, '{"accessToken":"a","refreshToken":"r"}');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CONFIGURACAO, useValue: { apiUrl: API, pagamentosHabilitados: true } },
      ],
    });

    TestBed.inject(AutenticacaoService);

    expect(localStorage.getItem(CHAVE_ANTIGA_DA_SESSAO)).toBeNull();
  });
});
