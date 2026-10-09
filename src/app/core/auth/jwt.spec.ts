import { extrairUsuario } from './jwt';

function base64Url(valor: object): string {
  return btoa(JSON.stringify(valor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function token(payload: object): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.assinatura`;
}

describe('jwt', () => {
  it('WEB-AUTH-017: extrai id, e-mail e papel das claims com nomes curtos', () => {
    const usuario = extrairUsuario(
      token({ nameid: '42', email: 'ana@exemplo.com', role: 'Student' }),
    );

    expect(usuario).toEqual({ id: '42', email: 'ana@exemplo.com', role: 'Student' });
  });

  it('WEB-AUTH-017: aceita as claims com os nomes longos de URI do .NET', () => {
    const usuario = extrairUsuario(
      token({
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '7',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'bia@exemplo.com',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin',
      }),
    );

    expect(usuario).toEqual({ id: '7', email: 'bia@exemplo.com', role: 'Admin' });
  });

  it('WEB-AUTH-017: papel desconhecido não vale como sessão', () => {
    expect(extrairUsuario(token({ nameid: '1', email: 'x@exemplo.com', role: 'Root' }))).toBeNull();
  });

  it('WEB-AUTH-017: token sem id ou sem e-mail não vale como sessão', () => {
    expect(extrairUsuario(token({ email: 'x@exemplo.com', role: 'Student' }))).toBeNull();
    expect(extrairUsuario(token({ nameid: '1', role: 'Student' }))).toBeNull();
  });

  it('WEB-AUTH-017: valor que não é um JWT não vale como sessão', () => {
    expect(extrairUsuario('nao-e-um-jwt')).toBeNull();
    expect(extrairUsuario('a.b.c')).toBeNull();
  });
});
