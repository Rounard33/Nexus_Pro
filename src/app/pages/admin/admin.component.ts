import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  currentUser: any = null;
  activeTab: string = 'dashboard';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
}

