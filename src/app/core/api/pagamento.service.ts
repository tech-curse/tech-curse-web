import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { CONFIGURACAO } from '../configuracao/configuracao';
import { Pagamento } from './modelos/pagamento';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

@Injectable({ providedIn: 'root' })
export class PagamentoService {
  private readonly apiUrl = inject(CONFIGURACAO).apiUrl;

  listarDoAluno(
    studentId: Signal<number | null>,
    parametros: Signal<ParametrosPaginacao>,
  ): HttpResourceRef<ResultadoPaginado<Pagamento> | undefined> {
    return httpResource<ResultadoPaginado<Pagamento>>(() => {
      const id = studentId();
      if (id === null) return undefined;
      const { pagina, tamanho } = parametros();
      return {
        url: `${this.apiUrl}/Payment/student/${id}`,
        params: { PageNumber: pagina, PageSize: tamanho },
      };
    });
  }
}
