import {CommonModule} from '@angular/common';
import {Component, Input} from '@angular/core';
import {Notification, NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent {
  @Input() notification!: Notification;

  constructor(private notificationService: NotificationService) {}

  close(): void {
    this.notificationService.remove(this.notification.id);
  }

  getIcon(): string {
    switch (this.notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  }
}

