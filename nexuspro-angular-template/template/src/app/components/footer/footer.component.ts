import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  socialLinks = [
    { name: 'Facebook', url: '#', icon: 'facebook' },
    { name: 'Twitter', url: '#', icon: 'twitter' },
    { name: 'LinkedIn', url: '#', icon: 'linkedin' },
    { name: 'Instagram', url: '#', icon: 'instagram' },
    { name: 'GitHub', url: '#', icon: 'github' }
  ];

  quickLinks = [
    { name: 'Accueil', url: '/' },
    { name: 'À propos', url: '/about' },
    { name: 'Services', url: '/services' },
    { name: 'Portfolio', url: '/portfolio' },
    { name: 'Contact', url: '/contact' }
  ];

  services = [
    { name: 'Développement Web', url: '/services/web-development' },
    { name: 'Design UI/UX', url: '/services/ui-ux-design' },
    { name: 'Applications Mobile', url: '/services/mobile-apps' },
    { name: 'Consultation', url: '/services/consultation' },
    { name: 'Maintenance', url: '/services/maintenance' }
  ];
}
