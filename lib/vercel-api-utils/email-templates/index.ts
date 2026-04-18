/**
 * Point d'entrée pour tous les templates d'email
 * Réexporte tous les modules pour un import facile
 */

// Éléments communs
export { 
  escapeHtml, 
  formatDateFr, 
  getEmailHeader, 
  getEmailFooter, 
  wrapEmailBody,
  colors,
  SITE_NAME,
  LOGO_URL 
} from './common.js';

// Template de confirmation au client
export { 
  generateConfirmationEmail, 
  getConfirmationSubject,
  type ConfirmationData 
} from './confirmation.js';

// Template de notification admin
export { 
  generateAdminNotificationEmail, 
  getAdminNotificationSubject,
  type AdminNotificationData 
} from './admin-notification.js';

// Template de mise à jour de statut
export { 
  generateStatusUpdateEmail, 
  getStatusUpdateSubject,
  type StatusUpdateData,
  type AppointmentStatus 
} from './status-update.js';

// Template de message de contact
export { 
  generateContactMessageEmail, 
  getContactMessageSubject,
  type ContactMessageData 
} from './contact-message.js';
