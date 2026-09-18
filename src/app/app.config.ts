import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { FormatMsPipe } from './../components/formatms.pipe'; // <-- Adjust this path to where your pipe is located

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    FormatMsPipe, // <-- Provide the pipe here
  ],
};
