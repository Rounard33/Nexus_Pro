import {Resend} from 'resend';

// Initialiser Resend
const resend = new Resend(process.env['RESEND_API_KEY']);

// Email de l'admin (destinataire des notifications)
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] || 'admin@votre-domaine.com';
// Email expéditeur (doit être vérifié dans Resend)
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'Reiki & Sens <noreply@votre-domaine.com>';
// Nom du site
const SITE_NAME = 'Reiki & Sens';

interface AppointmentData {
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  appointment_time: string;
  prestation_name?: string;
  notes?: string;
  status?: string;
}

/**
 * Formate la date en français
 */
function formatDateFr(dateStr: string): string {
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
 * Email 1 : Confirmation de demande de RDV au client
 */
export async function sendAppointmentRequestConfirmation(appointment: AppointmentData): Promise<boolean> {
  try {
    const { client_name, client_email, appointment_date, appointment_time, prestation_name } = appointment;
    
    const dateFormatted = formatDateFr(appointment_date);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b7a62 0%, #6f5f4e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f5f1e8; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6f5f4e; }
          .value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          .highlight { background: #8b7a62; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✨ ${SITE_NAME} ✨</h1>
        </div>
        <div class="content">
          <p>Bonjour <strong>${client_name}</strong>,</p>
          
          <p>Votre demande de rendez-vous a bien été enregistrée ! 🙏</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">📅 Date :</span>
              <span class="value">${dateFormatted}</span>
            </div>
            <div class="detail-row">
              <span class="label">🕐 Heure :</span>
              <span class="value">${appointment_time}</span>
            </div>
            ${prestation_name ? `
            <div class="detail-row">
              <span class="label">💆 Prestation :</span>
              <span class="value">${prestation_name}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="highlight">
            <strong>⏳ En attente de confirmation</strong><br>
            Je reviendrai vers vous très rapidement pour confirmer ce rendez-vous.
          </div>
          
          <p>Si vous avez des questions, n'hésitez pas à me contacter.</p>
          
          <p>À très bientôt,<br>
          <em>${SITE_NAME}</em></p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement suite à votre demande de rendez-vous.</p>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: client_email,
      subject: `✨ Demande de rendez-vous reçue - ${SITE_NAME}`,
      html,
    });

    if (error) {
      console.error('[Email] Erreur envoi confirmation client:', error);
      return false;
    }

    console.log(`[Email] ✅ Confirmation envoyée à ${client_email}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Erreur envoi confirmation client:', error.message);
    return false;
  }
}

/**
 * Email 2 : Notification à l'admin d'une nouvelle demande de RDV
 */
export async function sendNewAppointmentNotificationToAdmin(appointment: AppointmentData): Promise<boolean> {
  try {
    const { client_name, client_email, client_phone, appointment_date, appointment_time, prestation_name, notes } = appointment;
    
    const dateFormatted = formatDateFr(appointment_date);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #fef5f5; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #c0392b; display: block; margin-bottom: 5px; }
          .value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          .action-btn { display: inline-block; background: #27ae60; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; margin: 10px 5px; }
          .action-btn.reject { background: #e74c3c; }
          .actions { text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Nouvelle demande de RDV</h1>
        </div>
        <div class="content">
          <p><strong>Une nouvelle demande de rendez-vous vient d'être reçue !</strong></p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">👤 Client :</span>
              <span class="value">${client_name}</span>
            </div>
            <div class="detail-row">
              <span class="label">📧 Email :</span>
              <span class="value"><a href="mailto:${client_email}">${client_email}</a></span>
            </div>
            ${client_phone ? `
            <div class="detail-row">
              <span class="label">📱 Téléphone :</span>
              <span class="value"><a href="tel:${client_phone}">${client_phone}</a></span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="label">📅 Date souhaitée :</span>
              <span class="value">${dateFormatted}</span>
            </div>
            <div class="detail-row">
              <span class="label">🕐 Heure :</span>
              <span class="value">${appointment_time}</span>
            </div>
            ${prestation_name ? `
            <div class="detail-row">
              <span class="label">💆 Prestation :</span>
              <span class="value">${prestation_name}</span>
            </div>
            ` : ''}
            ${notes ? `
            <div class="detail-row">
              <span class="label">📝 Notes :</span>
              <span class="value">${notes}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Connectez-vous au panneau d'administration pour accepter ou refuser ce rendez-vous.</p>
        </div>
        <div class="footer">
          <p>Email envoyé automatiquement par ${SITE_NAME}</p>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🔔 Nouvelle demande de RDV - ${client_name} - ${dateFormatted}`,
      html,
    });

    if (error) {
      console.error('[Email] Erreur envoi notification admin:', error);
      return false;
    }

    console.log(`[Email] ✅ Notification admin envoyée`);
    return true;
  } catch (error: any) {
    console.error('[Email] Erreur envoi notification admin:', error.message);
    return false;
  }
}

/**
 * Email 3 : Notification au client de l'acceptation/refus du RDV
 */
export async function sendAppointmentStatusUpdate(
  appointment: AppointmentData,
  newStatus: 'accepted' | 'rejected'
): Promise<boolean> {
  try {
    const { client_name, client_email, appointment_date, appointment_time, prestation_name } = appointment;
    
    const dateFormatted = formatDateFr(appointment_date);
    const isAccepted = newStatus === 'accepted';
    
    const subject = isAccepted 
      ? `✅ Rendez-vous confirmé - ${SITE_NAME}`
      : `❌ Rendez-vous non disponible - ${SITE_NAME}`;
    
    const headerColor = isAccepted ? '#27ae60' : '#e74c3c';
    const headerTitle = isAccepted ? '✅ Rendez-vous confirmé !' : '❌ Rendez-vous non disponible';
    
    const messageContent = isAccepted
      ? `
        <p>Bonne nouvelle ! Votre rendez-vous a été <strong>confirmé</strong>. 🎉</p>
        
        <div class="details">
          <div class="detail-row">
            <span class="label">📅 Date :</span>
            <span class="value">${dateFormatted}</span>
          </div>
          <div class="detail-row">
            <span class="label">🕐 Heure :</span>
            <span class="value">${appointment_time}</span>
          </div>
          ${prestation_name ? `
          <div class="detail-row">
            <span class="label">💆 Prestation :</span>
            <span class="value">${prestation_name}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="highlight" style="background: #27ae60;">
          <strong>📍 Je vous attends avec impatience !</strong>
        </div>
        
        <p>Si vous avez besoin de modifier ou annuler ce rendez-vous, merci de me contacter dès que possible.</p>
      `
      : `
        <p>Je suis désolée, mais je ne suis pas en mesure de confirmer votre rendez-vous pour :</p>
        
        <div class="details">
          <div class="detail-row">
            <span class="label">📅 Date demandée :</span>
            <span class="value">${dateFormatted}</span>
          </div>
          <div class="detail-row">
            <span class="label">🕐 Heure demandée :</span>
            <span class="value">${appointment_time}</span>
          </div>
          ${prestation_name ? `
          <div class="detail-row">
            <span class="label">💆 Prestation :</span>
            <span class="value">${prestation_name}</span>
          </div>
          ` : ''}
        </div>
        
        <p>N'hésitez pas à refaire une demande pour un autre créneau, je serai ravie de vous accueillir. 🙏</p>
      `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f5f1e8; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #6f5f4e; }
          .value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          .highlight { background: #8b7a62; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${headerTitle}</h1>
        </div>
        <div class="content">
          <p>Bonjour <strong>${client_name}</strong>,</p>
          
          ${messageContent}
          
          <p>À très bientôt,<br>
          <em>${SITE_NAME}</em></p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement par ${SITE_NAME}.</p>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: client_email,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Erreur envoi mise à jour statut:', error);
      return false;
    }

    console.log(`[Email] ✅ Notification statut ${newStatus} envoyée à ${client_email}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Erreur envoi mise à jour statut:', error.message);
    return false;
  }
}