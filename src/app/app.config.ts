import {provideHttpClient} from '@angular/common/http';
import {ApplicationConfig} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {AnimationService} from './services/animation.service';
import {NavigationService} from './services/navigation.service';
import {ParallaxService} from './services/parallax.service';
import {ThemeService} from './services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    ThemeService,
    AnimationService,
    ParallaxService,
    NavigationService
  ]
};
