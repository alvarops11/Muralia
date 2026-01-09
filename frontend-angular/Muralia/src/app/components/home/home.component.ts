// file: src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    user: any = null;
    token: string | null = null;

    constructor(private authService: AuthService, private router: Router) { }

    ngOnInit(): void {
        this.user = this.authService.getUser();
        this.token = this.authService.getToken();
    }

    logout(): void {
        this.authService.logout();
    }
}
