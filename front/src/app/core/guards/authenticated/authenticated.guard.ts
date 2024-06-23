import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Username } from '@core/ngrx/actions/chat-info.actions';
import { Store } from '@ngrx/store';

export const authenticatedGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean => {
  const router = inject(Router);
  const store = inject(Store);

  const { username } = toSignal<Username>(store.select('chatUserInfo'))()!;

  if (username) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};
