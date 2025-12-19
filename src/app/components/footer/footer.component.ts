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
    { name: 'Facebook', url: 'https://www.facebook.com/people/Re%C3%AFki-Sens/61585529754249/', icon: 'assets/icons/facebook.png' },
    { name: 'Instagram', url: 'https://www.instagram.com/reikietsens?igsh=MXczdHdwcjExdTg1cQ==', icon: 'assets/icons/instagram.png' },
  ];

  quickLinks = [
    { name: 'Accueil', url: '/home' },
    { name: 'Contact', url: '/contact' }
  ];
}
