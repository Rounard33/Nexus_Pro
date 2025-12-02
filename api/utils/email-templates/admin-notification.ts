/**
 * Template d'email : Notification à l'admin d'une nouvelle demande de RDV
 * Envoyé quand un client fait une demande de rendez-vous
 */

import {
    escapeHtml,
    formatDateFr
} from './common.js';

export interface AdminNotificationData {
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  appointment_time: string;
  prestation_name?: string;
  notes?: string;
  // Infos fidélité
  loyalty_count?: number; // Nombre de séances terminées (hors tirages de cartes)
  loyalty_threshold?: number; // Seuil pour la récompense (10 par défaut)
  // Infos parrainage
  referral_source?: string;
  referral_friend_name?: string; // Nom du parrain
  referrer_loyalty_count?: number; // Séances fidélité du parrain après bonus
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
  
  // Infos fidélité (basé sur les RDV terminés uniquement)
  const loyaltyCount = data.loyalty_count || 0;
  const loyaltyThreshold = data.loyalty_threshold || 10;
  
  // Vérifier si la prestation actuelle est un tirage de cartes (ne compte pas pour la fidélité)
  const prestationNameLower = (data.prestation_name || '').toLowerCase();
  const isCardReading = prestationNameLower.includes('tirage') || prestationNameLower.includes('carte');
  
  // +1 seulement si ce n'est pas un tirage de cartes
  const loyaltyAfterThis = loyaltyCount + (isCardReading ? 0 : 1);
  
  const isCloseToReward = loyaltyAfterThis >= loyaltyThreshold - 2 && loyaltyAfterThis < loyaltyThreshold;
  const hasReachedReward = loyaltyAfterThis >= loyaltyThreshold;
  
  // Infos parrainage
  const safeReferrerName = escapeHtml(data.referral_friend_name);
  const isReferral = data.referral_source === 'friend' && safeReferrerName;

  // Générer le bloc fidélité
  const loyaltyBlock = `
    <div style="background: ${hasReachedReward ? '#e8f5e9' : isCloseToReward ? '#fff3e0' : '#f3e5f5'}; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border-left: 4px solid ${hasReachedReward ? '#4caf50' : isCloseToReward ? '#ff9800' : '#9c27b0'};">
      <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: ${hasReachedReward ? '#2e7d32' : isCloseToReward ? '#e65100' : '#7b1fa2'}; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
        💜 Carte fidélité
      </h3>
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; margin: 0 0 8px 0;">
        <strong>${loyaltyCount}</strong> séance${loyaltyCount > 1 ? 's' : ''} terminée${loyaltyCount > 1 ? 's' : ''} (hors tirages de cartes)
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; margin: 0 0 8px 0;">
        Après ce RDV (si terminé) : <strong>${loyaltyAfterThis}/${loyaltyThreshold}</strong> séances
      </p>
      ${hasReachedReward ? `
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #2e7d32; margin: 8px 0 0 0; font-weight: bold;">
        🎉 RÉCOMPENSE ATTEINTE ! 10€ de réduction + bracelet énergétique offert
      </p>
      ` : isCloseToReward ? `
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #e65100; margin: 8px 0 0 0; font-weight: bold;">
        ⚠️ Plus que ${loyaltyThreshold - loyaltyAfterThis} séance${loyaltyThreshold - loyaltyAfterThis > 1 ? 's' : ''} avant la récompense !
      </p>
      ` : `
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6f5f4e; margin: 8px 0 0 0;">
        Encore ${loyaltyThreshold - loyaltyAfterThis} séance${loyaltyThreshold - loyaltyAfterThis > 1 ? 's' : ''} avant la récompense
      </p>
      `}
    </div>
  `;

  // Générer le bloc parrainage si applicable
  const referralBlock = isReferral ? `
    <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border-left: 4px solid #2196f3;">
      <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #1565c0; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
        🤝 Parrainage
      </h3>
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #4a3f35; margin: 0 0 8px 0;">
        Ce client vient de la part de : <strong>${safeReferrerName}</strong>
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #1565c0; margin: 0; font-weight: bold;">
        ➕ 1 séance bonus ajoutée à la carte fidélité de ${safeReferrerName}
      </p>
      ${data.referrer_loyalty_count !== undefined ? `
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6f5f4e; margin: 5px 0 0 0;">
        ${safeReferrerName} a maintenant ${data.referrer_loyalty_count} séance${data.referrer_loyalty_count > 1 ? 's' : ''} sur sa carte
      </p>
      ` : ''}
    </div>
  ` : '';

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
                  
                  <!-- Carte fidélité -->
                  ${loyaltyBlock}
                  
                  <!-- Parrainage (si applicable) -->
                  ${referralBlock}
                  
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





