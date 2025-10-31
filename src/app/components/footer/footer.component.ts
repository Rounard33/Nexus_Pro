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
    { name: 'Facebook', url: '#', icon: 'assets/icons/facebook.png' },
    { name: 'Instagram', url: '#', icon: 'assets/icons/instagram.png' },
  ];

  quickLinks = [
    { name: 'Accueil', url: '/' },
    { name: 'À propos', url: '/about' },
    { name: 'Services', url: '/services' },
    { name: 'Portfolio', url: '/portfolio' },
    { name: 'Contact', url: '/contact' }
  ];
}
