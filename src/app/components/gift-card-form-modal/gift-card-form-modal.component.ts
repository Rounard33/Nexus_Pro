import {CommonModule} from '@angular/common';
import {Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Client, ContentService, GiftCard} from '../../services/content.service';

/** Libellé stocké côté API (champ requis) : le bénéficiaire choisit le soin au moment de la réservation. */
const DEFAULT_GIFT_SERVICE_LABEL = 'Soin au choix';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-gift-card-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gift-card-form-modal.component.html',
  styleUrl: './gift-card-form-modal.component.scss'
})
export class GiftCardFormModalComponent implements OnChanges {
  @Input() visible = false;
  /** Mode édition : carte existante */
  @Input() editingCard: GiftCard | null = null;
  /** Depuis la fiche client : acheteur imposé (pas de sélecteur) */
  @Input() fixedBuyer: { name: string; email: string } | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  allClients: Client[] = [];
  saving = false;

  buyerPickerOpen = false;
  recipientPickerOpen = false;
  buyerFilter = '';
  recipientFilter = '';

  showNewClientModal = false;
  newClientFor: 'buyer' | 'recipient' | null = null;
  isCreatingClient = false;
  newClient = { name: '', email: '', phone: '', notes: '' };

  editingId: string | null = null;

  form: {
    buyer_name: string;
    recipient_name: string;
    buyer_email: string | null;
    recipient_email: string | null;
    purchase_date: string;
    valid_until: string;
    amount_eur: number | null;
    used: boolean;
    notes: string;
  } = this.emptyForm();

  constructor(
    private contentService: ContentService,
    private notificationService: NotificationService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.initForm();
      this.loadClientsList();
    }
  }

  private initForm(): void {
    this.editingId = this.editingCard?.id ?? null;
    if (this.editingCard?.id) {
      const c = this.editingCard;
      this.form = {
        buyer_name: c.buyer_name,
        recipient_name: c.recipient_name,
        buyer_email: c.buyer_email?.trim() || null,
        recipient_email: c.recipient_email?.trim() || null,
        purchase_date: c.purchase_date,
        valid_until: c.valid_until,
        amount_eur: null,
        used: c.used,
        notes: c.notes || ''
      };
    } else if (this.fixedBuyer) {
      this.form = {
        ...this.emptyForm(),
        buyer_name: this.fixedBuyer.name.trim(),
        buyer_email: this.fixedBuyer.email.trim()
      };
    } else {
      this.form = this.emptyForm();
    }
    this.buyerPickerOpen = false;
    this.recipientPickerOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const t = ev.target as HTMLElement;
    if (!t.closest('.client-picker')) {
      this.buyerPickerOpen = false;
      this.recipientPickerOpen = false;
    }
  }

  loadClientsList(): void {
    this.contentService.getAllClients().subscribe({
      next: (list) => {
        this.allClients = (list || []).slice().sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
        );
        if (this.visible) {
          this.syncFormEmailsFromClientNames();
        }
      },
      error: () => {
        this.allClients = [];
      }
    });
  }

  private syncFormEmailsFromClientNames(): void {
    const emailForName = (name: string): string | null => {
      const t = name.trim().toLowerCase();
      if (!t) return null;
      const matches = this.allClients.filter((c) => (c.name || '').trim().toLowerCase() === t);
      if (matches.length !== 1 || !matches[0].email) return null;
      return matches[0].email.trim();
    };
    if (!this.form.buyer_email) {
      const e = emailForName(this.form.buyer_name);
      if (e) this.form.buyer_email = e;
    }
    if (!this.form.recipient_email) {
      const e = emailForName(this.form.recipient_name);
      if (e) this.form.recipient_email = e;
    }
  }

  clientLabel(c: Client): string {
    const name = (c.name || '').trim() || c.email || '—';
    const e = (c.email || '').trim();
    return e ? `${name} — ${e}` : name;
  }

  get filteredBuyers(): Client[] {
    return this.filterClients(this.buyerFilter);
  }

  get filteredRecipients(): Client[] {
    return this.filterClients(this.recipientFilter);
  }

  private filterClients(q: string): Client[] {
    const t = q.trim().toLowerCase();
    const src = this.allClients;
    if (!t) {
      return src.slice(0, 80);
    }
    return src
      .filter(
        (c) =>
          (c.name || '').toLowerCase().includes(t) ||
          (c.email || '').toLowerCase().includes(t) ||
          (c.phone && c.phone.replace(/\s/g, '').includes(t.replace(/\s/g, '')))
      )
      .slice(0, 80);
  }

  toggleBuyerPicker(ev: MouseEvent): void {
    if (this.fixedBuyer) return;
    ev.stopPropagation();
    this.recipientPickerOpen = false;
    this.buyerPickerOpen = !this.buyerPickerOpen;
    if (this.buyerPickerOpen) {
      this.buyerFilter = '';
    }
  }

  toggleRecipientPicker(ev: MouseEvent): void {
    ev.stopPropagation();
    this.buyerPickerOpen = false;
    this.recipientPickerOpen = !this.recipientPickerOpen;
    if (this.recipientPickerOpen) {
      this.recipientFilter = '';
    }
  }

  selectBuyer(c: Client, ev: MouseEvent): void {
    ev.stopPropagation();
    this.form.buyer_name = (c.name || '').trim();
    this.form.buyer_email = c.email ? c.email.trim() : null;
    this.buyerPickerOpen = false;
  }

  selectRecipient(c: Client, ev: MouseEvent): void {
    ev.stopPropagation();
    this.form.recipient_name = (c.name || '').trim();
    this.form.recipient_email = c.email ? c.email.trim() : null;
    this.recipientPickerOpen = false;
  }

  openNewClientFromPicker(which: 'buyer' | 'recipient', ev: MouseEvent): void {
    if (which === 'buyer' && this.fixedBuyer) return;
    ev.stopPropagation();
    this.buyerPickerOpen = false;
    this.recipientPickerOpen = false;
    this.newClientFor = which;
    this.newClient = { name: '', email: '', phone: '', notes: '' };
    this.showNewClientModal = true;
  }

  closeNewClientModal(): void {
    this.showNewClientModal = false;
    this.newClientFor = null;
  }

  submitNewClient(): void {
    if (!this.newClient.name.trim()) {
      return;
    }
    this.isCreatingClient = true;
    const clientData: Partial<Client> = {
      name: this.newClient.name.trim()
    };
    if (this.newClient.email.trim()) {
      clientData.email = this.newClient.email.trim().toLowerCase();
    }
    if (this.newClient.phone.trim()) {
      clientData.phone = this.newClient.phone.trim();
    }
    if (this.newClient.notes.trim()) {
      clientData.notes = this.newClient.notes.trim();
    }
    if (!clientData.email) {
      clientData.email = `client-${Date.now()}@manuel.local`;
    }

    this.contentService.createOrUpdateClient(clientData).subscribe({
      next: (created) => {
        this.isCreatingClient = false;
        const name = (created.name || '').trim();
        const em = created.email ? created.email.trim() : null;
        if (this.newClientFor === 'buyer') {
          this.form.buyer_name = name;
          this.form.buyer_email = em;
        } else if (this.newClientFor === 'recipient') {
          this.form.recipient_name = name;
          this.form.recipient_email = em;
        }
        this.loadClientsList();
        this.closeNewClientModal();
        this.notificationService.success('Client créé. Vous pouvez le modifier si besoin depuis la fiche Clients.');
      },
      error: () => {
        this.isCreatingClient = false;
        this.notificationService.error('Impossible de créer le client.');
      }
    });
  }

  private emptyForm() {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    const purchase = `${y}-${m}-${d}`;
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);
    const vy = end.getFullYear();
    const vm = (end.getMonth() + 1).toString().padStart(2, '0');
    const vd = end.getDate().toString().padStart(2, '0');
    const validUntil = `${vy}-${vm}-${vd}`;
    return {
      buyer_name: '',
      recipient_name: '',
      buyer_email: null,
      recipient_email: null,
      purchase_date: purchase,
      valid_until: validUntil,
      amount_eur: null,
      used: false,
      notes: ''
    };
  }

  closeModal(): void {
    this.buyerPickerOpen = false;
    this.recipientPickerOpen = false;
    this.showNewClientModal = false;
    this.newClientFor = null;
    this.closed.emit();
  }

  save(): void {
    const f = this.form;
    if (!f.buyer_name.trim() || !f.recipient_name.trim() || !f.purchase_date || !f.valid_until) {
      this.notificationService.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.saving = true;
    const serviceLabel =
      this.editingId && this.editingCard?.service_label?.trim()
        ? this.editingCard.service_label.trim()
        : DEFAULT_GIFT_SERVICE_LABEL;
    const payload: Partial<GiftCard> & { buyer_email?: string | null; recipient_email?: string | null } = {
      buyer_name: f.buyer_name.trim(),
      recipient_name: f.recipient_name.trim(),
      purchase_date: f.purchase_date,
      valid_until: f.valid_until,
      service_label: serviceLabel,
      used: f.used,
      notes: f.notes.trim() || null,
      buyer_email: f.buyer_email?.trim() || null,
      recipient_email: f.recipient_email?.trim() || null
    };
    if (!this.editingId && f.amount_eur != null && f.amount_eur > 0) {
      (payload as { amount_eur?: number }).amount_eur = f.amount_eur;
    }

    const req = this.editingId
      ? this.contentService.updateGiftCard(this.editingId, payload)
      : this.contentService.createGiftCard(payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.notificationService.success(this.editingId ? 'Carte mise à jour.' : 'Carte enregistrée.');
        this.saved.emit();
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.error || err.error?.details || 'Erreur lors de l\'enregistrement.';
        this.notificationService.error(typeof msg === 'string' ? msg : 'Erreur lors de l\'enregistrement.');
      }
    });
  }
}
