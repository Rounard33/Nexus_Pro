import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="maintenance-container">
      <!-- Background shapes comme sur le site -->
      <div class="background">
        <div class="gradient"></div>
        <div class="shapes">
          <div class="shape shape-1"></div>
          <div class="shape shape-2"></div>
          <div class="shape shape-3"></div>
        </div>
      </div>
      
      <div class="maintenance-content">
        <div class="logo">
          <img src="assets/logo/logo-white.png" alt="Reiki & Sens" />
        </div>
        
        <h1>Site en construction</h1>
        
        <div class="divider">
          <span class="line"></span>
        </div>
        
        <p class="message">
          Nous préparons quelque chose de beau pour vous.<br>
          Revenez très bientôt !
        </p>
        
        <div class="contact-info">
          <a href="https://www.instagram.com/reikietsens?igsh=MXczdHdwcjExdTg1cQ==" target="_blank" rel="noopener" class="contact-link">
            <span class="emoji">📱</span>
            <span>&#64;reikietsens</span>
          </a>
        </div>
        
        <div class="decoration">
          <span>✨</span>
          <span>🌿</span>
          <span>✨</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:wght@300;400;500;600;700&family=Lato:wght@300;400;700&display=swap');
    
    .maintenance-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1520 0%, #2d2436 30%, #1e1a24 70%, #151218 100%);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    
    /* Étoiles scintillantes */
    .maintenance-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.4), transparent),
        radial-gradient(1.5px 1.5px at 90px 40px, rgba(184, 168, 137, 0.8), transparent),
        radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.4), transparent),
        radial-gradient(1.5px 1.5px at 250px 90px, rgba(184, 168, 137, 0.6), transparent),
        radial-gradient(1px 1px at 300px 150px, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 70px 200px, rgba(255,255,255,0.3), transparent),
        radial-gradient(1px 1px at 180px 220px, rgba(255,255,255,0.4), transparent);
      background-repeat: repeat;
      background-size: 350px 250px;
      animation: twinkle 8s ease-in-out infinite;
      z-index: 1;
    }
    
    @keyframes twinkle {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    
    /* Background décoratif */
    .background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      overflow: hidden;
    }
    
    .gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 30%, rgba(184, 168, 137, 0.06) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(139, 122, 98, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(74, 63, 53, 0.08) 0%, transparent 60%);
    }
    
    .shapes {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }
    
    .shape {
      position: absolute;
      background: rgba(184, 168, 137, 0.05);
      border-radius: 50%;
      animation: shape-float 12s ease-in-out infinite;
    }
    
    .shape-1 {
      width: 400px;
      height: 400px;
      top: -100px;
      right: -100px;
      animation-delay: 0s;
    }
    
    .shape-2 {
      width: 300px;
      height: 300px;
      bottom: -50px;
      left: -50px;
      animation-delay: 4s;
    }
    
    .shape-3 {
      width: 200px;
      height: 200px;
      top: 50%;
      left: 10%;
      animation-delay: 8s;
    }
    
    @keyframes shape-float {
      0%, 100% { 
        transform: translateY(0px) scale(1);
        opacity: 0.5;
      }
      50% { 
        transform: translateY(-30px) scale(1.05);
        opacity: 0.7;
      }
    }
    
    .maintenance-content {
      text-align: center;
      max-width: 600px;
      position: relative;
      z-index: 10;
      animation: fadeIn 1.2s ease-out;
    }
    
    .logo img {
      filter: drop-shadow(0 0 30px rgba(184, 168, 137, 0.3));
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .logo img {
      width: 150px;
      height: auto;
      margin-bottom: 40px;
      animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 3.5rem;
      font-weight: 400;
      color: #e8dfd0;
      margin: 0 0 25px 0;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .divider .line {
      width: 200px;
      height: 1px;
      background: linear-gradient(90deg, transparent, #b8a889, transparent);
    }
    
    .message {
      font-family: 'Lato', sans-serif;
      font-size: 1.25rem;
      font-weight: 300;
      color: #c9bfb0;
      line-height: 2;
      margin-bottom: 50px;
    }
    
    .contact-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      margin-bottom: 50px;
    }
    
    .contact-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #d4c8b8;
      text-decoration: none;
      font-family: 'Lato', sans-serif;
      font-size: 1.1rem;
      font-weight: 400;
      transition: all 0.3s ease;
      padding: 12px 30px;
      border-radius: 50px;
      background: rgba(184, 168, 137, 0.1);
      border: 1px solid rgba(184, 168, 137, 0.25);
    }
    
    .contact-link:hover {
      color: #f5efe5;
      background: rgba(184, 168, 137, 0.2);
      border-color: rgba(184, 168, 137, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(184, 168, 137, 0.2);
    }
    
    .contact-link .emoji {
      font-size: 1.2rem;
    }
    
    .decoration {
      display: flex;
      justify-content: center;
      gap: 30px;
      font-size: 1.5rem;
      opacity: 0.8;
    }
    
    .decoration span {
      animation: sparkle 3s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
    }
    
    .decoration span:nth-child(1) { animation-delay: 0s; }
    .decoration span:nth-child(2) { animation-delay: 0.5s; }
    .decoration span:nth-child(3) { animation-delay: 1s; }
    
    @keyframes sparkle {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    
    @media (max-width: 768px) {
      .shape-1 {
        width: 200px;
        height: 200px;
        top: -50px;
        right: -50px;
      }
      
      .shape-2 {
        width: 150px;
        height: 150px;
        bottom: -25px;
        left: -25px;
      }
      
      .shape-3 {
        width: 100px;
        height: 100px;
      }
      
      .logo img {
        width: 200px;
        margin-bottom: 30px;
      }
      
      h1 {
        font-size: 2.5rem;
      }
      
      .message {
        font-size: 1.1rem;
        line-height: 1.8;
        padding: 0 20px;
      }
      
      .contact-link {
        font-size: 1rem;
        padding: 10px 25px;
      }
    }
    
    @media (max-width: 480px) {
      h1 {
        font-size: 2rem;
      }
      
      .logo img {
        width: 160px;
      }
      
      .message {
        font-size: 1rem;
      }
      
      .divider .line {
        width: 50px;
      }
    }
  `]
})
export class MaintenanceComponent {}
