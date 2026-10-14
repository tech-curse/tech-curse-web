import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';
import { rotaInicialPorRole } from './rota-inicial';

export const anonimoGuard: CanActivateFn = async () => {
  const auth = inject(AutenticacaoService);
  const router = inject(Router);
  return (await auth.garantirSessao())
    ? router.createUrlTree([rotaInicialPorRole(auth.role())])
    : true;
};
