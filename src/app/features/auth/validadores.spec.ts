import { FormControl } from '@angular/forms';
import { senhaForteValidator } from './validadores';

function valida(senha: string): boolean {
  return senhaForteValidator(new FormControl(senha)) === null;
}

describe('senhaForteValidator', () => {
  it('WEB-AUTH-006: aceita de 12 a 128 caracteres com as quatro classes', () => {
    expect(valida('Aa1@aaaaaaaa')).toBe(true);
    expect(valida('Aa1@' + 'x'.repeat(124))).toBe(true);
  });

  it.each([
    ['11 caracteres', 'Aa1@aaaaaaa'],
    ['129 caracteres', 'Aa1@' + 'x'.repeat(125)],
    ['sem minúscula', 'AA1@AAAAAAAA'],
    ['sem maiúscula', 'aa1@aaaaaaaa'],
    ['sem número', 'Aaa@aaaaaaaa'],
    ['sem símbolo', 'Aa1aaaaaaaaa'],
  ])('WEB-AUTH-006: recusa senha %s', (_caso, senha) => {
    expect(valida(senha)).toBe(false);
  });
});
