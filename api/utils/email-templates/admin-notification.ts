/**
 * Template d'email : Notification à l'admin d'une nouvelle demande de RDV
 * Envoyé quand un client fait une demande de rendez-vous
 */

import { 
  escapeHtml, 
  formatDateFr,
  SITE_NAME 
} from './common.js';

export interface AdminNotificationData {
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  appointment_time: string;
  prestation_name?: string;
  notes?: string;
}

/**
 * Génère le HTML de l'email de notification admin
 */
export function generateAdminNotificationEmail(data: AdminNotificationData): string {
  const safeName = escapeHtml(data.client_name);
  const safeEmail = escapeHtml(data.client_email);
  const safePhone = escapeHtml(data.client_phone);
  const safeTime = escapeHtml(data.appointment_time);
  const safePrestation = escapeHtml(data.prestation_name);
  const safeNotes = escapeHtml(data.notes);
  const dateFormatted = formatDateFr(data.appointment_date);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f1e8; font-family: Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 122, 98, 0.15);">
              
              <!-- Header urgent -->
              <tr>
                <td style="padding: 30px; background: linear-gradient(135deg, #c0392b 0%, #a93226 100%); text-align: center;">
                  <h1 style="font-family: Arial, sans-serif; font-size: 20px; color: #ffffff; margin: 0; letter-spacing: 1px;">
                    🔔 Nouvelle demande de rendez-vous
                  </h1>
                </td>
              </tr>
              
              <!-- Contenu -->
              <tr>
                <td style="padding: 30px;">
                  <p style="font-family: Arial, sans-serif; font-size: 15px; color: #4a3f35; margin: 0 0 25px 0;">
                    Une nouvelle demande de rendez-vous vient d'être reçue :
                  </p>
                  
                  <!-- Infos client -->
                  <div style="background: #faf8f3; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #8b7a62; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      👤 Client
                    </h3>
                    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #4a3f35; margin: 0 0 8px 0; font-weight: bold;">
                      ${safeName}
                    </p>
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 0 0 5px 0;">
                      📧 <a href="mailto:${safeEmail}" style="color: #8b7a62;">${safeEmail}</a>
                    </p>
                    ${safePhone ? `
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 0;">
                      📱 <a href="tel:${safePhone}" style="color: #8b7a62;">${safePhone}</a>
                    </p>
                    ` : ''}
                  </div>
                  
                  <!-- Infos RDV -->
                  <div style="background: #faf8f3; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #8b7a62; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      📅 Rendez-vous demandé
                    </h3>
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e;">Date :</td>
                        <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; font-weight: bold;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e;">Heure :</td>
                        <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; font-weight: bold;">${safeTime}</td>
                      </tr>
                      ${safePrestation ? `
                      <tr>
                        <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e;">Prestation :</td>
                        <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; font-weight: bold;">${safePrestation}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                  
                  ${safeNotes ? `
                  <!-- Notes -->
                  <div style="background: #fff9e6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border-left: 4px solid #f5a623;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #b8860b; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                      📝 Notes du client
                    </h3>
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; margin: 0; line-height: 1.6;">
                      ${safeNotes}
                    </p>
                  </div>
                  ` : ''}
                  
                  <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 20px 0 0 0; text-align: center;">
                    Connectez-vous au panneau d'administration pour accepter ou refuser ce rendez-vous.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Génère le sujet de l'email
 */
export function getAdminNotificationSubject(clientName: string, date: string): string {
  const safeName = escapeHtml(clientName);
  const dateFormatted = formatDateFr(date);
  return `🔔 Nouvelle demande - ${safeName} - ${dateFormatted}`;
}



