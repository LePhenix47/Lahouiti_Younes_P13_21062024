import { Routes } from '@angular/router';
import { NotFoundComponent } from '@pages/404/not-found/not-found.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Monde de Dév',
    component: null,
  },
  {
    path: '/support',
    title: 'Monde de Dév',
    component: null,
  },
  {
    path: '**',
    title: 'Error 404, page not found !',
    component: NotFoundComponent,
  },
];
