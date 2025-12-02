/**
 * Template d'email : Message de contact
 * Envoyé à l'admin quand quelqu'un utilise le formulaire de contact
 */

import { 
  escapeHtml,
  SITE_NAME 
} from './common.js';

export interface ContactMessageData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

/**
 * Génère le HTML de l'email de contact
 */
export function generateContactMessageEmail(data: ContactMessageData): string {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message);

  // Convertir les sauts de ligne en <br> pour le message
  const formattedMessage = safeMessage.replace(/\n/g, '<br>');

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
              
              <!-- Header -->
              <tr>
                <td style="padding: 30px; background: linear-gradient(135deg, #8b7a62 0%, #6f5f4e 100%); text-align: center;">
                  <h1 style="font-family: 'Georgia', serif; font-size: 22px; color: #ffffff; margin: 0; letter-spacing: 1px;">
                    ✉️ Nouveau message de contact
                  </h1>
                </td>
              </tr>
              
              <!-- Contenu -->
              <tr>
                <td style="padding: 30px;">
                  
                  <!-- Sujet -->
                  <div style="background: linear-gradient(135deg, #faf8f3 0%, #f5f1e8 100%); border-radius: 8px; padding: 20px; margin: 0 0 20px 0; border-left: 4px solid #8b7a62;">
                    <h2 style="font-family: 'Georgia', serif; font-size: 18px; color: #4a3f35; margin: 0;">
                      ${safeSubject}
                    </h2>
                  </div>
                  
                  <!-- Infos expéditeur -->
                  <div style="background: #faf8f3; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #8b7a62; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      👤 Expéditeur
                    </h3>
                    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #4a3f35; margin: 0 0 8px 0; font-weight: bold;">
                      ${safeName}
                    </p>
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 0 0 5px 0;">
                      📧 <a href="mailto:${safeEmail}" style="color: #8b7a62; text-decoration: none;">${safeEmail}</a>
                    </p>
                    ${safePhone ? `
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 0;">
                      📱 <a href="tel:${safePhone}" style="color: #8b7a62; text-decoration: none;">${safePhone}</a>
                    </p>
                    ` : ''}
                  </div>
                  
                  <!-- Message -->
                  <div style="background: #ffffff; border: 1px solid #ebe5d5; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #8b7a62; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      💬 Message
                    </h3>
                    <p style="font-family: Arial, sans-serif; font-size: 15px; color: #4a3f35; margin: 0; line-height: 1.7;">
                      ${formattedMessage}
                    </p>
                  </div>
                  
                  <!-- Bouton répondre -->
                  <div style="text-align: center; padding: 20px 0;">
                    <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(data.subject)}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8b7a62 0%, #6f5f4e 100%); color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">
                      📧 Répondre à ${safeName}
                    </a>
                  </div>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; background: #faf8f3; border-top: 1px solid #ebe5d5; text-align: center;">
                  <p style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; margin: 0;">
                    Message reçu via le formulaire de contact de ${SITE_NAME}
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
export function getContactMessageSubject(subject: string, name: string): string {
  const safeName = escapeHtml(name);
  const safeSubject = escapeHtml(subject);
  return `✉️ Contact: ${safeSubject} - de ${safeName}`;
}







