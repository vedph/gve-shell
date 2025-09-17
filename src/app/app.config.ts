import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(),
    // TODO add HTTP interceptor
    importProvidersFrom(NgeMonacoModule.forRoot({})),
  ],
};
