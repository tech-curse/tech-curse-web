import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  CanMatchFn,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
} from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';
import { Role } from './jwt';

export function roleGuard(roles: Role[]): CanActivateFn & CanMatchFn {
  return async (
    _rotaOuRoute: ActivatedRouteSnapshot | Route,
    segmentosOuEstado: UrlSegment[] | RouterStateSnapshot,
  ) => {
    const auth = inject(AutenticacaoService);
    const router = inject(Router);
    await auth.garantirSessao();
    const atual = auth.role();

    if (atual === null) {
      const returnUrl = Array.isArray(segmentosOuEstado)
        ? '/' + segmentosOuEstado.map((s) => s.path).join('/')
        : segmentosOuEstado.url;
      return router.createUrlTree(['/entrar'], { queryParams: { returnUrl } });
    }

    return roles.includes(atual) ? true : router.createUrlTree(['/sem-permissao']);
  };
}
