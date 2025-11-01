import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-to-top.component.html',
  styleUrl: './scroll-to-top.component.scss'
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  showScrollTopButton = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    window.addEventListener('scroll', this.onWindowScroll.bind(this));
    this.onWindowScroll();
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onWindowScroll.bind(this));
  }

  private onWindowScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const shouldShow = scrollPosition > 300;
    if (this.showScrollTopButton !== shouldShow) {
      this.showScrollTopButton = shouldShow;
      this.cdr.detectChanges();
    }
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
