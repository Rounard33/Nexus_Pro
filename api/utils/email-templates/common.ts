/**
 * Éléments communs pour tous les templates d'email
 * Styles, header, footer et utilitaires
 */

// Configuration
export const SITE_NAME = 'Reiki & Sens';
export const LOGO_URL = process.env['LOGO_URL'] || '';

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 */
export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formate la date en français
 */
export function formatDateFr(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Couleurs du thème Reiki & Sens
 */
export const colors = {
  primary: {
    50: '#faf8f3',
    100: '#f5f1e8',
    200: '#ebe5d5',
    300: '#d9cfb8',
    400: '#c4b598',
    500: '#b8a889',
    600: '#a8967a',
    700: '#8b7a62',
    800: '#6f5f4e',
    900: '#4a3f35',
  },
  success: '#27ae60',
  successLight: '#f0fff4',
  successDark: '#166534',
  error: '#c0392b',
  errorLight: '#fef5f5',
  warning: '#f5a623',
  warningLight: '#fff9e6',
};

/**
 * Génère le header avec logo
 */
export function getEmailHeader(): string {
  const logoSection = LOGO_URL ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${LOGO_URL}" alt="${SITE_NAME}" style="max-width: 180px; height: auto;" />
    </div>
  ` : `
    <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: 300; color: #6f5f4e; margin: 0; letter-spacing: 2px;">
      ${SITE_NAME}
    </h1>
  `;

  return `
    <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #faf8f3 0%, #f5f1e8 100%);">
      ${logoSection}
      <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #8b7a62, transparent); margin: 20px auto;"></div>
    </div>
  `;
}

/**
 * Génère le footer
 */
export function getEmailFooter(): string {
  return `
    <div style="text-align: center; padding: 30px 20px; background: #faf8f3; border-top: 1px solid #ebe5d5;">
      <p style="font-family: 'Georgia', serif; font-size: 14px; color: #8b7a62; margin: 0 0 10px 0; font-style: italic;">
        Avec bienveillance,
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 13px; color: #a8967a; margin: 0;">
        ${SITE_NAME}
      </p>
      <div style="margin-top: 20px;">
        <p style="font-family: Arial, sans-serif; font-size: 11px; color: #c4b598; margin: 0;">
          Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.
        </p>
      </div>
    </div>
  `;
}

/**
 * Wrapper pour le body de l'email
 */
export function wrapEmailBody(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 122, 98, 0.1);">
              ${content}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}



