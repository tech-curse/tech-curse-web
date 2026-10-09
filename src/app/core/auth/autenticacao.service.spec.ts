import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';

describe('AutenticacaoService', () => {
  let servico: AutenticacaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

    const requisicao = http.expectOne(`${environment.apiUrl}/Auth/register`);
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
});
