import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {ContentService, GiftCard} from '../../../services/content.service';
import {NotificationService} from '../../../services/notification.service';
import {GiftCardFormModalComponent} from '../../../components/gift-card-form-modal/gift-card-form-modal.component';

@Component({
  selector: 'app-gift-cards',
  standalone: true,
  imports: [CommonModule, GiftCardFormModalComponent],
  templateUrl: './gift-cards.component.html',
  styleUrl: './gift-cards.component.scss'
})
export class GiftCardsComponent implements OnInit {
  cards: GiftCard[] = [];
  isLoading = false;
  showModal = false;
  editingCard: GiftCard | null = null;

  constructor(
    private contentService: ContentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCards();
  }

  loadCards(): void {
    this.isLoading = true;
    this.contentService.getGiftCards().subscribe({
      next: (data) => {
        this.cards = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.cards = [];
        this.isLoading = false;
        this.notificationService.error('Impossible de charger les cartes cadeaux.');
      }
    });
  }

  openCreate(): void {
    this.editingCard = null;
    this.showModal = true;
  }

  openEdit(card: GiftCard): void {
    if (!card.id) return;
    this.editingCard = card;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCard = null;
  }

  toggleUsed(card: GiftCard, used: boolean): void {
    if (!card.id) return;
    this.contentService.updateGiftCard(card.id, { used }).subscribe({
      next: (updated) => {
        const i = this.cards.findIndex((c) => c.id === card.id);
        if (i !== -1) {
          this.cards[i] = updated;
        }
        this.notificationService.success(used ? 'Marquée comme utilisée.' : 'Marquée comme non utilisée.');
      },
      error: () => this.notificationService.error('Impossible de mettre à jour le statut.')
    });
  }

  confirmDelete(card: GiftCard): void {
    if (!card.id || !confirm('Supprimer cette carte cadeau ?')) return;
    this.contentService.deleteGiftCard(card.id).subscribe({
      next: () => {
        this.cards = this.cards.filter((c) => c.id !== card.id);
        this.notificationService.success('Carte supprimée.');
      },
      error: () => this.notificationService.error('Suppression impossible.')
    });
  }

  isExpired(card: GiftCard): boolean {
    const end = new Date(card.valid_until + 'T23:59:59');
    return end < new Date() && !card.used;
  }
}
