// archivo: src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // TRUCO: Usamos 'template' en vez de 'templateUrl' para no depender del archivo html
  template: `<router-outlet></router-outlet>`, 
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'muralia-front';
}