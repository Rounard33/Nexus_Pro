// Validation pour le serveur API local (JavaScript)

/**
 * Valide les données d'un rendez-vous
 */
function validateAppointment(data) {
  const errors = [];

  // Validation client_name
  if (!data.client_name || typeof data.client_name !== 'string') {
    errors.push('Le nom du client est requis');
  } else {
    const name = data.client_name.trim();
    if (name.length < 2 || name.length > 100) {
      errors.push('Le nom doit contenir entre 2 et 100 caractères');
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name)) {
      errors.push('Le nom ne doit contenir que des lettres, espaces, tirets et apostrophes');
    }
  }

  // Validation client_email
  if (!data.client_email || typeof data.client_email !== 'string') {
    errors.push('L\'email est requis');
  } else {
    const email = data.client_email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Format d\'email invalide');
    }
    if (email.length > 255) {
      errors.push('L\'email ne doit pas dépasser 255 caractères');
    }
  }

  // Validation client_phone (optionnel)
  if (data.client_phone !== undefined && data.client_phone !== null) {
    if (typeof data.client_phone !== 'string') {
      errors.push('Le format du téléphone est invalide');
    } else {
      const phone = data.client_phone.trim();
      if (phone.length > 0) {
        const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]?[0-9]{2}){4}$/;
        if (!phoneRegex.test(phone)) {
          errors.push('Format de téléphone invalide (format français attendu)');
        }
        if (phone.length > 20) {
          errors.push('Le téléphone ne doit pas dépasser 20 caractères');
        }
      }
    }
  }

  // Validation prestation_id
  if (!data.prestation_id || typeof data.prestation_id !== 'string') {
    errors.push('L\'ID de la prestation est requis');
  } else {
    // Format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.prestation_id)) {
      errors.push('Format d\'ID de prestation invalide (UUID attendu)');
    }
  }

  // Validation appointment_date
  if (!data.appointment_date || typeof data.appointment_date !== 'string') {
    errors.push('La date de rendez-vous est requise');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.appointment_date)) {
      errors.push('Format de date invalide (YYYY-MM-DD attendu)');
    } else {
      const date = new Date(data.appointment_date);
      if (isNaN(date.getTime())) {
        errors.push('Date invalide');
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          errors.push('La date ne peut pas être dans le passé');
        }
      }
    }
  }

  // Validation appointment_time
  if (!data.appointment_time || typeof data.appointment_time !== 'string') {
    errors.push('L\'heure de rendez-vous est requise');
  } else {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(data.appointment_time)) {
      errors.push('Format d\'heure invalide (HH:MM attendu)');
    } else {
      const [hours, minutes] = data.appointment_time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        errors.push('Heure invalide');
      }
    }
  }

  // Validation notes (optionnel)
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      errors.push('Les notes doivent être une chaîne de caractères');
    } else {
      if (data.notes.length > 500) {
        errors.push('Les notes ne doivent pas dépasser 500 caractères');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Nettoie et normalise les données d'un rendez-vous
 */
function sanitizeAppointment(data) {
  const sanitized = {};

  if (data.client_name) {
    sanitized.client_name = data.client_name.trim();
  }
  
  if (data.client_email) {
    sanitized.client_email = data.client_email.trim().toLowerCase();
  }
  
  if (data.client_phone) {
    sanitized.client_phone = data.client_phone.trim();
  }
  
  if (data.prestation_id) {
    sanitized.prestation_id = data.prestation_id.trim();
  }
  
  if (data.appointment_date) {
    sanitized.appointment_date = data.appointment_date.trim();
  }
  
  if (data.appointment_time) {
    sanitized.appointment_time = data.appointment_time.trim();
  }
  
  if (data.notes !== undefined && data.notes !== null) {
    sanitized.notes = data.notes.trim();
  }

  // Sanitize referral_source (même logique que notes)
  if (data.referral_source !== undefined && data.referral_source !== null && data.referral_source.trim() !== '') {
    sanitized.referral_source = data.referral_source.trim();
  }

  // Sanitize referral_friend_name (même logique que notes, seulement si referral_source = 'friend')
  if (data.referral_source === 'friend' && data.referral_friend_name !== undefined && data.referral_friend_name !== null && data.referral_friend_name.trim() !== '') {
    sanitized.referral_friend_name = data.referral_friend_name.trim();
  }
  
  // Status doit être pending pour une création
  sanitized.status = 'pending';

  return sanitized;
}

module.exports = {
  validateAppointment,
  sanitizeAppointment
};

