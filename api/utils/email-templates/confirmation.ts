/**
 * Template d'email : Confirmation de demande de RDV au client
 * Envoyé quand un client fait une demande de rendez-vous
 */

import { 
  escapeHtml, 
  formatDateFr, 
  getEmailHeader, 
  getEmailFooter, 
  wrapEmailBody,
  SITE_NAME 
} from './common.js';

export interface ConfirmationData {
  client_name: string;
  client_email: string;
  appointment_date: string;
  appointment_time: string;
  prestation_name?: string;
}

/**
 * Génère le HTML de l'email de confirmation de demande
 */
export function generateConfirmationEmail(data: ConfirmationData): string {
  const safeName = escapeHtml(data.client_name);
  const safeTime = escapeHtml(data.appointment_time);
  const safePrestation = escapeHtml(data.prestation_name);
  const dateFormatted = formatDateFr(data.appointment_date);

  const content = `
    <!-- Header avec logo -->
    <tr>
      <td>
        ${getEmailHeader()}
      </td>
    </tr>
    
    <!-- Contenu principal -->
    <tr>
      <td style="padding: 40px 30px; background: #ffffff;">
        <p style="font-family: 'Georgia', serif; font-size: 18px; color: #6f5f4e; margin: 0 0 25px 0; line-height: 1.6;">
          Bonjour <strong style="color: #4a3f35;">${safeName}</strong>,
        </p>
        
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #6f5f4e; line-height: 1.7; margin: 0 0 30px 0;">
          Votre demande de rendez-vous a bien été enregistrée. Je vous remercie pour votre confiance.
        </p>
        
        <!-- Détails du rendez-vous -->
        <div style="background: linear-gradient(135deg, #faf8f3 0%, #f5f1e8 100%); border-radius: 12px; padding: 25px; margin: 0 0 30px 0; border-left: 4px solid #8b7a62;">
          <h3 style="font-family: 'Georgia', serif; font-size: 14px; color: #8b7a62; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">
            Détails de votre demande
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #ebe5d5;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">Date</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #ebe5d5; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #4a3f35;">${dateFormatted}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #ebe5d5;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">Heure</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #ebe5d5; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #4a3f35;">${safeTime}</span>
              </td>
            </tr>
            ${safePrestation ? `
            <tr>
              <td style="padding: 10px 0;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">Prestation</span>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #4a3f35;">${safePrestation}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <!-- Message d'attente -->
        <div style="text-align: center; padding: 25px; background: #8b7a62; border-radius: 8px; margin: 0 0 30px 0;">
          <p style="font-family: 'Georgia', serif; font-size: 16px; color: #ffffff; margin: 0; line-height: 1.6;">
            ⏳ <em>Votre demande est en attente de confirmation.</em><br>
            <span style="font-size: 14px; opacity: 0.9;">Je reviendrai vers vous très rapidement.</span>
          </p>
        </div>
        
        <p style="font-family: Arial, sans-serif; font-size: 14px; color: #8b7a62; line-height: 1.7; margin: 0;">
          Si vous avez des questions, n'hésitez pas à me contacter.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td>
        ${getEmailFooter()}
      </td>
    </tr>
  `;

  return wrapEmailBody(content);
}

/**
 * Génère le sujet de l'email
 */
export function getConfirmationSubject(): string {
  return `✨ Demande de rendez-vous reçue - ${SITE_NAME}`;
}





