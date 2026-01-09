import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent as OldDashboardComponent } from './pages/dashboard/dashboard.component';
import { Dashboard } from './paginas/dashboard/dashboard';
import { Mural } from './paginas/mural/mural';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'boards-old', component: OldDashboardComponent },
    { path: 'boards', component: Dashboard },
    { path: 'board/:id', component: Mural },
    { path: '', component: Dashboard, pathMatch: 'full' }
];
