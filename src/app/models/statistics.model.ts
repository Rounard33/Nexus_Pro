export interface StatCard {
  title: string;
  value: number;
  label: string;
  icon: string;
  color: string;
}

export interface PrestationStats {
  prestation: string;
  count: number;
}

export interface AppointmentStats {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
  cancelled: number;
  acceptanceRate: number;
}