import { InjectionToken } from '@angular/core';

export interface Configuracao {
  apiUrl: string;
  pagamentosHabilitados: boolean;
}

export const CONFIGURACAO = new InjectionToken<Configuracao>('CONFIGURACAO');

export const ENDERECO_DA_CONFIGURACAO = '/config.json';

export const MENSAGEM_SEM_CONFIGURACAO =
  'Não foi possível carregar a configuração do aplicativo. Tente novamente mais tarde.';

export function validarConfiguracao(valor: unknown): Configuracao | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null;
  const { apiUrl, pagamentosHabilitados } = valor as Record<string, unknown>;
  if (typeof apiUrl !== 'string' || apiUrl.trim() === '') return null;
  if (pagamentosHabilitados !== undefined && typeof pagamentosHabilitados !== 'boolean') {
    return null;
  }
  return {
    apiUrl: apiUrl.trim().replace(/\/+$/, ''),
    pagamentosHabilitados: pagamentosHabilitados ?? false,
  };
}

export async function carregarConfiguracao(
  buscar: typeof fetch = fetch,
): Promise<Configuracao | null> {
  try {
    const resposta = await buscar(ENDERECO_DA_CONFIGURACAO, { cache: 'no-store' });
    if (!resposta.ok) return null;
    return validarConfiguracao(await resposta.json());
  } catch {
    return null;
  }
}

export function mostrarErroDeConfiguracao(documento: Document = document): void {
  const aviso = documento.createElement('p');
  aviso.setAttribute('role', 'alert');
  aviso.textContent = MENSAGEM_SEM_CONFIGURACAO;
  aviso.style.cssText = 'font-family: system-ui, sans-serif; margin: 4rem auto; max-width: 32rem;';
  documento.body.replaceChildren(aviso);
}
