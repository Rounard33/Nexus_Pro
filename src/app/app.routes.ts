import {Routes} from '@angular/router';
import {adminGuard} from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent) },
  { 
    path: 'admin/login', 
    loadComponent: () => import('./pages/admin-login/admin-login.component').then(m => m.AdminLoginComponent) 
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'appointments', 
        loadComponent: () => import('./pages/admin/appointments/appointments.component').then(m => m.AppointmentsComponent) 
      },
      { 
        path: 'statistics', 
        loadComponent: () => import('./pages/admin/statistics/statistics.component').then(m => m.StatisticsComponent) 
      },
      { 
        path: 'hours', 
        loadComponent: () => import('./pages/admin/hours/hours.component').then(m => m.HoursComponent) 
      },
      { 
        path: 'clients', 
        loadComponent: () => import('./pages/admin/clients/clients.component').then(m => m.ClientsComponent) 
      },
      { 
        path: 'clients/:id', 
        loadComponent: () => import('./pages/admin/clients/client-detail/client-detail.component').then(m => m.ClientDetailComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '/home' } // Page 404 - redirige vers home
];
