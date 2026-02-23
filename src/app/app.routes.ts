import {Routes} from '@angular/router';
import {adminGuard} from './guards/admin.guard';
import {maintenanceGuard, maintenancePageGuard} from './guards/maintenance.guard';

export const routes: Routes = [
  // Page de maintenance (accessible uniquement si le mode est activé)
  { 
    path: 'maintenance', 
    loadComponent: () => import('./pages/maintenance/maintenance.component').then(m => m.MaintenanceComponent),
    canActivate: [maintenancePageGuard]
  },
  
  // Routes publiques (protégées par le guard de maintenance)
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent), canActivate: [maintenanceGuard] },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent), canActivate: [maintenanceGuard] },
  { path: 'cgu', loadComponent: () => import('./pages/cgu/cgu.component').then(m => m.CguComponent), canActivate: [maintenanceGuard] },
  { path: 'cgv', loadComponent: () => import('./pages/cgv/cgv.component').then(m => m.CgvComponent), canActivate: [maintenanceGuard] },
  { path: 'politique-confidentialite', loadComponent: () => import('./pages/politique-confidentialite/politique-confidentialite.component').then(m => m.PolitiqueConfidentialiteComponent), canActivate: [maintenanceGuard] },
  { path: 'mentions-legales', loadComponent: () => import('./pages/mentions-legales/mentions-legales.component').then(m => m.MentionsLegalesComponent), canActivate: [maintenanceGuard] },
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
        path: 'agenda', 
        loadComponent: () => import('./pages/admin/agenda/agenda.component').then(m => m.AgendaComponent) 
      },
      { 
        path: 'statistics', 
        loadComponent: () => import('./pages/admin/statistics/statistics.component').then(m => m.StatisticsComponent) 
      },
      { 
        path: 'accounting', 
        loadComponent: () => import('./pages/admin/accounting/accounting.component').then(m => m.AccountingComponent) 
      },
      { 
        path: 'hours', 
        loadComponent: () => import('./pages/admin/hours/hours.component').then(m => m.HoursComponent) 
      },
      { 
        path: 'blocked-slots', 
        loadComponent: () => import('./pages/admin/blocked-slots/blocked-slots.component').then(m => m.BlockedSlotsComponent) 
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
