import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {appConfig} from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    // Handle bootstrap errors silently in production
    // Error handling without console output for ThemeForest compliance
  });
