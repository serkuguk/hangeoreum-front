import {setupZonelessTestEnv} from 'jest-preset-angular/setup-env/zoneless/index.mjs';
import {TestBed} from '@angular/core/testing';
import {provideTranslateService, TranslateLoader} from '@ngx-translate/core';
import {of} from 'rxjs';
import ru from './assets/i18n/ru.json';

setupZonelessTestEnv();

beforeEach(() => {
  TestBed.configureTestingModule({providers: [provideTranslateService({
    lang: 'ru',
    fallbackLang: 'ru',
    loader: {provide: TranslateLoader, useValue: {getTranslation: () => of(ru)}},
  })]});
});
