import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './componentes/toast/toast.component';
import { DialogComponent } from './componentes/dialog/dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, DialogComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
    <app-dialog></app-dialog>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'muralia-front';
}