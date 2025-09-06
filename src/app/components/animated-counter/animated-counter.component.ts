import {CommonModule} from '@angular/common';
import {Component, Input, OnDestroy, OnInit} from '@angular/core';

@Component({
  selector: 'app-animated-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="counter-container">
      <span class="counter-number">{{ displayValue }}</span>
      <span class="counter-suffix" *ngIf="suffix">{{ suffix }}</span>
    </div>
  `,
  styleUrl: './animated-counter.component.scss'
})
export class AnimatedCounterComponent implements OnInit, OnDestroy {
  @Input() targetValue: number | string = 0;
  @Input() duration: number = 2000;
  @Input() suffix: string = '';
  @Input() startAnimation: boolean = false;

  displayValue: number = 0;
  private animationId: number | null = null;
  private startTime: number = 0;

  ngOnInit(): void {
    if (this.startAnimation) {
      this.startCountAnimation();
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  startCountAnimation(): void {
    this.startTime = performance.now();
    this.animate();
  }

  private animate(): void {
    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Easing function for smooth animation
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOutCubic(progress);
    
    const numericTarget = typeof this.targetValue === 'string' ? parseInt(this.targetValue) : this.targetValue;
    this.displayValue = Math.floor(numericTarget * easedProgress);
    
    if (progress < 1) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.displayValue = numericTarget;
    }
  }
}
