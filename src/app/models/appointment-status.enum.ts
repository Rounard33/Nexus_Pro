export enum AppointmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'En attente',
  [AppointmentStatus.ACCEPTED]: 'Accepté',
  [AppointmentStatus.COMPLETED]: 'Terminé',
  [AppointmentStatus.REJECTED]: 'Refusé',
  [AppointmentStatus.CANCELLED]: 'Annulé'
};

export const APPOINTMENT_STATUS_CLASSES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'status-pending',
  [AppointmentStatus.ACCEPTED]: 'status-accepted',
  [AppointmentStatus.COMPLETED]: 'status-completed',
  [AppointmentStatus.REJECTED]: 'status-rejected',
  [AppointmentStatus.CANCELLED]: 'status-cancelled'
};

