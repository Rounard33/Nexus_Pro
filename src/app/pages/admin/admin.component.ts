import {CommonModule} from '@angular/common';
import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import {BodyScrollLockService} from '../../services/body-scroll-lock.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  activeTab: string = 'dashboard';
  sidebarOpen: boolean = false;

  /** True si ce composant a appelé push() pour la sidebar mobile. */
  private sidebarScrollLockActive = false;

  constructor(
    private authService: AuthService,
    private bodyScrollLock: BodyScrollLockService
  ) {}

  ngOnDestroy(): void {
    if (this.sidebarScrollLockActive) {
      this.bodyScrollLock.pop();
      this.sidebarScrollLockActive = false;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncBodyScrollLock();
  }

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
    // Fermer la sidebar sur mobile après sélection
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
      this.syncBodyScrollLock();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.syncBodyScrollLock();
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    this.syncBodyScrollLock();
  }

  /** Sur mobile : pas de scroll du contenu derrière la sidebar / overlay. */
  private syncBodyScrollLock(): void {
    const mobile = window.innerWidth <= 768;
    const shouldLock = mobile && this.sidebarOpen;
    if (shouldLock && !this.sidebarScrollLockActive) {
      this.bodyScrollLock.push();
      this.sidebarScrollLockActive = true;
    } else if (!shouldLock && this.sidebarScrollLockActive) {
      this.bodyScrollLock.pop();
      this.sidebarScrollLockActive = false;
    }
  }
}

