import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';

export const autenticadoGuard: CanActivateFn = async (_rota, estado) => {
  const auth = inject(AutenticacaoService);
  const router = inject(Router);

  if (await auth.garantirSessao()) return true;

  return router.createUrlTree(['/entrar'], { queryParams: { returnUrl: estado.url } });
};
