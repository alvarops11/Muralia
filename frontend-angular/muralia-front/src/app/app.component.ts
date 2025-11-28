// archivo: src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`, // HTML en línea
  styles: [] // <--- CSS en línea (vacío por ahora)
})
export class AppComponent {
  title = 'muralia-front';
}