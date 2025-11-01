import {Injectable} from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // En millisecondes, undefined = permanent jusqu'à fermeture manuelle
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private nextId = 0;

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  show(type: NotificationType, message: string, duration: number = 5000): string {
    const id = `notification-${this.nextId++}`;
    const notification: Notification = {
      id,
      type,
      message,
      duration
    };

    this.notifications.push(notification);

    // Auto-suppression après la durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  success(message: string, duration?: number): string {
    return this.show('success', message, duration);
  }

  error(message: string, duration?: number): string {
    return this.show('error', message, duration);
  }

  warning(message: string, duration?: number): string {
    return this.show('warning', message, duration);
  }

  info(message: string, duration?: number): string {
    return this.show('info', message, duration);
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clear(): void {
    this.notifications = [];
  }
}

