import {
  ENDERECO_DA_CONFIGURACAO,
  MENSAGEM_SEM_CONFIGURACAO,
  carregarConfiguracao,
  mostrarErroDeConfiguracao,
  validarConfiguracao,
} from './configuracao';

function respostaCom(corpo: string, status = 200): typeof fetch {
  return vi.fn(async () => new Response(corpo, { status })) as unknown as typeof fetch;
}

describe('configuracao', () => {
  it('WEB-NAV-010: lê o endereço da API e as funcionalidades do /config.json, sem cache', async () => {
    const buscar = respostaCom('{"apiUrl":"/tech-curse/","pagamentosHabilitados":true}');

    const configuracao = await carregarConfiguracao(buscar);

    expect(configuracao).toEqual({ apiUrl: '/tech-curse', pagamentosHabilitados: true });
    expect(buscar).toHaveBeenCalledWith(ENDERECO_DA_CONFIGURACAO, { cache: 'no-store' });
  });

  it('WEB-ALU-011: pagamentos ficam desligados quando a chave não vem', () => {
    expect(validarConfiguracao({ apiUrl: '/tech-curse' })).toEqual({
      apiUrl: '/tech-curse',
      pagamentosHabilitados: false,
    });
  });

  it.each([
    ['sem apiUrl', {}],
    ['apiUrl vazio', { apiUrl: '  ' }],
    ['apiUrl que não é texto', { apiUrl: 42 }],
    ['pagamentosHabilitados que não é booleano', { apiUrl: '/api', pagamentosHabilitados: 'sim' }],
    ['lista', []],
    ['nulo', null],
  ])('WEB-NAV-010: configuração inválida (%s) é recusada', (_caso, valor) => {
    expect(validarConfiguracao(valor)).toBeNull();
  });

  it('WEB-NAV-010: arquivo ausente, JSON quebrado ou falha de rede não viram configuração', async () => {
    expect(await carregarConfiguracao(respostaCom('', 404))).toBeNull();
    expect(await carregarConfiguracao(respostaCom('{quebrado'))).toBeNull();
    expect(
      await carregarConfiguracao(
        vi.fn(async () => Promise.reject(new TypeError('rede'))) as unknown as typeof fetch,
      ),
    ).toBeNull();
  });

  it('WEB-NAV-010: sem configuração, a página mostra o erro no lugar do app', () => {
    document.body.innerHTML = '<app-root></app-root>';

    mostrarErroDeConfiguracao();

    const aviso = document.querySelector('[role="alert"]');
    expect(aviso?.textContent).toBe(MENSAGEM_SEM_CONFIGURACAO);
    expect(document.querySelector('app-root')).toBeNull();
  });
});
