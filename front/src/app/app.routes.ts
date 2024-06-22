import { Routes } from '@angular/router';
import { NotFoundComponent } from '@pages/404/not-found/not-found.component';
import { AccessSupportComponent } from '@pages/access-support/access-support.component';
import { SupportComponent } from '@pages/support/support.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Access support',
    component: AccessSupportComponent,
  },
  {
    path: 'support',
    title: 'Support chat',
    component: SupportComponent,
  },
  {
    path: '**',
    title: 'Error 404, page not found !',
    component: NotFoundComponent,
  },
];
