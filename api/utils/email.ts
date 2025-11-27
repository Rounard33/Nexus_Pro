/**
 * Service d'envoi d'emails
 * Utilise Resend pour envoyer les notifications
 * Les templates sont dans des fichiers séparés pour plus de clarté
 */

import { Resend } from 'resend';

// Import des templates
import { 
  generateConfirmationEmail, 
  getConfirmationSubject 
} from './email-templates/confirmation.js';
import { 
  generateAdminNotificationEmail, 
  getAdminNotificationSubject 
} from './email-templates/admin-notification.js';
import { 
  generateStatusUpdateEmail, 
  getStatusUpdateSubject 
} from './email-templates/status-update.js';
import { 
  generateContactMessageEmail, 
  getContactMessageSubject 
} from './email-templates/contact-message.js';

// ============================================
// Configuration
// ============================================

// Initialiser Resend
const resend = new Resend(process.env['RESEND_API_KEY']);

// Email de l'admin (destinataire des notifications)
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] || 'admin@votre-domaine.com';
// Email expéditeur (doit être vérifié dans Resend)
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'Reiki & Sens <noreply@votre-domaine.com>';

// ============================================
// Types
// ============================================

export interface AppointmentData {
  client_name: string;
  client_email: string;
  client_phone?: string;
  appointment_date: string;
  appointment_time: string;
  prestation_name?: string;
  notes?: string;
  status?: string;
}

export interface ContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// ============================================
// Fonctions d'envoi
// ============================================

/**
 * Email 1 : Confirmation de demande de RDV au client
 * Envoyé automatiquement quand un client fait une demande
 */
export async function sendAppointmentRequestConfirmation(appointment: AppointmentData): Promise<boolean> {
  try {
    const { client_name, client_email, appointment_date, appointment_time, prestation_name } = appointment;
    
    // Générer l'email à partir du template
    const html = generateConfirmationEmail({
      client_name,
      client_email,
      appointment_date,
      appointment_time,
      prestation_name,
    });

    const subject = getConfirmationSubject();

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: client_email,
      subject,
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
 * Envoyé automatiquement quand un client fait une demande
 */
export async function sendNewAppointmentNotificationToAdmin(appointment: AppointmentData): Promise<boolean> {
  try {
    const { client_name, client_email, client_phone, appointment_date, appointment_time, prestation_name, notes } = appointment;
    
    // Générer l'email à partir du template
    const html = generateAdminNotificationEmail({
      client_name,
      client_email,
      client_phone,
      appointment_date,
      appointment_time,
      prestation_name,
      notes,
    });

    const subject = getAdminNotificationSubject(client_name, appointment_date);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
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
 * Envoyé quand l'admin accepte ou refuse une demande
 */
export async function sendAppointmentStatusUpdate(
  appointment: AppointmentData,
  newStatus: 'accepted' | 'rejected'
): Promise<boolean> {
  try {
    const { client_name, client_email, appointment_date, appointment_time, prestation_name } = appointment;
    
    // Générer l'email à partir du template
    const html = generateStatusUpdateEmail({
      client_name,
      client_email,
      appointment_date,
      appointment_time,
      prestation_name,
    }, newStatus);

    const subject = getStatusUpdateSubject(newStatus);

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

/**
 * Email 4 : Message de contact envoyé à l'admin
 * Envoyé quand quelqu'un utilise le formulaire de contact
 */
export async function sendContactMessage(contact: ContactData): Promise<boolean> {
  try {
    const { name, email, phone, subject, message } = contact;
    
    // Générer l'email à partir du template
    const html = generateContactMessageEmail({
      name,
      email,
      phone,
      subject,
      message,
    });

    const emailSubject = getContactMessageSubject(subject, name);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: email, // Permet de répondre directement au client
      subject: emailSubject,
      html,
    });

    if (error) {
      console.error('[Email] Erreur envoi message contact:', error);
      return false;
    }

    console.log(`[Email] ✅ Message de contact envoyé (de: ${email})`);
    return true;
  } catch (error: any) {
    console.error('[Email] Erreur envoi message contact:', error.message);
    return false;
  }
}
