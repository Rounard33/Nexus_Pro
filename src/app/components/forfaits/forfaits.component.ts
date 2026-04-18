import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Output} from '@angular/core';
import {FORFAITS_CATALOG, ForfaitCatalogEntry} from '../../data/forfaits.catalog';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export type Forfait = ForfaitCatalogEntry;

@Component({
  selector: 'app-forfaits',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './forfaits.component.html',
  styleUrl: './forfaits.component.scss'
})
export class ForfaitsComponent {
  @Output() scrollToPrestation = new EventEmitter<string>();

  readonly forfaits: ForfaitCatalogEntry[] = FORFAITS_CATALOG;

  faqItems = [
    { question: 'Qu\'est-ce que le Reiki ?', prestationKeyword: 'reiki' },
    { question: 'Qu\'est-ce que le massage crânien énergétique ?', prestationKeyword: 'crânien' },
    { question: 'Qu\'est-ce que la PNL ?', prestationKeyword: 'pnl' }
  ];

  onFaqClick(keyword: string): void {
    this.scrollToPrestation.emit(keyword);
  }
}
