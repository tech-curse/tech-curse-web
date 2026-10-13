import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CONFIGURACAO } from '../configuracao/configuracao';

@Injectable({ providedIn: 'root' })
export class AlunoApiService {
  private readonly apiUrl = inject(CONFIGURACAO).apiUrl;
  private readonly http = inject(HttpClient);

  async atualizarNome(id: number, nome: string): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/Student/${id}`, { nome }));
  }
}
