import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AnimationService} from '../../services/animation.service';
import {ParallaxService} from '../../services/parallax.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, AfterViewInit {
  constructor(
    private animationService: AnimationService,
    private parallaxService: ParallaxService
  ) {}

  ngOnInit(): void {
    // Initialization logic
  }

  ngAfterViewInit(): void {
    // Initialize animations after view is ready
    setTimeout(() => {
      this.initAnimations();
    }, 100);
  }

  private initAnimations(): void {
    // Initialize scroll animations
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    scrollElements.forEach(el => {
      this.animationService.observeElement(el);
    });

    // Initialize stagger animations
    const staggerElements = document.querySelectorAll('.stagger-item');
    staggerElements.forEach(el => {
      this.animationService.observeElement(el);
    });
  }

  contactInfo = {
    email: 'contact@nexuspro.com',
    phone: '+33 1 23 45 67 89',
    address: '123 Rue de la Tech, 75001 Paris, France'
  };

  socialLinks = [
    { name: 'LinkedIn', url: '#', icon: '💼' },
    { name: 'Twitter', url: '#', icon: '🐦' },
    { name: 'GitHub', url: '#', icon: '💻' },
    { name: 'Instagram', url: '#', icon: '📷' }
  ];

  contactForm = {
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  };

  onSubmit(): void {
    // Here you can add form submission logic
    // For demo purposes, we'll show a success message
    if (typeof window !== 'undefined') {
      alert('Thank you for your message! We will get back to you as soon as possible.');
    }
    
    // Reset form
    this.contactForm = {
      name: '',
      email: '',
      company: '',
      subject: '',
      message: ''
    };
  }
}
