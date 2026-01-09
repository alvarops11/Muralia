import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent as OldDashboardComponent } from './pages/dashboard/dashboard.component';
import { Dashboard } from './paginas/dashboard/dashboard';
import { BoardDetailComponent } from './pages/board-detail/board-detail.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'boards-old', component: OldDashboardComponent },
    { path: 'boards', component: Dashboard },
    { path: 'board/:id', component: BoardDetailComponent },
    { path: '', component: Dashboard, pathMatch: 'full' }
];
