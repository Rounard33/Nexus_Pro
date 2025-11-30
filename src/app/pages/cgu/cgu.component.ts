import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-cgu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cgu.component.html',
  styleUrl: './cgu.component.scss'
})
export class CguComponent implements AfterViewInit, OnDestroy {
  @ViewChild('title') title!: ElementRef;
  @ViewChild('description') description!: ElementRef;

  lastUpdate = '01/12/2025';

  ngAfterViewInit(): void {
    this.initWelcomeAnimations();
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }

  private initWelcomeAnimations(): void {
    if (!this.title || !this.description) return;

    const tl = gsap.timeline({ delay: 0.3 });
    
    tl.from('.badge', {
      duration: 0.8,
      y: -30,
      opacity: 0,
      ease: "power2.out"
    });

    tl.from(this.title.nativeElement.querySelectorAll('.title-line'), {
      duration: 1.2,
      y: 50,
      opacity: 0,
      ease: "power3.out",
      stagger: 0.2
    }, "-=0.4");

    tl.from(this.description.nativeElement, {
      duration: 1,
      y: 30,
      opacity: 0,
      ease: "power2.out"
    }, "-=0.6");

    tl.from('.cgu-content', {
      duration: 0.8,
      y: 40,
      opacity: 0,
      ease: "power2.out"
    }, "-=0.4");
  }
}

