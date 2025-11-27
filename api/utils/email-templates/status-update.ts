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
    
    <!-- Badge de confirmation -->
    <tr>
      <td style="padding: 0 30px;">
        <div style="text-align: center; padding: 25px; background: linear-gradient(135deg, ${colors.successLight} 0%, #e6f7ed 100%); border-radius: 12px; border: 2px solid ${colors.success};">
          <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
          <h2 style="font-family: 'Georgia', serif; font-size: 24px; color: ${colors.successDark}; margin: 0;">
            Rendez-vous confirmé !
          </h2>
        </div>
      </td>
    </tr>
    
    <!-- Contenu principal -->
    <tr>
      <td style="padding: 40px 30px; background: #ffffff;">
        <p style="font-family: 'Georgia', serif; font-size: 18px; color: #6f5f4e; margin: 0 0 25px 0; line-height: 1.6;">
          Bonjour <strong style="color: #4a3f35;">${safeName}</strong>,
        </p>
        
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #6f5f4e; line-height: 1.7; margin: 0 0 30px 0;">
          C'est avec plaisir que je vous confirme votre rendez-vous. J'ai hâte de vous accueillir !
        </p>
        
        <!-- Détails du rendez-vous -->
        <div style="background: linear-gradient(135deg, #faf8f3 0%, #f5f1e8 100%); border-radius: 12px; padding: 25px; margin: 0 0 30px 0; border-left: 4px solid ${colors.success};">
          <h3 style="font-family: 'Georgia', serif; font-size: 14px; color: ${colors.success}; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">
            ✓ Rendez-vous confirmé
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #ebe5d5;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">📅 Date</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #ebe5d5; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 16px; color: #4a3f35; font-weight: bold;">${dateFormatted}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #ebe5d5;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">🕐 Heure</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #ebe5d5; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 16px; color: #4a3f35; font-weight: bold;">${safeTime}</span>
              </td>
            </tr>
            ${safePrestation ? `
            <tr>
              <td style="padding: 12px 0;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">✨ Prestation</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 16px; color: #4a3f35; font-weight: bold;">${safePrestation}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="font-family: Arial, sans-serif; font-size: 14px; color: #8b7a62; line-height: 1.7; margin: 0;">
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
        <p style="font-family: 'Georgia', serif; font-size: 18px; color: #6f5f4e; margin: 0 0 25px 0; line-height: 1.6;">
          Bonjour <strong style="color: #4a3f35;">${safeName}</strong>,
        </p>
        
        <p style="font-family: Arial, sans-serif; font-size: 15px; color: #6f5f4e; line-height: 1.7; margin: 0 0 30px 0;">
          Je vous remercie pour votre demande de rendez-vous. Malheureusement, je ne suis pas en mesure de vous recevoir à la date souhaitée.
        </p>
        
        <!-- Détails du rendez-vous refusé -->
        <div style="background: ${colors.errorLight}; border-radius: 12px; padding: 25px; margin: 0 0 30px 0; border-left: 4px solid ${colors.error};">
          <h3 style="font-family: 'Georgia', serif; font-size: 14px; color: ${colors.error}; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">
            Créneau non disponible
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f5ccc8;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">Date demandée</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f5ccc8; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #6f5f4e; text-decoration: line-through;">${dateFormatted}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f5ccc8;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">Heure demandée</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f5ccc8; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #6f5f4e; text-decoration: line-through;">${safeTime}</span>
              </td>
            </tr>
            ${safePrestation ? `
            <tr>
              <td style="padding: 10px 0;">
                <span style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a;">Prestation</span>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <span style="font-family: 'Georgia', serif; font-size: 15px; color: #6f5f4e;">${safePrestation}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <!-- Invitation à reprendre RDV -->
        <div style="text-align: center; padding: 25px; background: #faf8f3; border-radius: 8px; margin: 0 0 30px 0;">
          <p style="font-family: 'Georgia', serif; font-size: 16px; color: #6f5f4e; margin: 0; line-height: 1.6;">
            N'hésitez pas à consulter le calendrier et à proposer une autre date.<br>
            <span style="font-size: 14px; color: #8b7a62;">Je serai ravie de vous accueillir à un autre moment.</span>
          </p>
        </div>
        
        <p style="font-family: Arial, sans-serif; font-size: 14px; color: #8b7a62; line-height: 1.7; margin: 0;">
          Je vous prie de m'excuser pour ce désagrément.
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
    return `✅ Rendez-vous confirmé - ${SITE_NAME}`;
  } else {
    return `Votre demande de rendez-vous - ${SITE_NAME}`;
  }
}

