import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { DefaultRedirectGuard } from '../../core/guards/default-redirect.guard';
import { MenuAccessGuard } from '../../core/guards/menu-access.guard';
import { NoAccessComponent } from './pages/no-access/no-access.component';

const routes: Routes = [
  {
    path: 'no-access',
    component: LayoutComponent,
    children: [{ path: '', component: NoAccessComponent }],
  },
  {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    loadChildren: () => import('../dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'engine',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    loadChildren: () => import('../engine/engine.routes').then((m) => m.engineRoutes),
  },
  {
    path: 'profile',
    component: LayoutComponent,
    loadChildren: () => import('../profile/profile.module').then((m) => m.ProfileModule),
  },
  {
    // Catches every top-level menu segment dynamically (e.g. /settings, /academic, /finance …).
    // MenuAccessGuard resolves the menu by matching the URL segment against permitted route_paths —
    // no hardcoded path→code mapping needed here.
    path: ':menu',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    loadChildren: () => import('../dynamic/dynamic.module').then((m) => m.DynamicModule),
  },
  {
    path: '',
    canActivate: [DefaultRedirectGuard],
    children: [],
  },
  { path: '**', redirectTo: 'errors/404' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
