import {CommonModule} from '@angular/common';
import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {Router} from '@angular/router';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Prestation {
  id?: string;
  name: string;
  price: string;
  atHome?: string;
  duration?: string;
  priceOption?: string;
  shortDescription?: string;
  description: string;
  image: string;
  requiresContact?: boolean;
  hasContraindications?: boolean;
  contraindications?: string;
  forfaitSuggestion?: string;
}

/** Regroupe plusieurs prestations Reiki en une seule carte + modale à onglets. */
export interface PrestationGroup {
  kind: 'group';
  groupKey: 'reiki';
  cardTitle: string;
  /** Texte court sous la photo (carte uniquement). */
  shortDescription?: string;
  image: string;
  variants: Prestation[];
  forfaitSuggestion?: string;
}

export function isPrestationGroup(p: Prestation | PrestationGroup): p is PrestationGroup {
  return (p as PrestationGroup).kind === 'group';
}

/** Ordre d’affichage : Usui → Animaux → À distance */
export function reikiVariantSortOrder(p: Prestation): number {
  const n = p.name.toLowerCase();
  if (n.includes('animal') || n.includes('animaux')) {
    return 1;
  }
  if (n.includes('distance')) {
    return 2;
  }
  return 0;
}

export function reikiTabLabel(p: Prestation): string {
  const n = p.name.toLowerCase();
  if (n.includes('animal') || n.includes('animaux')) {
    return 'Animaux';
  }
  if (n.includes('distance')) {
    return 'À distance';
  }
  return 'Usui';
}

/**
 * Fusionne les lignes « Reiki » en une carte groupe si au moins deux variantes.
 * L’ordre d’insertion suit la liste d’origine (la carte groupe remplace la 1ʳᵉ occurrence Reiki).
 */
export function buildPrestationCards(prestations: Prestation[]): (Prestation | PrestationGroup)[] {
  const reiki: Prestation[] = [];
  for (const p of prestations) {
    if (/reiki/i.test(p.name)) {
      reiki.push(p);
    }
  }
  if (reiki.length < 2) {
    return [...prestations];
  }
  reiki.sort((a, b) => reikiVariantSortOrder(a) - reikiVariantSortOrder(b));

  const forfaitSuggestion =
    reiki.find(v => v.name.toLowerCase().includes('usui'))?.forfaitSuggestion ?? reiki[0]?.forfaitSuggestion;

  const group: PrestationGroup = {
    kind: 'group',
    groupKey: 'reiki',
    cardTitle: 'Reiki',
    shortDescription:
      'Séances Usui au cabinet, sur les animaux ou à distance — choisissez le format au moment de la réservation.',
    image: reiki[0].image,
    variants: reiki,
    forfaitSuggestion
  };

  const result: (Prestation | PrestationGroup)[] = [];
  let inserted = false;
  for (const p of prestations) {
    if (/reiki/i.test(p.name)) {
      if (!inserted) {
        result.push(group);
        inserted = true;
      }
      continue;
    }
    result.push(p);
  }
  return result;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent {
  /** Liste plate ou avec un groupe Reiki fusionné (voir `buildPrestationCards`). */
  @Input() prestations: (Prestation | PrestationGroup)[] = [];
  @Output() openDetails = new EventEmitter<Prestation | PrestationGroup>();
  @Output() openBooking = new EventEmitter<Prestation>();
  /** Carte groupe Reiki uniquement : ouvre la modale de choix de séance avant réservation. */
  @Output() openGroupBooking = new EventEmitter<PrestationGroup>();

  private router = inject(Router);

  isGroup(p: Prestation | PrestationGroup): p is PrestationGroup {
    return isPrestationGroup(p);
  }

  /** Utilisé dans le template pour typer la carte hors groupe. */
  asSingle(p: Prestation | PrestationGroup): Prestation | null {
    return isPrestationGroup(p) ? null : p;
  }

  onBookingClick(prestation: Prestation): void {
    if (prestation.requiresContact) {
      this.router.navigate(['/contact']);
    } else {
      this.openBooking.emit(prestation);
    }
  }

  onGroupDetails(group: PrestationGroup): void {
    this.openDetails.emit(group);
  }

  onGroupBookingClick(group: PrestationGroup): void {
    this.openGroupBooking.emit(group);
  }

  scrollToForfaits(): void {
    const element = document.getElementById('forfaits');
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - headerHeight, behavior: 'smooth' });
    }
  }
}
