import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AdditionalSale } from '../models/clients.model';
import { Appointment, ContentService } from './content.service';
import { AdditionalSalesService } from './additional-sales.service';
import { ForfaitProgressService } from './forfait-progress.service';
import { GiftCardProgressService } from './gift-card-progress.service';

/**
 * Applique forfait + carte cadeau sur les notes client en une seule lecture / écriture.
 * Évite que deux PATCH successifs n’écrasent l’un l’autre (solde carte réapparaissant).
 */
@Injectable({ providedIn: 'root' })
export class AppointmentClientNotesSyncService {
  constructor(
    private contentService: ContentService,
    private additionalSalesService: AdditionalSalesService,
    private forfaitProgress: ForfaitProgressService,
    private giftProgress: GiftCardProgressService
  ) {}

  syncAfterAppointmentStatusChange(
    appointment: Appointment,
    previousStatus: Appointment['status'],
    newStatus: Appointment['status'],
    opts?: { mixteGiftEur?: number }
  ): Observable<{ forfait: { updated: boolean; message?: string }; gift: { updated: boolean; message?: string } }> {
    const email = (appointment.client_email || '').trim().toLowerCase();
    const apptId = appointment.id;
    if (!email || !apptId) {
      return of({ forfait: { updated: false }, gift: { updated: false } });
    }

    const becameCompleted = newStatus === 'completed' && previousStatus !== 'completed';
    const leftCompleted = previousStatus === 'completed' && newStatus !== 'completed';

    if (!becameCompleted && !leftCompleted) {
      return of({ forfait: { updated: false }, gift: { updated: false } });
    }

    return forkJoin({
      prestations: this.contentService.getPrestations(),
      client: this.contentService.getClientByEmail(email)
    }).pipe(
      switchMap(({ prestations, client }) => {
        let sales = this.additionalSalesService.parseAdditionalSales(client.notes);

        if (becameCompleted) {
          const prestationName = appointment.prestations?.name;
          const prestationId = appointment.prestation_id ?? null;

          const fr = this.forfaitProgress.applyCompletionToSales(sales, apptId, prestationId, prestationName);
          sales = fr.sales;

          const pm = appointment.payment_method;
          let gr: { sales: AdditionalSale[]; changed: boolean; message?: string };
          if (pm === 'carte_cadeau' || pm === 'mixte') {
            gr = this.giftProgress.applyGiftCardCompletionToSales(
              sales,
              apptId,
              appointment,
              prestations,
              pm,
              opts?.mixteGiftEur
            );
            sales = gr.sales;
          } else {
            gr = { sales, changed: false };
          }

          if (!fr.changed && !gr.changed) {
            return of({
              forfait: { updated: false, message: fr.message },
              gift: { updated: false, message: gr.message }
            });
          }

          const newNotes = this.additionalSalesService.formatNotesWithSales(client.notes, sales);
          return this.contentService.updateClient(email, { notes: newNotes }).pipe(
            map(() => ({
              forfait: { updated: fr.changed, message: fr.message },
              gift: { updated: gr.changed, message: gr.message }
            }))
          );
        }

        const gr = this.giftProgress.revertGiftCardCompletionFromSales(sales, apptId);
        sales = gr.sales;
        const fr = this.forfaitProgress.revertCompletionFromSales(sales, apptId);
        sales = fr.sales;

        if (!gr.changed && !fr.changed) {
          return of({
            forfait: { updated: false, message: fr.message },
            gift: { updated: false, message: gr.message }
          });
        }

        const newNotes = this.additionalSalesService.formatNotesWithSales(client.notes, sales);
        return this.contentService.updateClient(email, { notes: newNotes }).pipe(
          map(() => ({
            forfait: { updated: fr.changed, message: fr.message },
            gift: { updated: gr.changed, message: gr.message }
          }))
        );
      }),
      catchError(() => of({ forfait: { updated: false }, gift: { updated: false } }))
    );
  }
}
