import {Directive, OnDestroy, OnInit} from '@angular/core';
import {BodyScrollLockService} from '../services/body-scroll-lock.service';

/** À placer sur l’overlay racine d’une modale (*ngIf) : verrouille le scroll du fond. */
@Directive({
  selector: '[appBodyScrollLock]',
  standalone: true
})
export class BodyScrollLockDirective implements OnInit, OnDestroy {
  constructor(private readonly bodyScrollLock: BodyScrollLockService) {}

  ngOnInit(): void {
    this.bodyScrollLock.push();
  }

  ngOnDestroy(): void {
    this.bodyScrollLock.pop();
  }
}
