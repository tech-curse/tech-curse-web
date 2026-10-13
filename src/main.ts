import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import {
  CONFIGURACAO,
  carregarConfiguracao,
  mostrarErroDeConfiguracao,
} from './app/core/configuracao/configuracao';

void carregarConfiguracao().then((configuracao) => {
  if (!configuracao) {
    mostrarErroDeConfiguracao();
    return;
  }
  bootstrapApplication(App, {
    ...appConfig,
    providers: [...appConfig.providers, { provide: CONFIGURACAO, useValue: configuracao }],
  }).catch((err) => console.error(err));
});
