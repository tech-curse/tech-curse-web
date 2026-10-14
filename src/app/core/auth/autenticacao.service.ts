import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CONFIGURACAO } from '../configuracao/configuracao';
import { SILENCIAR_ERRO } from '../http/erro.interceptor';
import { Role, Usuario, extrairUsuario } from './jwt';

export interface DadosRegistro {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
}

interface SessaoDaApi {
  accessToken: string;
  expiresAt: string;
}

export const CHAVE_ANTIGA_DA_SESSAO = 'tech-curse.sessao';
export const TRAVA_DA_RENOVACAO = 'tech-curse.renovacao';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly apiUrl = inject(CONFIGURACAO).apiUrl;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = signal<SessaoDaApi | null>(null);
  private renovacaoEmAndamento: Promise<void> | null = null;
  private semSessaoNoServidor = false;

  readonly accessToken = computed(() => this.sessao()?.accessToken ?? null);
  readonly usuario = computed<Usuario | null>(() => {
    const token = this.accessToken();
    return token ? extrairUsuario(token) : null;
  });
  readonly role = computed<Role | null>(() => this.usuario()?.role ?? null);
  readonly estaAutenticado = computed(() => {
    const sessao = this.sessao();
    return !!sessao && !!this.usuario() && new Date(sessao.expiresAt).getTime() > Date.now();
  });

  constructor() {
    try {
      localStorage.removeItem(CHAVE_ANTIGA_DA_SESSAO);
    } catch {}
  }

  async entrar(email: string, senha: string): Promise<void> {
    const resposta = await firstValueFrom(
      this.http.post<SessaoDaApi>(`${this.apiUrl}/Auth/login`, { email, password: senha }),
    );
    this.aplicarSessao(resposta);
  }

  async registrar(dados: DadosRegistro): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/Auth/register`, {
        name: dados.nome.trim(),
        email: dados.email,
        password: dados.senha,
        confirmPassword: dados.confirmacaoSenha,
      }),
    );
  }

  async garantirSessao(): Promise<boolean> {
    if (this.estaAutenticado()) return true;
    if (this.semSessaoNoServidor) return false;
    try {
      await this.renovar();
    } catch {
      return false;
    }
    return this.estaAutenticado();
  }

  renovar(): Promise<void> {
    if (this.renovacaoEmAndamento) return this.renovacaoEmAndamento;
    this.renovacaoEmAndamento = this.comTravaEntreAbas(() =>
      firstValueFrom(
        this.http.post<SessaoDaApi>(`${this.apiUrl}/Auth/refresh`, null, {
          context: new HttpContext().set(SILENCIAR_ERRO, true),
        }),
      ),
    )
      .then((resposta) => this.aplicarSessao(resposta))
      .catch((erro: unknown) => {
        this.encerrarSessao();
        throw erro;
      })
      .finally(() => (this.renovacaoEmAndamento = null));
    return this.renovacaoEmAndamento;
  }

  async sair(returnUrl?: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/Auth/logout`, null, {
          context: new HttpContext().set(SILENCIAR_ERRO, true),
        }),
      );
    } catch {}
    this.encerrarSessao();
    const extras = returnUrl ? { queryParams: { returnUrl } } : {};
    await this.router.navigate(['/entrar'], extras);
  }

  encerrarSessao(): void {
    this.sessao.set(null);
    this.semSessaoNoServidor = true;
  }

  private comTravaEntreAbas<T>(acao: () => Promise<T>): Promise<T> {
    return 'locks' in navigator ? navigator.locks.request(TRAVA_DA_RENOVACAO, acao) : acao();
  }

  private aplicarSessao(resposta: SessaoDaApi): void {
    this.sessao.set({ accessToken: resposta.accessToken, expiresAt: resposta.expiresAt });
    this.semSessaoNoServidor = false;
  }
}
