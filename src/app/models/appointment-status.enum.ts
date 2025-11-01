export enum AppointmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'En attente',
  [AppointmentStatus.ACCEPTED]: 'Accepté',
  [AppointmentStatus.REJECTED]: 'Refusé',
  [AppointmentStatus.CANCELLED]: 'Annulé'
};

export const APPOINTMENT_STATUS_CLASSES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'status-pending',
  [AppointmentStatus.ACCEPTED]: 'status-accepted',
  [AppointmentStatus.REJECTED]: 'status-rejected',
  [AppointmentStatus.CANCELLED]: 'status-cancelled'
};

