import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { CONFIGURACAO } from '../../core/configuracao/configuracao';
import { AlunoLayoutComponent } from './aluno-layout/aluno-layout';
import { MeusCursosComponent } from './meus-cursos/meus-cursos';
import { MeusPagamentosComponent } from './meus-pagamentos/meus-pagamentos';
import { PerfilComponent } from './perfil/perfil';

export const ALUNO_ROUTES: Routes = [
  {
    path: '',
    component: AlunoLayoutComponent,
    children: [
      { path: '', redirectTo: 'matriculas', pathMatch: 'full' },
      { path: 'matriculas', component: MeusCursosComponent },
      {
        path: 'pagamentos',
        component: MeusPagamentosComponent,
        canMatch: [() => inject(CONFIGURACAO).pagamentosHabilitados],
      },
      { path: 'perfil', component: PerfilComponent },
    ],
  },
];
