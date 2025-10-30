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
    this.showSuccessMessage();
    
    // Reset form
    this.contactForm = {
      name: '',
      email: '',
      company: '',
      subject: '',
      message: ''
    };
  }

  private showSuccessMessage(): void {
    // Create a custom success notification instead of alert
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">✅</span>
        <span>Thank you for your message! We will get back to you soon.</span>
      </div>
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 4000);
  }
}
