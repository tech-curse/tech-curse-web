import { CHAVE_SESSAO, gravarSessao, lerSessao, limparSessao, Sessao } from './sessao';

const sessao: Sessao = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: '2026-10-09T12:00:00Z',
};

describe('sessao', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('WEB-AUTH-016: grava e lê a sessão na chave tech-curse.sessao', () => {
    gravarSessao(sessao);

    expect(CHAVE_SESSAO).toBe('tech-curse.sessao');
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null')).toEqual(sessao);
    expect(lerSessao()).toEqual(sessao);
  });

  it('WEB-AUTH-016: valor que não é JSON vale como ausência de sessão', () => {
    localStorage.setItem(CHAVE_SESSAO, '{quebrado');

    expect(lerSessao()).toBeNull();
  });

  it('WEB-AUTH-016: sessão sem um dos campos vale como ausência de sessão', () => {
    for (const campo of ['accessToken', 'refreshToken', 'expiresAt'] as const) {
      const incompleta: Partial<Sessao> = { ...sessao };
      delete incompleta[campo];
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(incompleta));

      expect(lerSessao()).toBeNull();
    }
  });

  it('WEB-AUTH-019: limpar apaga a sessão gravada', () => {
    gravarSessao(sessao);

    limparSessao();

    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('WEB-AUTH-018: sem localStorage, gravar, ler e limpar não lançam erro', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('armazenamento bloqueado');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('armazenamento bloqueado');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('armazenamento bloqueado');
    });

    expect(() => gravarSessao(sessao)).not.toThrow();
    expect(lerSessao()).toBeNull();
    expect(() => limparSessao()).not.toThrow();
  });
});
