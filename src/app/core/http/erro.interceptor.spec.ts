import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { SILENCIAR_ERRO, erroInterceptor } from './erro.interceptor';

const URL = '/tech-curse/Course';

describe('erroInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let erro: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    erro = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: { erro, sucesso: vi.fn(), info: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
  });

  afterEach(() => api.verify());

  async function falharCom(status: number, corpo: object, context?: HttpContext) {
    const resposta = firstValueFrom(http.get(URL, { context }));
    api.expectOne(URL).flush(corpo, { status, statusText: 'Erro' });
    return resposta.catch((e: unknown) => e);
  }

  it.each([403, 404, 409, 429, 500, 503, 504])(
    'WEB-NAV-008: %i não tratado vira notificação com o detail',
    async (status) => {
      const recebido = await falharCom(status, { title: 'Erro', detail: `Detalhe do ${status}` });

      expect(erro).toHaveBeenCalledExactlyOnceWith(`Detalhe do ${status}`);
      expect(recebido).toMatchObject({ status, detalhe: `Detalhe do ${status}` });
    },
  );

  it.each([400, 401, 422])('WEB-NAV-008: %i nunca gera notificação automática', async (status) => {
    const recebido = await falharCom(status, {
      title: 'Erro',
      detail: 'Tratado por quem chamou',
      errors: { Campo: ['Mensagem'] },
    });

    expect(erro).not.toHaveBeenCalled();
    expect(recebido).toMatchObject({ status, erros: { Campo: ['Mensagem'] } });
  });

  it('WEB-NAV-008: requisição silenciada converte o erro sem notificar', async () => {
    const recebido = await falharCom(
      404,
      { title: 'Erro', detail: 'Perfil não encontrado' },
      new HttpContext().set(SILENCIAR_ERRO, true),
    );

    expect(erro).not.toHaveBeenCalled();
    expect(recebido).toMatchObject({ status: 404 });
  });

  it('WEB-NAV-009: requisição que não chega à API avisa que não há conexão', async () => {
    const resposta = firstValueFrom(http.get(URL)).catch((e: unknown) => e);
    api.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });

    expect(await resposta).toMatchObject({ status: 0 });
    expect(erro).toHaveBeenCalledExactlyOnceWith('Não foi possível conectar ao servidor.');
  });
});
