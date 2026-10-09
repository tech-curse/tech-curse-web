import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SENHA_FORTE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export const senhaForteValidator: ValidatorFn = (
  controle: AbstractControl,
): ValidationErrors | null => {
  const valor = controle.value as string;
  return !valor || SENHA_FORTE.test(valor) ? null : { senhaForte: true };
};

export const senhasIguaisValidator: ValidatorFn = (
  grupo: AbstractControl,
): ValidationErrors | null => {
  const senha = grupo.get('senha')?.value;
  const confirmacao = grupo.get('confirmacaoSenha')?.value;
  return senha === confirmacao ? null : { senhasDiferentes: true };
};
