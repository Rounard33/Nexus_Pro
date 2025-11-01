import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import {NotificationService} from '../../services/notification.service';
import {NotificationComponent} from '../notification/notification.component';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule, NotificationComponent],
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.scss'
})
export class NotificationContainerComponent {
  constructor(public notificationService: NotificationService) {}
}

