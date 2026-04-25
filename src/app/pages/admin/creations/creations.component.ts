import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Creation, ContentService} from '../../../services/content.service';
import {NotificationService} from '../../../services/notification.service';
import {getCreationImageUrl} from '../../../utils/supabase-storage.utils';

@Component({
  selector: 'app-admin-creations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creations.component.html',
  styleUrl: './creations.component.scss'
})
export class CreationsComponent implements OnInit {
  list: Creation[] = [];
  isLoading = false;
  saving = false;
  showForm = false;
  editing: Creation | null = null;

  formName = '';
  formPrice = '';
  formDescription = '';
  formImageUrl = '';
  formDisplayOrder = 0;
  formActive = true;
  uploadingImage = false;

  constructor(
    private contentService: ContentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  imagePreview(path: string | null | undefined): string {
    return getCreationImageUrl(path);
  }

  onImageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploadingImage = true;
    this.contentService.uploadCreationImage(file).subscribe({
      next: (r) => {
        this.formImageUrl = r.path;
        this.uploadingImage = false;
        input.value = '';
      },
      error: (e: unknown) => {
        this.uploadingImage = false;
        input.value = '';
        const err = e as { error?: { details?: string; error?: string; message?: string }; message?: string };
        const msg =
          err?.error?.details ||
          err?.error?.error ||
          err?.error?.message ||
          err?.message ||
          'Téléversement impossible.';
        this.notificationService.error(typeof msg === 'string' ? msg : 'Téléversement impossible.');
      }
    });
  }

  clearImage(): void {
    this.formImageUrl = '';
  }

  load(): void {
    this.isLoading = true;
    this.contentService.getCreationsForAdmin().subscribe({
      next: (data) => {
        this.list = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.list = [];
        this.isLoading = false;
        this.notificationService.error('Impossible de charger les créations.');
      }
    });
  }

  openCreate(): void {
    this.editing = null;
    this.formName = '';
    this.formPrice = '';
    this.formDescription = '';
    this.formImageUrl = '';
    this.formDisplayOrder = 0;
    this.formActive = true;
    this.showForm = true;
  }

  openEdit(c: Creation): void {
    this.editing = c;
    this.formName = c.name || '';
    this.formPrice = c.price || '';
    this.formDescription = c.description || '';
    this.formImageUrl = c.image_url || '';
    this.formDisplayOrder = c.display_order ?? 0;
    this.formActive = c.is_active !== false;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
  }

  save(): void {
    const name = this.formName.trim();
    if (!name) {
      this.notificationService.error('Le nom est obligatoire.');
      return;
    }
    const price = this.formPrice.trim() || '0 €';
    const description = this.formDescription;
    const image_url = this.formImageUrl.trim() || null;
    const is_active = this.formActive;
    const display_order = Number.isFinite(this.formDisplayOrder) ? Math.round(this.formDisplayOrder) : 0;

    this.saving = true;
    if (this.editing?.id) {
      this.contentService
        .updateCreation(this.editing.id, {
          name,
          price,
          description,
          image_url,
          is_active,
          display_order
        })
        .subscribe({
          next: (row) => {
            const i = this.list.findIndex((x) => x.id === row.id);
            if (i !== -1) {
              this.list[i] = row;
            }
            this.list = [...this.list].sort(
              (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
            );
            this.saving = false;
            this.closeForm();
            this.notificationService.success('Création enregistrée.');
          },
          error: () => {
            this.saving = false;
            this.notificationService.error('Enregistrement impossible.');
          }
        });
    } else {
      this.contentService
        .createCreation({name, price, description, image_url, is_active, display_order})
        .subscribe({
          next: (row) => {
            this.list = [...this.list, row].sort(
              (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
            );
            this.saving = false;
            this.closeForm();
            this.notificationService.success('Création ajoutée.');
          },
          error: (e: unknown) => {
            this.saving = false;
            const err = e as { error?: { details?: string; error?: string; message?: string } };
            const msg =
              err?.error?.details || err?.error?.error || err?.error?.message || 'Création impossible.';
            this.notificationService.error(typeof msg === 'string' ? msg : 'Création impossible.');
          }
        });
    }
  }

  confirmDelete(c: Creation): void {
    if (!c.id || !confirm(`Supprimer « ${c.name} » ?`)) {
      return;
    }
    this.contentService.deleteCreation(c.id).subscribe({
      next: () => {
        this.list = this.list.filter((x) => x.id !== c.id);
        this.notificationService.success('Supprimé.');
      },
      error: () => this.notificationService.error('Suppression impossible.')
    });
  }
}
