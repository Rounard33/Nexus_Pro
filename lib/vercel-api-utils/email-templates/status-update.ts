/**
 * Template d'email : Mise à jour du statut au client (accepté/refusé)
 * Envoyé quand l'admin accepte ou refuse un rendez-vous
 */

import { 
  escapeHtml, 
  formatDateFr, 
  getEmailHeader, 
  getEmailFooter, 
  wrapEmailBody,
  colors,
  SITE_NAME 
} from './common.js';

export interface StatusUpdateData {
  client_name: string;
  client_email: string;
  appointment_date: string;
  appointment_time: string;
  prestation_name?: string;
}

export type AppointmentStatus = 'accepted' | 'rejected';

/**
 * Génère le HTML de l'email de confirmation (RDV accepté)
 * Design épuré et élégant
 */
function generateAcceptedEmail(data: StatusUpdateData): string {
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
        
        <!-- Indicateur de confirmation discret -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: ${colors.success}; color: white; padding: 8px 20px; border-radius: 20px; font-family: Arial, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            ✓ Confirmé
          </div>
        </div>
        
        <p style="font-family: 'Georgia', serif; font-size: 18px; color: #6f5f4e; margin: 0 0 20px 0; line-height: 1.6;">
          Bonjour <strong style="color: #4a3f35;">${safeName}</strong>,
        </p>
        
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #6f5f4e; line-height: 1.7; margin: 0 0 30px 0;">
          C'est avec plaisir que je vous confirme votre rendez-vous. J'ai hâte de vous accueillir.
        </p>
        
        <!-- Détails du rendez-vous - style carte épurée -->
        <div style="background: #faf8f3; border-radius: 8px; padding: 25px; margin: 0 0 30px 0;">
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #ebe5d5;">
                <span style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; text-transform: uppercase; letter-spacing: 1px;">Date</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #ebe5d5; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #4a3f35;">${dateFormatted}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; ${safePrestation ? 'border-bottom: 1px solid #ebe5d5;' : ''}">
                <span style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; text-transform: uppercase; letter-spacing: 1px;">Heure</span>
              </td>
              <td style="padding: 12px 0; ${safePrestation ? 'border-bottom: 1px solid #ebe5d5;' : ''} text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #4a3f35;">${safeTime}</span>
              </td>
            </tr>
            ${safePrestation ? `
            <tr>
              <td style="padding: 12px 0;">
                <span style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; text-transform: uppercase; letter-spacing: 1px;">Soin</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #4a3f35;">${safePrestation}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="font-family: Arial, sans-serif; font-size: 14px; color: #8b7a62; line-height: 1.7; margin: 0; text-align: center;">
          En cas d'imprévu, merci de me prévenir dans les meilleurs délais.
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
 * Génère le HTML de l'email de refus (RDV refusé)
 * Design sobre et bienveillant
 */
function generateRejectedEmail(data: StatusUpdateData): string {
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
        <p style="font-family: 'Georgia', serif; font-size: 18px; color: #6f5f4e; margin: 0 0 20px 0; line-height: 1.6;">
          Bonjour <strong style="color: #4a3f35;">${safeName}</strong>,
        </p>
        
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #6f5f4e; line-height: 1.7; margin: 0 0 30px 0;">
          Je vous remercie pour votre demande de rendez-vous. Malheureusement, ce créneau n'est plus disponible.
        </p>
        
        <!-- Détails du créneau demandé -->
        <div style="background: #faf8f3; border-radius: 8px; padding: 25px; margin: 0 0 30px 0; opacity: 0.8;">
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #ebe5d5;">
                <span style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; text-transform: uppercase; letter-spacing: 1px;">Date demandée</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #ebe5d5; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 14px; color: #8b7a62; text-decoration: line-through;">${dateFormatted}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; ${safePrestation ? 'border-bottom: 1px solid #ebe5d5;' : ''}">
                <span style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; text-transform: uppercase; letter-spacing: 1px;">Heure demandée</span>
              </td>
              <td style="padding: 10px 0; ${safePrestation ? 'border-bottom: 1px solid #ebe5d5;' : ''} text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 14px; color: #8b7a62; text-decoration: line-through;">${safeTime}</span>
              </td>
            </tr>
            ${safePrestation ? `
            <tr>
              <td style="padding: 10px 0;">
                <span style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; text-transform: uppercase; letter-spacing: 1px;">Soin</span>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 14px; color: #8b7a62;">${safePrestation}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #6f5f4e; line-height: 1.7; margin: 0 0 20px 0; text-align: center;">
          N'hésitez pas à proposer une autre date.<br>
          <span style="color: #8b7a62;">Je serai ravie de vous accueillir.</span>
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
 * Génère le HTML de l'email selon le statut
 */
export function generateStatusUpdateEmail(data: StatusUpdateData, status: AppointmentStatus): string {
  if (status === 'accepted') {
    return generateAcceptedEmail(data);
  } else {
    return generateRejectedEmail(data);
  }
}

/**
 * Génère le sujet de l'email selon le statut
 */
export function getStatusUpdateSubject(status: AppointmentStatus): string {
  if (status === 'accepted') {
    return `Rendez-vous confirmé - ${SITE_NAME}`;
  } else {
    return `Votre demande de rendez-vous - ${SITE_NAME}`;
  }
}
