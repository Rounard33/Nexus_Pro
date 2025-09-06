import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';

@Component({
  selector: 'app-animated-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-stats.component.html',
  styleUrl: './animated-stats.component.scss'
})
export class AnimatedStatsComponent implements OnInit, OnDestroy {
  stats = [
    {
      number: 150,
      suffix: '+',
      label: 'Projets Réalisés',
      icon: '🚀',
      color: 'primary'
    },
    {
      number: 50,
      suffix: '+',
      label: 'Clients Satisfaits',
      icon: '😊',
      color: 'secondary'
    },
    {
      number: 5,
      suffix: '+',
      label: 'Années d\'Expérience',
      icon: '⭐',
      color: 'accent'
    },
    {
      number: 99,
      suffix: '%',
      label: 'Taux de Réussite',
      icon: '🎯',
      color: 'success'
    }
  ];

  animatedStats: any[] = [];
  private animationInterval: any;

  ngOnInit(): void {
    this.initializeStats();
    this.startAnimation();
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }

  private initializeStats(): void {
    this.animatedStats = this.stats.map(stat => ({
      ...stat,
      currentNumber: 0,
      isAnimating: false
    }));
  }

  private startAnimation(): void {
    // Animate stats one by one with a delay
    this.animatedStats.forEach((stat, index) => {
      setTimeout(() => {
        this.animateStat(stat);
      }, index * 200);
    });
  }

  private animateStat(stat: any): void {
    stat.isAnimating = true;
    const duration = 2000; // 2 secondes
    const startTime = Date.now();
    const startValue = 0;
    const endValue = stat.number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function pour un effet plus naturel
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      stat.currentNumber = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        stat.isAnimating = false;
      }
    };

    requestAnimationFrame(animate);
  }

  getStatColorClass(color: string): string {
    return `stat-${color}`;
  }
}
