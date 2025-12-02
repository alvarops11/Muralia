// archivo: src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { BoardDetailComponent } from './pages/board-detail/board-detail.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'boards', component: DashboardComponent },
    { path: 'board/:id', component: BoardDetailComponent }, // El :id es clave
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];